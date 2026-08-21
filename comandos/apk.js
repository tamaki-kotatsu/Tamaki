const fetch = require('node-fetch');

const API_KEY = "sk_7f41a58b-bd6f-4df1-be6c-ea4d64913247";
const API_URL = "https://api-sky.ultraplus.click/aptoide";

const handler = async (sock, m, texto) => {
  const chatId = m.key.remoteJid;
  const pref = global.prefixes?.[0] || ".";

  if (!texto) {
    return sock.sendMessage(chatId, {
      text: `⚠️ *Uso incorrecto.*\n✳️ *Ejemplo:* \`${pref}apk whatsapp\``
    }, { quoted: m });
  }

  await sock.sendMessage(chatId, {
    react: { text: "⏳", key: m.key }
  });

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "apikey": API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ q: texto.trim() })
    });

    if (!response.ok) {
      throw new Error(`Error de la API: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.status || !data.result) {
      throw new Error(data.message || "No se pudo obtener información del APK.");
    }

    const res = data.result;

    const caption = `📱 *Nombre:* ${res.name || res.title || "APK"}\n` +
      `𖠁 *Tamaño:* ${res.size || "—"}\n` +
      `𖠁 *Versión:* ${res.version || "—"}\n` +
      `𖠁 *Desarrollador:* ${res.developer || "—"}\n\n────────────\n🤖 _Bot de Descargas_`;

    // Si la API devuelve una miniatura o imagen previa, la enviamos
    if (res.thumbnail || res.image) {
      await sock.sendMessage(chatId, {
        image: { url: res.thumbnail || res.image },
        caption,
        mimetype: "image/jpeg"
      }, { quoted: m });
    } else {
      await sock.sendMessage(chatId, { text: caption }, { quoted: m });
    }

    // Enviar el archivo APK o multimedia de descarga proporcionado por la API de Sky
    const downloadUrl = res.media || res.url || res.download;
    if (!downloadUrl) {
      throw new Error("La API no devolvió un enlace de descarga válido.");
    }

    await sock.sendMessage(chatId, {
      document: { url: downloadUrl },
      mimetype: "application/vnd.android.package-archive",
      fileName: `${(res.name || "app").replace(/[^\w.-]/g, "_")}.apk`
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
};

module.exports = {
  name: 'apk',
  alias: ['aptoide', 'app'],
  description: 'Busca y descarga aplicaciones APK mediante la API de Sky.',
  run: handler
};
