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
const MAX_MB = 200;

function safeName(name = "file") {
  return String(name).slice(0, 90).replace(/[^\w.\- ]+/g, "_").replace(/\s+/g, " ").trim() || "file";
}

function ensureTmp() {
  const tmp = path.join(__dirname, "tmp");
  if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true });
  return tmp;
}

function fileSizeMB(filePath) {
  return fs.statSync(filePath).size / (1024 * 1024);
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
    title: r.title || "TikTok",
    author: (r.author && (r.author.name || r.author.username)) || "Desconocido",
    videoUrl: media.video || null,
    audioUrl: media.audio || null,
  };
}

module.exports = {
  name: 'tiktok2',
  alias: ['ttv2', 'ttmp3', 'tiktokmp3'],
  description: 'Descarga videos y audios MP3 nativos de TikTok.',
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid;
    const bodyText = (m.text || m.caption || texto || "").trim();
    const command = bodyText.split(' ')[0].replace(/^[^\w\s]/, '').toLowerCase();

    const matchUrl = bodyText.match(/https?:\/\/(www\.|vm\.|vt\.)?tiktok\.com\/[^\s]+/i);
    const url = matchUrl ? matchUrl[0] : null;

    if (!url) {
      return sock.sendMessage(from, { text: '❌ _Ingresa un enlace válido de TikTok._\n\n*Uso:* /ttv2 <url> o /ttmp3 <url>' }, { quoted: m });
    }

    await sock.sendMessage(from, { react: { text: "⏳", key: m.key } });

    try {
      const data = await getTikTokFromSky(url);
      const tmp = ensureTmp();
      const base = safeName(data.title);

      // CASO 1: EXTRAER AUDIO MP3 (/ttmp3)
      if (command === 'ttmp3' || command === 'tiktokmp3') {
        const targetAudioUrl = data.audioUrl || data.videoUrl;
        if (!targetAudioUrl) {
          await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
          return sock.sendMessage(from, { text: '❌ _No se encontró audio disponible en esta publicación._' }, { quoted: m });
        }

        const rawAudioPath = path.join(tmp, `${Date.now()}_raw.bin`);
        const outMp3Path = path.join(tmp, `${Date.now()}_${base}.mp3`);

        await downloadToFile(targetAudioUrl, rawAudioPath);

        // Conversión FFmpeg exacta igual a tu plugin ytmp3
        try {
          await new Promise((resolve, reject) => {
            ffmpeg(rawAudioPath)
              .audioCodec("libmp3lame")
              .audioBitrate("128k")
              .format("mp3")
              .save(outMp3Path)
              .on("end", resolve)
              .on("error", reject);
          });
          try { fs.unlinkSync(rawAudioPath); } catch {}
        } catch (e) {
          fs.renameSync(rawAudioPath, outMp3Path);
        }

        if (fileSizeMB(outMp3Path) > MAX_MB) {
          try { fs.unlinkSync(outMp3Path); } catch {}
          await sock.sendMessage(from, { text: `❌ El archivo supera el límite de ${MAX_MB}MB.` }, { quoted: m });
          return;
        }

        await sock.sendMessage(from, {
          audio: { url: outMp3Path },
          mimetype: "audio/mpeg",
          ptt: false,
          fileName: `${base}.mp3`
        }, { quoted: m });

        try { fs.unlinkSync(outMp3Path); } catch {}
        await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
        return;
      }

      // CASO 2: DESCARGA DE VIDEO (/ttv2)
      if (data.videoUrl) {
        const vidPath = path.join(tmp, `${Date.now()}_${base}.mp4`);
        await downloadToFile(data.videoUrl, vidPath);

        if (fileSizeMB(vidPath) > MAX_MB) {
          try { fs.unlinkSync(vidPath); } catch {}
          await sock.sendMessage(from, { text: `❌ El video supera el límite de ${MAX_MB}MB.` }, { quoted: m });
          return;
        }

        const caption = `╭━━━━━━━━━━━━━━━╮\n   ⚡ *TIKTOK V2*\n╰━━━━━━━━━━━━━━━━╯\n\n📝 *Título:* ${data.title}\n👤 *Autor:* ${data.author}`;

        await sock.sendMessage(from, {
          video: { url: vidPath },
          mimetype: "video/mp4",
          caption: caption
        }, { quoted: m });

        try { fs.unlinkSync(vidPath); } catch {}
        await sock.sendMessage(from, { react: { text: "✅", key: m.key } });
        return;
      }

      throw new Error("No se encontró video o audio disponible.");

    } catch (err) {
      console.error("[TIKTOK ERROR]:", err);
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      await sock.sendMessage(from, { text: `❌ _Ocurrió un error:_ ${err.message}` }, { quoted: m });
    }
  }
};
