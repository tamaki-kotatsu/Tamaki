const ytMusic = require('../lib/music.js'); // Ajusta la ruta según dónde guardes el archivo music.js

module.exports = {
  name: 'ytmusic',
  alias: ['ytm', 'musica'],
  description: 'Busca y obtiene información de YouTube Music.',
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid;
    
    // Validar que se use en grupos o chats permitidos si es necesario
    if (!texto) {
      return sock.sendMessage(from, { 
        text: '❌ *Uso incorrecto.*\n\nEjemplos:\n• `/ytm search <canción>`\n• `/ytm lyrics <videoId>`' 
      });
    }

    const args = texto.trim().split(' ');
    const command = args[0].toLowerCase();
    const query = args.slice(1).join(' ');

    try {
      if (command === 'search') {
        if (!query) return sock.sendMessage(from, { text: '⚠️ Escribe el nombre de lo que quieres buscar.' });
        
        await sock.sendMessage(from, { text: '🔍 Buscando en YouTube Music...' });
        const res = await ytMusic.search(query);
        
        if (!res.results || res.results.length === 0) {
          return sock.sendMessage(from, { text: '❌ No se encontraron resultados.' });
        }

        let mensaje = `🎵 *Resultados para:* "${query}"\n\n`;
        res.results.slice(0, 5).forEach((item, index) => {
          mensaje += `${index + 1}. *${item.title}*\n`;
          mensaje += `   • Tipo: ${item.resultType || 'Desconocido'}\n`;
          mensaje += `   • Subtítulo: ${item.subtitle || 'N/A'}\n`;
          if (item.videoId) mensaje += `   • ID: \`${item.videoId}\`\n`;
          mensaje += `\n`;
        });

        await sock.sendMessage(from, { text: mensaje });

      } else if (command === 'lyrics' || command === 'letra') {
        const videoId = args[1];
        if (!videoId) return sock.sendMessage(from, { text: '⚠️ Debes proporcionar el videoId de la canción.' });

        await sock.sendMessage(from, { text: '📜 Buscando letra...' });
        const data = await ytMusic.lyrics(videoId);

        if (!data.lyrics) {
          return sock.sendMessage(from, { text: '❌ No se encontró la letra para esta canción.' });
        }

        const respuestaLetra = `📜 *Letra:*\n\n${data.lyrics}\n\n_Fuente: ${data.source || 'Desconocida'}_`;
        await sock.sendMessage(from, { text: respuestaLetra });

      } else {
        await sock.sendMessage(from, { 
          text: '❓ Subcomando desconocido. Usa:\n• `/ytm search <texto>`\n• `/ytm lyrics <videoId>`' 
        });
      }

    } catch (error) {
      console.error(error);
      await sock.sendMessage(from, { text: `❌ Ocurrió un error: ${error.message}` });
    }
  }
};
