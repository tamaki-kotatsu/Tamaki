const axios = require('axios');

const API_BASE = "https://api-sky.ultraplus.click";
const API_KEY = "sk_7f41a58b-bd6f-4df1-be6c-ea4d64913247";

module.exports = {
  name: 'aptoide',
  alias: ['apk'],
  description: 'Busca y descarga aplicaciones mediante Aptoide.',
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid;
    const query = (texto || "").trim();

    if (!query) {
      return sock.sendMessage(from, { text: '❌ _Ingresa el nombre de una aplicación para buscar._\n\n*Uso:* /aptoide <nombre>' }, { quoted: m });
    }

    try {
      await sock.sendMessage(from, { text: '⏳ _Buscando aplicación en Aptoide..._' }, { quoted: m });

      const response = await axios.post(`${API_BASE}/aptoide`, { q: query }, {
        headers: { "Content-Type": "application/json", apikey: API_KEY },
        timeout: 60000,
        validateStatus: () => true
      });

      const data = response.data;
      if (!(data?.status === true || data?.status === "true")) {
        throw new Error(data?.message || "No se pudo obtener información de la aplicación.");
      }

      const result = data.result;
      const mediaUrl = result?.media;

      if (!mediaUrl) {
        return sock.sendMessage(from, { text: '🚫 _No se encontró el archivo multimedia para esta aplicación._' }, { quoted: m });
      }

      const title = result?.title || "Aptoide App";

      const caption = `╭━━━━━━━━━━━━━━━━━╮\n   📦 *APTOIDE DOWNLOAD*\n╰━━━━━━━━━━━━━━━━━╯\n\n📝 *Nombre:* ${title}`;

      await sock.sendMessage(from, {
        video: { url: mediaUrl },
        caption: caption
      }, { quoted: m });

    } catch (err) {
      console.error("[APTOIDE ERROR]:", err);
      await sock.sendMessage(from, { text: `❌ _Ocurrió un error:_ ${err.message}` }, { quoted: m });
    }
  }
};
