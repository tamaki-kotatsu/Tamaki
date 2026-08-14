const fetch = require('node-fetch');

module.exports = {
  name: 'tiktoksearch',
  alias: ['ttsearch', 'tts'],
  description: 'Busca videos de TikTok',
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid;

    if (!texto) {
      return sock.sendMessage(from, { 
        text: '✿ Ingresa un término de búsqueda.' 
      }, { quoted: m });
    }

    // Recuerda definir las variables globales o reemplazarlas según tu API
    const url = `${api.url}/search/tiktok?query=${encodeURIComponent(texto)}&key=${api.key}`;

    try {
      const res = await fetch(url);
      const json = await res.json();

      if (!json || !json.data || !json.data.length) {
        return sock.sendMessage(from, { 
          text: `✿ No se encontraron resultados para "${texto}".` 
        }, { quoted: m });
      }

      let message = ``;
      json.data.forEach((result, index) => {
        message += `➩ *Título ›* ${result.title}\n\n`;
        message += `𖹭  ׄ  ְ ✿ *Autor ›* ${result.author.nickname} (@${result.author.unique_id})\n`;
        message += `𖹭  ׄ  ְ ✤ *Reproducciones ›* ${result.stats.views}\n`;
        message += `𖹭  ׄ  ְ ✰ *Comentarios ›* ${result.stats.comments}\n`;
        message += `𖹭  ׄ  ְ ❖ *Compartidos ›* ${result.stats.shares}\n`;
        message += `𖹭  ׄ  ְ ꕥ *Me gusta ›* ${result.stats.likes}\n`;
        message += `𖹭  ׄ  ְ ☄︎ *Descargas ›* ${result.stats.downloads}\n`;
        message += `𖹭  ׄ  ְ ⚡︎ *Duración ›* ${result.duration}\n`;
        message += `𖹭  ׄ  ְ ❑ *URL ›* https://www.tiktok.com/@${result.author.unique_id}/video/${result.id}\n\n`;
        
        if (index < json.data.length - 1) {
          message += `╾۪〬─ ┄۫╌ ׄ┄┈۪ ─〬 ׅ┄╌ ۫┈ ─ׄ─۪〬 ┈ ┄۫╌ ┈┄۪ ─ׄ〬╼\n\n`;
        }
      });

      await sock.sendMessage(from, { text: message.trim() }, { quoted: m });
    } catch (e) {
      console.error(e);
      await sock.sendMessage(from, { 
        text: 'Ocurrió un error al realizar la búsqueda.' 
      }, { quoted: m });
    }
  }
};
