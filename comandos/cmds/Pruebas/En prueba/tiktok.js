const axios = require('axios');

module.exports = {
  name: 'tiktoksearch',
  alias: ['ttss', 'tsearch'],
  description: 'Busca y descarga el primer video de TikTok encontrado',
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid;

    if (!texto) {
      return sock.sendMessage(from, { 
        text: '✿ Ingresa un término de búsqueda.' 
      }, { quoted: m });
    }

    try {
      // Petición a la API pública de TikWM
      const { data: response } = await axios.get(`https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(texto)}`);

      if (!response.data || !response.data.videos || response.data.videos.length === 0) {
        return sock.sendMessage(from, { 
          text: `✿ No se encontraron resultados para "${texto}".` 
        }, { quoted: m });
      }

      const video = response.data.videos[0];
      const videoUrl = `https://www.tiktok.com/@${video.author?.unique_id}/video/${video.video_id}`;
      
      // Formateador de números (ej. 1.2M, 50K)
      const fmt = (num) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(num || 0);

      // Descarga del buffer del video
      const res = await axios.get(video.play, { 
        responseType: 'arraybuffer',
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36' 
        }
      });
      const videoBuffer = Buffer.from(res.data);

      const caption = `*── 「 TIKTOK RESULT 」 ──*\n\n` +
                      `▢ *TÍTULO:* ${video.title || 'Sin descripción'}\n` +
                      `▢ *AUTOR:* ${video.author?.nickname || 'Desconocido'} (@${video.author?.unique_id || ''})\n` +
                      `▢ *DURACIÓN:* ${video.duration}s\n` +
                      `▢ *PESO:* ${(video.size / (1024 * 1024)).toFixed(2)} MB\n` +
                      `▢ *MÉTRICAS:* 👁️ ${fmt(video.play_count)} | ❤️ ${fmt(video.digg_count)}\n\n` +
                      `▢ *LINK:* ${videoUrl}`;

      // Envío del video en el formato que usa Baileys (sock.sendMessage)
      await sock.sendMessage(from, { 
        video: videoBuffer, 
        caption: caption,
        mimetype: 'video/mp4'
      }, { quoted: m });

    } catch (e) {
      console.error(e);
      await sock.sendMessage(from, { 
        text: 'Ocurrió un error al procesar o descargar el video.' 
      }, { quoted: m });
    }
  }
};
