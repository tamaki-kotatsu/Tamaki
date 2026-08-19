const path = require('path');
const axios = require('axios');
const yts = require('yt-search');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const { promisify } = require('util');
const { pipeline } = require('stream');
const streamPipe = promisify(pipeline);

// ==== API CONFIGURACIÓN ====
const API_BASE = (process.env.API_BASE || "https://api-sky.ultraplus.click").replace(/\/+$/, "");
const API_KEY = process.env.API_KEY || "sk_7f41a58b-bd6f-4df1-be6c-ea4d64913247";
const API_RESOLVE = `${API_BASE}/youtube/resolve`;

const RESOLVE_TIMEOUT = 300000;
const DOWNLOAD_TIMEOUT = 300000;
const MAX_MB = 200;
const ACTIVOSS_FILE = path.resolve("./activoss.json");

function safeName(name = "file") {
  return String(name).slice(0, 90).replace(/[^\w.\- ]+/g, "_").replace(/\s+/g, " ").trim() || "file";
}

function fileSizeMB(filePath) {
  return fs.statSync(filePath).size / (1024 * 1024);
}

function ensureTmp() {
  const tmp = path.join(__dirname, "tmp");
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
  await streamPipe(res.data, fs.createWriteStream(filePath));
  return filePath;
}

function mediaCandidatos(result) {
  const media = result?.media;
  if (typeof media === "string") return [media.startsWith("/") ? API_BASE + media : media].filter(Boolean);

  const urls = [
    media?.direct,
    media?.dl_download,
    media?.dl_inline,
    media?.url || media?.download,
    result?.url || result?.download
  ].map(u => (u && u.startsWith("/") ? API_BASE + u : u));

  return [...new Set(urls.filter(Boolean))];
}

async function callYoutubeResolve(videoUrl) {
  const r = await axios.post(API_RESOLVE, { url: videoUrl, type: "audio", format: "mp3" }, {
    timeout: RESOLVE_TIMEOUT,
    headers: { "Content-Type": "application/json", apikey: API_KEY, Accept: "application/json, */*" },
    validateStatus: () => true
  });

  const data = typeof r.data === "object" ? r.data : null;
  if (!data) throw new Error("Respuesta no JSON del servidor");

  const ok = data.status === true || data.status === "true" || data.ok === true || data.success === true;
  if (!ok) throw new Error(data.message || data.error || `HTTP_${r.status}`);

  const result = data.result || data.data || data;
  const candidatos = mediaCandidatos(result);
  if (!candidatos.length) throw new Error("La API no devolvió enlace de descarga");

  return { title: result.title || "YouTube", candidatos };
}

const handler = async (msg, { conn, text }) => {
  const query = text ? text.trim() : "";

  if (!query) {
    return conn.sendMessage(msg.key.remoteJid, { text: "✳️ Por favor escribe el nombre de la canción que quieres buscar.\nEj: *\.play bad bunny diles*" }, { quoted: msg });
  }

  await conn.sendMessage(msg.key.remoteJid, { react: { text: "⏳", key: msg.key } });

  const res = await yts(query);
  const video = res.videos?.[0];

  if (!video) {
    return conn.sendMessage(msg.key.remoteJid, { text: "❌ No se encontraron resultados para tu búsqueda." }, { quoted: msg });
  }

  const { url: videoUrl, title } = video;

  try {
    const resolved = await callYoutubeResolve(videoUrl);
    const tmp = ensureTmp();
    const base = safeName(resolved.title || title);
    const inFile = path.join(tmp, `${Date.now()}_audio.bin`);

    // Descargar archivo de los candidatos
    let descargado = false;
    for (const url of resolved.candidatos) {
      try {
        await downloadToFile(url, inFile);
        descargado = true;
        break;
      } catch (e) {
        try { fs.unlinkSync(inFile); } catch {}
      }
    }

    if (!descargado) throw new Error("No se pudo descargar de ningún enlace disponible.");

    const outMp3 = path.join(tmp, `${Date.now()}_${base}.mp3`);
    
    // Convertir a MP3 si es necesario usando ffmpeg
    try {
      await new Promise((resolve, reject) => {
        ffmpeg(inFile)
          .audioCodec("libmp3lame")
          .audioBitrate("128k")
          .format("mp3")
          .save(outMp3)
          .on("end", resolve)
          .on("error", reject);
      });
      try { fs.unlinkSync(inFile); } catch {}
    } catch {
      fs.renameSync(inFile, outMp3);
    }

    if (fileSizeMB(outMp3) > MAX_MB) {
      try { fs.unlinkSync(outMp3); } catch {}
      return conn.sendMessage(msg.key.remoteJid, { text: `❌ El archivo supera el límite de ${MAX_MB}MB.` }, { quoted: msg });
    }

    // Enviar el audio directamente al chat
    await conn.sendMessage(msg.key.remoteJid, {
      audio: { url: outMp3 },
      mimetype: "audio/mpeg",
      ptt: false,
      fileName: `${base}.mp3`
    }, { quoted: msg });

    try { fs.unlinkSync(outMp3); } catch {}
    await conn.sendMessage(msg.key.remoteJid, { react: { text: "✅", key: msg.key } });

  } catch (e) {
    await conn.sendMessage(msg.key.remoteJid, { text: `❌ Ocurrió un error al procesar la canción: ${e.message}` }, { quoted: msg });
  }
};

handler.command = ["ssplay"];

module.exports = handler;
