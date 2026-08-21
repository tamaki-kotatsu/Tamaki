const API_KEY = "sk_7f41a58b-bd6f-4df1-be6c-ea4d64913247";

module.exports = {
  name: 'aptoide',
  alias: ['apk'],
  description: 'Busca y descarga aplicaciones mediante Aptoide.',
  run: async (sock, m, arg) => {
    const from = m.key.remoteJid;

    // Convertimos de forma segura el argumento a string (sea string, array o objeto)
    let texto = "";
    if (typeof arg === "string") {
      texto = arg.trim();
    } else if (Array.isArray(arg)) {
      texto = arg.join(" ").trim();
    } else if (arg && typeof arg.text === "string") {
      texto = arg.text.trim();
    } else if (m.text) {
      // Si el framework pasa otra cosa, extraemos el texto directamente del mensaje
      const body = m.text || m.message?.conversation || "";
      const parts = body.trim().split(" ");
      parts.shift(); // Quitamos el comando
      texto = parts.join(" ").trim();
    }

    if (!texto) {
      return sock.sendMessage(from, { text: '⚠️ Envía el comando junto al nombre de la app. Ejemplo: /aptoide WhatsApp' }, { quoted: m });
    }

    try {
      const res = await fetch("https://api-sky.ultraplus.click/aptoide", {
        method: "POST",
        headers: { apikey: API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ q: texto })
      });

      const data = await res.json();
      if (!data.status) {
        return sock.sendMessage(from, { text: "❌ " + (data.message || "No se encontraron resultados.") }, { quoted: m });
      }

      await sock.sendMessage(from, {
        video: { url: data.result.media },
        caption: data.result.title || "Listo ✅"
      }, { quoted: m });

    } catch (e) {
      await sock.sendMessage(from, { text: "❌ Error: " + e.message }, { quoted: m });
    }
  }
};
