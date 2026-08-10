const yts = require('yt-search');

module.exports = {
  name: 'ytsearch',
  alias: ['ytbuscar', 'yts'],
  description: 'Busca videos en YouTube.',
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid;

    // Validación de texto ingresado
    if (!texto) {
      return sock.sendMessage(from, { 
        text: '🧹 _Por favor, ingresa una búsqueda de YouTube._' 
      }, { quoted: m });
    }

    try {
      // Mensaje de espera
      await sock.sendMessage(from, { 
        text: '⏳ _Buscando resultados..._' 
      }, { quoted: m });

      // Realizar la búsqueda
      const results = await yts(texto);
      const videos = results.videos;

      if (!videos || videos.length === 0) {
        return sock.sendMessage(from, { 
          text: '❌ _No se encontraron resultados._' 
        }, { quoted: m });
      }

      // Mapear y formatear los resultados
      const teks = videos.slice(0, 5).map(v => {
        return `「✦」Resultados de la búsqueda para *<${texto}>*\n\n` +
               `> ☁️ Título » *${v.title}*\n` +
               `> 🍬 Canal » *${v.author.name}*\n` +
               `> 🕝 Duración » *${v.timestamp}*\n` +
               `> 📆 Subido » *${v.ago}*\n` +
               `> 👀 Vistas » *${v.views}*\n` +
               `> 🔗 Enlace » ${v.url}`;
      }).join('\n\n••••••••••••••••••••••••••••••••••••\n\n');

      // Enviar la imagen del primer resultado junto con el texto formateado
      await sock.sendMessage(from, {
        image: { url: videos[0].thumbnail },
        caption: teks
      }, { quoted: m });

    } catch (e) {
      console.error(e);
      await sock.sendMessage(from, { 
        text: '❌ _Ocurrió un error al realizar la búsqueda._' 
      }, { quoted: m });
    }
  }
};
