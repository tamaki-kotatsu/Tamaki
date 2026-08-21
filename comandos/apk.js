const API_KEY = "sk_7f41a58b-bd6f-4df1-be6c-ea4d64913247";

module.exports = {
  name: 'aptoide',
  alias: ['apk'],
  description: 'Busca y descarga aplicaciones mediante Aptoide.',
  run: async (sock, m) => {
    const from = m?.key?.remoteJid;
    if (!from) return;

    // Extraemos el texto del mensaje de forma segura sin depender de argumentos externos
    const messageBody = 
      m?.message?.conversation || 
      m?.message?.extendedTextMessage?.text || 
      m?.text || 
      "";

    // Quitamos el comando y los espacios para obtener solo el término de búsqueda
    const args = messageBody.trim().split(/ +/).slice(1);
    const texto = args.join(" ").trim();

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
