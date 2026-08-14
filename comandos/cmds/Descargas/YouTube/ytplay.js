const ytMusic = require('../../../../Libreria/music.js');

module.exports = {
  name: 'ytmusic',
  alias: ['yts', 'musica', 'play', 'audio'],
  description: 'Busca y envía música de YouTube Music.',
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid;
    
    if (!texto) {
      return sock.sendMessage(from, { 
        text: '❌ *Uso incorrecto.*\n\nEjemplos:\n• `/play <nombre de la canción>`\n• `/ytm search <canción>`' 
      });
    }

    const args = texto.trim().split(' ');
    const command = args[0].toLowerCase();
    const query = args.slice(1).join(' ');

    try {
      // Si usan el comando play o audio directamente, buscamos y enviamos el audio del primer resultado
      if (command === 'play' || command === 'audio' || command === 'ytm') {
        const songQuery = command === 'play' || command === 'audio' ? texto : query;
        
        if (!songQuery) return sock.sendMessage(from, { text: '⚠️ Escribe el nombre de la canción que quieres reproducir.' });

        await sock.sendMessage(from, { text: '🔍 Buscando y preparando el audio...' });
        
        // 1. Buscar la canción
        const res = await ytMusic.search(songQuery, 'songs');
        const song = res.results.find(r => r.videoId);

        if (!song) {
          return sock.sendMessage(from, { text: '❌ No encontré ninguna canción con ese nombre.' });
        }

        await sock.sendMessage(from, { text: `🎵 *Encontrado:* ${song.title}\n⏳ Descargando audio...` });

        // 2. Obtener los links de descarga con tu librería music.js
        const streamData = await ytMusic.download(song.videoId);

        if (!streamData || !streamData.audioFormats || streamData.audioFormats.length === 0) {
          return sock.sendMessage(from, { text: '❌ No se pudo obtener el enlace de descarga para este audio.' });
        }

        // Seleccionar el mejor formato de audio disponible
        const audioFormat = streamData.audioFormats.find(f => f.url) || streamData.audioFormats[0];

        if (!audioFormat || !audioFormat.url) {
          return sock.sendMessage(from, { text: '❌ El formato de audio está protegido o no disponible.' });
        }

        // 3. Enviar el audio usando Baileys
        await sock.sendMessage(from, {
          audio: { url: audioFormat.url },
          mimetype: 'audio/mp4', // O 'audio/mpeg' según prefiera Baileys
          fileName: `${song.title}.mp3`,
          ptt: false // ponlo en true si quieres que se envíe como nota de voz
        }, { quoted: m });

      } else if (command === 'search') {
        if (!query) return sock.sendMessage(from, { text: '⚠️ Escribe algo para buscar.' });
        
        const res = await ytMusic.search(query);
        if (!res.results || res.results.length === 0) {
          return sock.sendMessage(from, { text: '❌ No se encontraron resultados.' });
        }

        let mensaje = `🎵 *Resultados para:* "${query}"\n\n`;
        res.results.slice(0, 5).forEach((item, index) => {
          mensaje += `${index + 1}. *${item.title}*\n`;
          mensaje += `   • Tipo: ${item.resultType || 'Desconocido'}\n`;
          if (item.videoId) mensaje += `   • Usa: \`/play ${item.title}\`\n\n`;
        });

        await sock.sendMessage(from, { text: mensaje });
      } else {
        await sock.sendMessage(from, { text: '❓ Comando no reconocido. Usa `/play <cancion>`.' });
      }

    } catch (error) {
      console.error(error);
      await sock.sendMessage(from, { text: `❌ Ocurrió un error al procesar el audio: ${error.message}` });
    }
  }
};
