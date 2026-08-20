const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_BASE = "https://api-sky.ultraplus.click";
const API_KEY = "sk_7f41a58b-bd6f-4df1-be6c-ea4d64913247";
const MAX_MB = 200;

function safeFileName(name = "facebook") {
  const base = String(name || "facebook").slice(0, 70);
  return (base.replace(/[^A-Za-z0-9_\-.]+/g, "_") || "facebook");
}

function pickBestVideoUrl(result) {
  const hd = String(result?.media?.video_hd || "").trim();
  const sd = String(result?.media?.video_sd || "").trim();
  if (hd && /^https?:\/\//i.test(hd)) return hd;
  if (sd && /^https?:\/\//i.test(sd)) return sd;
  return null;
}

module.exports = {
  name: 'facebook',
  alias: ['fb'],
  description: 'Descarga videos de Facebook.',
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid;
    const url = (texto || "").trim();

    if (!url || !/(facebook\.com|fb\.watch|fb\.com)/i.test(url)) {
      return sock.sendMessage(from, { text: '❌ _Ingresa un enlace válido de Facebook._\n\n*Uso:* /fb <url>' }, { quoted: m });
    }

    try {
      await sock.sendMessage(from, { text: '⏳ _Procesando video de Facebook..._' }, { quoted: m });

      // 1. Obtener info del video
      const responseInfo = await axios.post(`${API_BASE}/facebook`, { url }, {
        headers: { "Content-Type": "application/json", apikey: API_KEY },
        timeout: 60000,
        validateStatus: () => true
      });

      const data = responseInfo.data;
      if (!(data?.status === true || data?.status === "true")) {
        throw new Error(data?.message || "No se pudo obtener información del video.");
      }

      const videoUrl = pickBestVideoUrl(data.result);
      if (!videoUrl) {
        return sock.sendMessage(from, { text: '🚫 _No se encontró enlace de video disponible._' }, { quoted: m });
      }

      const title = data.result?.title || "Facebook Video";

      // 2. Descargar video temporalmente
      const tmpDir = path.resolve("./tmp");
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

      const fname = `${safeFileName(title)}.mp4`;
      const dlUrl = `${API_BASE}/facebook/dl?type=video&src=${encodeURIComponent(videoUrl)}&filename=${encodeURIComponent(fname)}&download=1`;

      const resDl = await axios.get(dlUrl, {
        responseType: "arraybuffer",
        timeout: 180000,
        headers: { apikey: API_KEY }
      });

      const buffer = Buffer.from(resDl.data);
      const sizeMB = buffer.length / (1024 * 1024);

      if (sizeMB > MAX_MB) {
        return sock.sendMessage(from, { text: `❌ _El video supera el límite de ${MAX_MB} MB (${sizeMB.toFixed(2)} MB)._` }, { quoted: m });
      }

      // 3. Enviar video al chat
      const caption = `╭━━━━━━━━━━━━━━━━━╮\n   ⚡ *FACEBOOK VIDEO*\n╰━━━━━━━━━━━━━━━━━╯\n\n📝 *Título:* ${title}\n💾 *Tamaño:* ${sizeMB.toFixed(2)} MB`;

      await sock.sendMessage(from, {
        video: buffer,
        mimetype: "video/mp4",
        caption: caption
      }, { quoted: m });

    } catch (err) {
      console.error("[FB ERROR]:", err);
      await sock.sendMessage(from, { text: `❌ _Ocurrió un error:_ ${err.message}` }, { quoted: m });
    }
  }
};
