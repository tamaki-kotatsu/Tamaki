const axios = require('axios');

const API_KEY = "sk_7f41a58b-bd6f-4df1-be6c-ea4d64913247";
const API_URL = "https://api-sky.ultraplus.click/aptoide";

module.exports = {
  name: 'apk',
  alias: ['aptoide', 'app'],
  description: 'Busca y descarga aplicaciones APK mediante la API de Sky.',
  run: async (sock, m, texto) => {
    const chatId = m.key.remoteJid;
    const query = String(texto || "").trim();
    const pref = global.prefixes?.[0] || ".";

    if (!query) {
      return sock.sendMessage(chatId, {
        text: `⚠️ *Uso incorrecto.*\n✳️ *Ejemplo:* \`${pref}apk whatsapp\``
      }, { quoted: m });
    }

    await sock.sendMessage(chatId, {
      react: { text: "⏳", key: m.key }
    });

    try {
      const response = await axios.post(API_URL, {
        q: query
      }, {
        headers: {
          "apikey": API_KEY,
          "Content-Type": "application/json"
        },
        timeout: 120000,
        validateStatus: () => true
      });

      const data = response.data;

      if (!data || !data.status) {
        throw new Error(data?.message || "No se pudo encontrar la aplicación.");
      }

      // La API devuelve un array o objeto en result. Tomamos el primer resultado si es array.
      let res = data.result;
      if (Array.isArray(res)) res = res[0];

      if (!res) {
        throw new Error("No se encontraron resultados para la búsqueda.");
      }

      // Propiedad exacta que viene en tu consola: "apk"
      const downloadUrl = res.apk || res.media || res.url || res.download;

      if (!downloadUrl) {
        throw new Error("La API no devolvió un enlace de descarga válido.");
      }

      const caption = `📱 *${res.name || query}*` +
        (res.size ? `\n𖠁 *Tamaño:* ${(res.size / (1024 * 1024)).toFixed(2)} MB` : "") +
        (res.version ? `\n𖠁 *Versión:* ${res.version}` : "") +
        (res.developer ? `\n𖠁 *Desarrollador:* ${res.developer}` : "") +
        `\n\n────────────\n🤖 _Bot de Descargas_`;

      // Imagen previa usando la propiedad "icon" que muestra la consola
      const imageUrl = res.icon || res.thumbnail || res.image;
      if (imageUrl) {
        try {
          await sock.sendMessage(chatId, {
            image: { url: imageUrl },
            caption
          }, { quoted: m });
        } catch {}
      }

      // Enviar el APK como documento
      await sock.sendMessage(chatId, {
        document: { url: downloadUrl },
        mimetype: "application/vnd.android.package-archive",
        fileName: `${(res.name || query).replace(/[^\w.-]/g, "_")}.apk`,
        caption: `Aquí tienes tu APK: *${res.name || query}* 📱`
      }, { quoted: m });

      await sock.sendMessage(chatId, {
        react: { text: "✅", key: m.key }
      });

    } catch (err) {
      console.error("❌ Error en comando APK:", err.message);
      await sock.sendMessage(chatId, {
        text: `❌ *Error al procesar la solicitud:*\n_${err.message}_\n\n🔹 Inténtalo más tarde.`
      }, { quoted: m });

      await sock.sendMessage(chatId, {
        react: { text: "❌", key: m.key }
      });
    }
  }
};
