// comandos/ig.js — Instagram VIDEO / IMAGEN / CARRUSEL con API Sky Ultra Plus
"use strict";

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { pipeline } = require('stream');
const streamPipe = promisify(pipeline);

// ==== API SKY ULTRA PLUS ====
const API_BASE = (process.env.API_BASE || "https://api-sky.ultraplus.click").replace(/\/+$/, "");
const API_KEY = "sk_7f41a58b-bd6f-4df1-be6c-ea4d64913247";
const API_RESOLVE = `${API_BASE}/instagram/resolve`; // O el endpoint correspondiente de la API

const TIMEOUT = 300000;
const MAX_MB = 150;

function safeName(name = "instagram") {
  return (
    String(name)
      .slice(0, 90)
      .replace(/[^\w.\- ]+/g, "_")
      .replace(/\s+/g, " ")
      .trim() || "instagram"
  );
}

function fileSizeMB(filePath) {
  const b = fs.statSync(filePath).size;
  return b / (1024 * 1024);
}

function ensureTmp() {
  const tmp = path.join(__dirname, "../tmp");
  if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true });
  return tmp;
}

function isInstagram(u = "") {
  return /(instagram\.com|instagr\.am)/i.test(String(u || ""));
}

function isApiUrl(url = "") {
  try {
    const u = new URL(url);
    const b = new URL(API_BASE);
    return u.host === b.host;
  } catch {
    return false;
  }
}

async function downloadToFile(url, filePath) {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    Accept: "*/*"
  };

  if (isApiUrl(url)) headers["apikey"] = API_KEY;

  const res = await axios.get(url, {
    responseType: "stream",
    timeout: TIMEOUT,
    headers,
    maxRedirects: 5,
    validateStatus: () => true
  });

  if (res.status >= 400) throw new Error(`HTTP_${res.status}`);

  const tipo = String(res.headers?.["content-type"] || "");
  if (/text\/html|application\/json/i.test(tipo)) {
    try { res.data.destroy(); } catch {}
    throw new Error(`El enlace no devolvió un archivo (${tipo.split(";")[0]})`);
  }

  const esperado = Number(res.headers?.["content-length"] || 0);
  await streamPipe(res.data, fs.createWriteStream(filePath));

  const real = fs.statSync(filePath).size;
  if (!real) throw new Error("El archivo descargado está vacío");
  if (esperado && real !== esperado) {
    throw new Error(`Descarga incompleta (${real} de ${esperado} bytes)`);
  }

  return filePath;
}

function absolutizar(u) {
  if (!u || typeof u !== "string") return "";
  return u.startsWith("/") ? API_BASE + u : u;
}

function mediaCandidatos(result) {
  const mediaList = result?.media || result?.data || result?.url;
  if (Array.isArray(mediaList)) {
    return mediaList.map(m => absolutizar(typeof m === 'string' ? m : (m.url || m.download))).filter(Boolean);
  }
  if (typeof mediaList === "string") return [absolutizar(mediaList)].filter(Boolean);

  const urls = [
    absolutizar(result?.url),
    absolutizar(result?.download),
    absolutizar(result?.dl)
  ];

  return [...new Set(urls.filter(Boolean))];
}

async function callInstagramResolve(videoUrl) {
  const r = await axios.post(API_RESOLVE, {
    url: videoUrl
  }, {
    timeout: TIMEOUT,
    headers: {
      "Content-Type": "application/json",
      apikey: API_KEY,
      Accept: "application/json, */*"
    },
    validateStatus: () => true
  });

  const data = typeof r.data === "object" ? r.data : null;
  if (!data) throw new Error("Respuesta no JSON del servidor");

  const ok = data.status === true || data.status === "true" || data.ok === true || data.success === true;
  if (!ok) throw new Error(data.message || data.error || `HTTP_${r.status}`);

  const result = data.result || data.data || data;
  const candidatos = mediaCandidatos(result);

  if (!candidatos.length) throw new Error("La API no devolvió enlaces de descarga");

  return {
    title: result.title || result.caption || "Instagram Media",
    candidatos
  };
}

module.exports = {
  name: 'instagram',
  alias: ['ig', 'igdl'],
  description: 'Descarga publicaciones, reels o historias de Instagram.',
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid;
    const url = String(texto || "").trim();

    if (!url) {
      return sock.sendMessage(
        from,
        { text: `✳️ Usa:\n/ig <URL de Instagram>` },
        { quoted: m }
      );
    }

    if (!isInstagram(url)) {
      return sock.sendMessage(from, { text: "❌ Enlace inválido de Instagram." }, { quoted: m });
    }

    await sock.sendMessage(from, { react: { text: "⏳", key: m.key } });

    try {
      const resolved = await callInstagramResolve(url);
      const tmp = ensureTmp();
      let enviados = 0;

      for (let i = 0; i < resolved.candidatos.length; i++) {
        const mediaUrl = resolved.candidatos[i];
        const base = safeName(resolved.title);
        const ext = mediaUrl.includes(".png") ? "png" : mediaUrl.includes(".jpg") ? "jpg" : "mp4";
        const file = path.join(tmp, `${Date.now()}_${i}_${base}.${ext}`);

        try {
          await downloadToFile(mediaUrl, file);
          const sizeMB = fileSizeMB(file);

          if (sizeMB > MAX_MB) {
            try { fs.unlinkSync(file); } catch {}
            continue;
          }

          const isVideo = ext === "mp4";
          const caption = `📸 *INSTAGRAM* - (${i + 1}/${resolved.candidatos.length})\n💾 *Tamaño:* ${sizeMB.toFixed(2)} MB`;

          if (isVideo) {
            await sock.sendMessage(from, {
              video: fs.readFileSync(file),
              mimetype: "video/mp4",
              fileName: `${base}.mp4`,
              caption
            }, { quoted: m });
          } else {
            await sock.sendMessage(from, {
              image: fs.readFileSync(file),
              mimetype: `image/${ext}`,
              caption
            }, { quoted: m });
          }

          enviados++;
          try { fs.unlinkSync(file); } catch {}
        } catch {
          try { fs.unlinkSync(file); } catch {}
        }
      }

      if (enviados === 0) {
        throw new Error("No se pudo descargar ningún archivo multimedia.");
      }

      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

    } catch (e) {
      // Limpiar temporal en caso de error
      try {
        const files = fs.readdirSync(ensureTmp());
        for (const file of files) {
          try { fs.unlinkSync(path.join(ensureTmp(), file)); } catch {}
        }
      } catch {}

      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      await sock.sendMessage(from, { text: `❌ Error: ${e.message}` }, { quoted: m });
    }
  }
};
