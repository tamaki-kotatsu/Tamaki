const { canal } = require("../../disenos.js");
const axios = require('axios');
const yts = require('yt-search');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { pipeline } = require('stream');
const streamPipe = promisify(pipeline);

// ==== API SKY ULTRA PLUS ====
const API_BASE = (process.env.API_BASE || "https://api-sky.ultraplus.click").replace(/\/+$/, "");
const API_KEY = "sk_7f41a58b-bd6f-4df1-be6c-ea4d64913247";
const API_RESOLVE = `${API_BASE}/youtube/resolve`;

const RESOLVE_TIMEOUT = 300000;
const DOWNLOAD_TIMEOUT = 300000;
const DEFAULT_VIDEO_QUALITY = "720"; // Máxima calidad por defecto
const MAX_MB = 200;

function safeName(name = "video") {
  return (
    String(name)
      .slice(0, 90)
      .replace(/[^\w.\- ]+/g, "_")
      .replace(/\s+/g, " ")
      .trim() || "video"
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

function isYouTube(u = "") {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|music\.youtube\.com)\//i.test(String(u));
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
    timeout: DOWNLOAD_TIMEOUT,
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
  if (!real) throw new Error("El enlace devolvió un archivo vacío");
  if (esperado && real !== esperado) {
    throw new Error(`Descarga incompleta (${real} de ${esperado} bytes)`);
  }

  return filePath;
}

function cabecera(filePath, n = 12) {
  const fd = fs.openSync(filePath, "r");
  const buf = Buffer.alloc(n);
  try {
    fs.readSync(fd, buf, 0, n, 0);
  } finally {
    fs.closeSync(fd);
  }
  return buf;
}

function esMp4(filePath) {
  try {
    return cabecera(filePath).slice(4, 8).toString("latin1") === "ftyp";
  } catch {
    return false;
  }
}

async function descargarMedia(urls, filePath, validar) {
  const respaldo = `${filePath}.alt`;
  let ultimoError;

  for (const url of urls) {
    try {
      await downloadToFile(url, filePath);
      if (!validar || validar(filePath)) return { formatoOk: true };

      ultimoError = new Error("El enlace no devolvió un MP4");
      try { fs.unlinkSync(respaldo); } catch {}
      fs.renameSync(filePath, respaldo);
    } catch (e) {
      ultimoError = e;
      try { fs.unlinkSync(filePath); } catch {}
    }
  }

  if (fs.existsSync(respaldo)) {
    fs.renameSync(respaldo, filePath);
    return { formatoOk: false };
  }

  throw ultimoError || new Error("Sin enlaces de descarga");
}

function absolutizar(u) {
  if (!u || typeof u !== "string") return "";
  return u.startsWith("/") ? API_BASE + u : u;
}

function mediaCandidatos(result) {
  const media = result?.media;
  if (typeof media === "string") return [absolutizar(media)].filter(Boolean);

  const urls = [
    absolutizar(media?.direct),
    absolutizar(media?.dl_download),
    absolutizar(media?.dl_inline),
    absolutizar(media?.url || media?.download),
    absolutizar(result?.url || result?.download)
  ];

  return [...new Set(urls.filter(Boolean))];
}

async function callYoutubeResolve(videoUrl, quality) {
  const r = await axios.post(API_RESOLVE, {
    url: videoUrl,
    type: "video",
    quality: quality
  }, {
    timeout: RESOLVE_TIMEOUT,
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

  if (!candidatos.length) throw new Error("La API no devolvió enlace de descarga");

  return {
    title: result.title || "YouTube",
    candidatos
  };
}

module.exports = {
  name: 'ytmp4',
  alias: ['ytv', 'yt4'],
  description: 'Descarga videos de YouTube en la mejor calidad directamente.',
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid;
    const url = String(texto || "").trim();

    if (!url) {
      return sock.sendMessage(
        from,
        { contextInfo: canal(), text: `✳️ Usa:\n/ytmp4 <URL de YouTube>` },
        { quoted: m }
      );
    }

    if (!isYouTube(url)) {
      return sock.sendMessage(from, { contextInfo: canal(), text: "❌ Enlace inválido de YouTube." }, { quoted: m });
    }

    await sock.sendMessage(from, { react: { text: "⏳", key: m.key } });

    // Buscar info del video con yt-search
    let title = "YouTube Video";
    let duration = "—";
    let viewsFmt = "—";
    let authorName = "Desconocido";

    try {
      const videoIdMatch = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/);
      if (videoIdMatch) {
        const searchRes = await yts({ videoId: videoIdMatch[1] });
        if (searchRes) {
          title = searchRes.title || title;
          duration = searchRes.timestamp || "—";
          viewsFmt = (searchRes.views || 0).toLocaleString();
          authorName = searchRes.author?.name || searchRes.author || "Desconocido";
        }
      }
    } catch {}

    try {
      const resolved = await callYoutubeResolve(url, DEFAULT_VIDEO_QUALITY);
      const mediaUrl = resolved.candidatos[0];

      if (!mediaUrl) {
        await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
        return sock.sendMessage(from, { contextInfo: canal(), text: "❌ No se pudo obtener el enlace de descarga." }, { quoted: m });
      }

      const tmp = ensureTmp();
      const base = safeName(title || resolved.title);
      const file = path.join(tmp, `${Date.now()}_${base}_720p.mp4`);

      const estado = await descargarMedia(resolved.candidatos, file, esMp4);
      const sizeMB = fileSizeMB(file);

      if (sizeMB > MAX_MB) {
        try { fs.unlinkSync(file); } catch {}
        await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
        return sock.sendMessage(from, { contextInfo: canal(), text: `❌ El video pesa ${sizeMB.toFixed(2)}MB y supera el límite de ${MAX_MB}MB.` }, { quoted: m });
      }

      const finalCaption =
`🎬 *YOUTUBE MP4*

📝 *Título:* ${title}
👤 *Autor:* ${authorName}
⏱️ *Duración:* ${duration}
👁️ *Vistas:* ${viewsFmt}
⚡ *Calidad:* 720p (HD)
💾 *Tamaño:* ${sizeMB.toFixed(2)} MB`;

      await sock.sendMessage(
        from,
        {
          video: fs.readFileSync(file),
          mimetype: "video/mp4",
          fileName: `${base}_720p.mp4`,
          caption: finalCaption,
        },
        { quoted: m }
      );

      try { fs.unlinkSync(file); } catch {}
      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

    } catch (e) {
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      await sock.sendMessage(from, { contextInfo: canal(), text: `❌ Error: ${e.message}` }, { quoted: m });
    }
  }
};
