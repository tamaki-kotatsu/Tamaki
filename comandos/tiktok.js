const axios = require('axios');

const API_BASE = "https://api-sky.ultraplus.click";
const API_KEY = "sk_7f41a58b-bd6f-4df1-be6c-ea4d64913247";
const MAX_TIMEOUT = 60000;

const fmtSec = (s) => {
  const n = Number(s || 0);
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  const sec = n % 60;
  return (h ? `${h}:` : "") + `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
};

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

  if (http !== 200) {
    throw new Error(`HTTP ${http}${res?.message ? ` - ${res.message}` : ""}`);
  }

  if (!res || res.status !== true || !res.result?.media?.video) {
    throw new Error(res?.message || "La API no devolvió un video válido.");
  }

  const r = res.result;
  return {
    title: r.title || "TikTok",
    author: (r.author && (r.author.name || r.author.username)) || "Desconocido",
    duration: r.duration || 0,
    likes: r.stats?.likes ?? 0,
    comments: r.stats?.comments ?? 0,
    videoUrl: r.media.video,
  };
}

module.exports = {
  name: 'tiktok',
  alias: ['tt'],
  description: 'Descarga videos de TikTok.',
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid;
    const url = (texto || "").trim();

    if (!url || !/tiktok\.com|vt\.tiktok\.com|vm\.tiktok\.com/i.test(url)) {
      return sock.sendMessage(from, { text: '❌ _Ingresa un enlace válido de TikTok._\n\n*Uso:* /tt <url>' }, { quoted: m });
    }

    try {
      await sock.sendMessage(from, { text: '⏳ _Procesando enlace de TikTok..._' }, { quoted: m });

      const data = await getTikTokFromSky(url);

      const caption = 
`╭━━━━━━━━━━━━━━━╮
   ⚡ *TIKTOK DOWNLOADER*
╰━━━━━━━━━━━━━━━━╯

📝 *Título:* ${data.title}
👤 *Autor:* ${data.author}
⏱️ *Duración:* ${fmtSec(data.duration)}
📊 *Estadísticas:* 👍 ${data.likes} · 💬 ${data.comments}`;

      await sock.sendMessage(from, {
        video: { url: data.videoUrl },
        mimetype: "video/mp4",
        caption: caption
      }, { quoted: m });

    } catch (err) {
      console.error("[TIKTOK ERROR]:", err);
      await sock.sendMessage(from, { text: `❌ _Ocurrió un error:_ ${err.message}` }, { quoted: m });
    }
  }
};
