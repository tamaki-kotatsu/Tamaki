const axios = require('axios');
const yts = require('yt-search');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { pipeline } = require('stream');

const streamPipe = promisify(pipeline);

const API_BASE = "https://api-sky.ultraplus.click";
const API_KEY = "sk_7f41a58b-bd6f-4df1-be6c-ea4d64913247";
const API_RESOLVE = `${API_BASE}/youtube/resolve`;
const RESOLVE_TIMEOUT = 300000;
const DOWNLOAD_TIMEOUT = 300000;
const MAX_MB = 200;

function safeName(name = "audio") {
  return String(name).slice(0, 90).replace(/[^\w.\- ]+/g, "_").replace(/\s+/g, " ").trim() || "audio";
}

function ensureTmp() {
  const tmp = path.join(__dirname, "../../tmp");
  if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true });
  return tmp;
}

module.exports = {
  name: 'ytmp3',
  alias: ['yta', 'audio'],
  description: 'Descarga música de YouTube en formato MP3.',
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid;
    const url = (texto || "").trim();

    if (!url || !/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(url)) {
      return sock.sendMessage(from, { text: '✳️ Uso correcto: `/ytmp3 <URL de YouTube>`' }, { quoted: m });
    }

    await sock.sendMessage(from, { react: { text: "⏳", key: m.key } });

    try {
      let title = "YouTube Audio";
      const videoIdMatch = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/);
      if (videoIdMatch) {
        const searchRes = await yts({ videoId: videoIdMatch[1] });
        if (searchRes) title = searchRes.title || title;
      }

      const r = await axios.post(API_RESOLVE, { url, type: "audio", format: "mp3" }, {
        timeout: RESOLVE_TIMEOUT,
        headers: { "Content-Type": "application/json", apikey: API_KEY, Accept: "application/json" },
        validateStatus: () => true
      });

      const data = r.data?.result || r.data?.data || r.data;
      const mediaUrl = data?.media?.direct || data?.media?.dl_download || data?.url;

      if (!mediaUrl) throw new Error("La API no devolvió enlace de descarga.");

      const tmp = ensureTmp();
      const outFile = path.join(tmp, `${Date.now()}_${safeName(title)}.mp3`);

      const resFile = await axios.get(mediaUrl.startsWith("/") ? API_BASE + mediaUrl : mediaUrl, {
        responseType: "stream",
        timeout: DOWNLOAD_TIMEOUT,
        headers: { "User-Agent": "Mozilla/5.0", apikey: API_KEY },
        validateStatus: () => true
      });

      await streamPipe(resFile.data, fs.createWriteStream(outFile));

      if (fs.statSync(outFile).size / (1024 * 1024) > MAX_MB) {
        fs.unlinkSync(outFile);
        return sock.sendMessage(from, { text: `❌ El archivo supera el límite de ${MAX_MB}MB.` }, { quoted: m });
      }

      await sock.sendMessage(from, {
        audio: { url: outFile },
        mimetype: "audio/mpeg",
        ptt: false,
        fileName: `${safeName(title)}.mp3`
      }, { quoted: m });

      try { fs.unlinkSync(outFile); } catch {}
      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

    } catch (e) {
      console.error(e);
      await sock.sendMessage(from, { text: `❌ Ocurrió un error: ${e.message}` }, { quoted: m });
    }
  }
};
