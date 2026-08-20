const path = require('path');
const axios = require('axios');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const { promisify } = require('util');
const { pipeline } = require('stream');
const streamPipe = promisify(pipeline);

const API_BASE = "https://api-sky.ultraplus.click";
const API_KEY = "sk_7f41a58b-bd6f-4df1-be6c-ea4d64913247";
const MAX_TIMEOUT = 60000;

function safeName(name = "file") {
  return String(name).slice(0, 90).replace(/[^\w.\- ]+/g, "_").replace(/\s+/g, " ").trim() || "file";
}

function ensureTmp() {
  const tmp = path.join(__dirname, "tmp");
  if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true });
  return tmp;
}

async function downloadToFile(url, filePath) {
  const res = await axios.get(url, {
    responseType: "stream",
    timeout: MAX_TIMEOUT,
    headers: {
      "apikey": API_KEY,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36"
    },
    validateStatus: () => true
  });

  if (res.status >= 400) throw new Error(`HTTP_${res.status}`);
  await streamPipe(res.data, fs.createWriteStream(filePath));
  return filePath;
}

async function getTikTokFromSky(url) {
  const { data: res, status: http } = await axios.post(
    `${API_BASE}/tiktok`,
    { url },
    {
      headers: {
        apikey: API_KEY,
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: MAX_TIMEOUT,
      validateStatus: (s) => s >= 200 && s < 600,
    }
  );

  if (http !== 200 || !res || res.status !== true) {
    throw new Error(res?.message || "La API no devolvió una respuesta válida.");
  }

  const r = res.result || {};
  const media = r.media || {};

  return {
    title: r.title || "TikTok Audio",
    audioUrl: media.audio || media.video || null,
  };
}

module.exports = {
  name: 'tiktok2',
  alias: ['ttv2', 'ttmp3', 'tiktokmp3'],
  description: 'Descarga audios MP3 de TikTok.',
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid;
    const bodyText = (m.text || m.caption || texto || "").trim();

    const matchUrl = bodyText.match(/https?:\/\/(www\.|vm\.|vt\.)?tiktok\.com\/[^\s]+/i);
    const url = matchUrl ? matchUrl[0] : null;

    if (!url) {
      return sock.sendMessage(from, { text: '❌ _Ingresa un enlace válido de TikTok._' }, { quoted: m });
    }

    await sock.sendMessage(from, { react: { text: "⏳", key: m.key } });

    try {
      const data = await getTikTokFromSky(url);
      if (!data.audioUrl) throw new Error("No se encontró enlace de audio.");

      const tmp = ensureTmp();
      const base = safeName(data.title);

      const rawPath = path.join(tmp, `${Date.now()}_raw.bin`);
      const outMp3Path = path.join(tmp, `${Date.now()}_${base}.mp3`);

      // 1. Descarga el contenido original
      await downloadToFile(data.audioUrl, rawPath);

      // 2. Remueve completamente la pista de video (-vn) e impone formato MP3
      await new Promise((resolve, reject) => {
        ffmpeg(rawPath)
          .noVideo()
          .audioCodec("libmp3lame")
          .audioBitrate("128k")
          .format("mp3")
          .save(outMp3Path)
          .on("end", resolve)
          .on("error", reject);
      });

      try { fs.unlinkSync(rawPath); } catch {}

      // 3. Envío exclusivo como archivo de Audio Nativo
      await sock.sendMessage(from, {
        audio: { url: outMp3Path },
        mimetype: "audio/mpeg",
        ptt: false,
        fileName: `${base}.mp3`
      }, { quoted: m });

      try { fs.unlinkSync(outMp3Path); } catch {}
      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

    } catch (err) {
      console.error("[TIKTOK MP3 ERROR]:", err);
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      await sock.sendMessage(from, { text: `❌ _Ocurrió un error:_ ${err.message}` }, { quoted: m });
    }
  }
};
