"use strict";

const axios = require('axios');
const fs = require('fs');
const path = path = require('path');
const { promisify } = require('util');
const { pipeline } = require('stream');
const streamPipe = promisify(pipeline);

// ==== API SKY ULTRA PLUS ====
const API_BASE = (process.env.API_BASE || "https://api-sky.ultraplus.click").replace(/\/+$/, "");
const API_KEY = process.env.API_KEY || "sk_7f41a58b-bd6f-4df1-be6c-ea4d64913247";
const API_SPOTIFY = `${API_BASE}/spotify`;

const DOWNLOAD_TIMEOUT = 300000;
const MAX_MB = 200;

function safeName(name = "file") {
  return (
    String(name)
      .slice(0, 90)
      .replace(/[^\w.\- ]+/g, "_")
      .replace(/\s+/g, " ")
      .trim() || "file"
  );
}

function fileSizeMB(filePath) {
  const b = fs.statSync(filePath).size;
  return b / (1024 * 1024);
}

function ensureTmp() {
  const tmp = path.resolve("./tmp");
  if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true });
  return tmp;
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
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
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

  await streamPipe(res.data, fs.createWriteStream(filePath));

  const real = fs.statSync(filePath).size;
  if (!real) throw new Error("El enlace devolvió un archivo vacío");

  return filePath;
}

let handler = {
  name: 'spotify',
  alias: ['sp', 'spotifydl'],
  command: ['spotify', 'sp'],
  description: 'Descarga música de Spotify en MP3',
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid;

    if (!texto) {
      return sock.sendMessage(from, { 
        text: '✳️ Usa:\n/sp <nombre de la canción o enlace>\nEj: */sp despacito*' 
      }, { quoted: m });
    }

    await sock.sendMessage(from, {
      react: { text: "⏳", key: m.key }
    });

    try {
      const isUrl = /spotify\.com/i.test(texto);
      const body = isUrl ? { url: texto } : { query: texto };

      const r = await axios.post(API_SPOTIFY, body, {
        timeout: 60000,
        headers: {
          "Content-Type": "application/json",
          "apikey": API_KEY,
          Accept: "application/json, */*"
        },
        validateStatus: () => true
      });

      const data = r.data;
      const ok = data?.status === true || data?.status === "true";

      if (!ok) {
        throw new Error(data?.message || data?.error || "No se pudo resolver la canción en Spotify");
      }

      const result = data.result || {};
      const title = result.title || "Spotify Track";
      const artist = result.artist || "Desconocido";
      const audioUrl = result.media?.audio || result.url;

      if (!audioUrl) {
        throw new Error("La API no devolvió enlace de audio.");
      }

      const tmp = ensureTmp();
      const base = safeName(`${title} - ${artist}`);
      const outFile = path.join(tmp, `${Date.now()}_${base}.mp3`);

      await downloadToFile(audioUrl, outFile);

      const sizeMB = fileSizeMB(outFile);
      if (sizeMB > MAX_MB) {
        try { fs.unlinkSync(outFile); } catch {}
        return sock.sendMessage(from, { text: `❌ El archivo supera el límite de ${MAX_MB}MB.` }, { quoted: m });
      }

      await sock.sendMessage(from, {
        audio: { url: outFile },
        mimetype: "audio/mpeg",
        ptt: false,
        fileName: `${base}.mp3`,
      }, { quoted: m });

      try { fs.unlinkSync(outFile); } catch {}

      await sock.sendMessage(from, {
        react: { text: "✅", key: m.key }
      });

    } catch (e) {
      console.error("[spotify] error:", e);
      await sock.sendMessage(from, { 
        text: `❌ Ocurrió un error: ${e.message}` 
      }, { quoted: m });
    }
  }
};

module.exports = handler;
