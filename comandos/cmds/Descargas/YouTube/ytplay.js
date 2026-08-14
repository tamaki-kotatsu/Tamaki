const ytMusic = require('../../../../sistema/Libreria/music.js');

module.exports = {
  name: 'ytmusic',
  alias: ['yts', 'musica', 'play', 'audio'],
  description: 'Busca y envía música de YouTube Music.',
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid;
    
    // Si no escriben nada, muestra la ayuda
    if (!texto || !texto.trim()) {
      return sock.sendMessage(from, { 
        text: '❌ *Uso incorrecto.*\n\nEjemplos:\n• `/play <nombre de la canción>`\n• `/ytm search <canción>`' 
      }, { quoted: m });
    }

    const args = texto.trim().split(' ');
    const command = args[0].toLowerCase();
    const query = args.slice(1).join(' ');

    try {
      // Si el comando es "search", busca la lista
      if (command === 'search') {
        if (!query) return sock.sendMessage(from, { text: '⚠️ Escribe algo para buscar.' }, { quoted: m });
        
        await sock.sendMessage(from, { text: '🔍 Buscando en YouTube Music...' }, { quoted: m });
        const res = await ytMusic.search(query, 'songs');
        
        if (!res.results || res.results.length === 0) {
          return sock.sendMessage(from, { text: '❌ No se encontraron resultados.' }, { quoted: m });
        }

        let mensaje = `🎵 *Resultados para:* "${query}"\n\n`;
        res.results.slice(0, 5).forEach((item, index) => {
          mensaje += `${index + 1}. *${item.title}*\n`;
          mensaje += `   • Artista: ${item.artists?.map(a => a.name).join(', ') || 'Desconocido'}\n`;
          mensaje += `   • Duración: ${item.duration || 'N/A'}\n\n`;
        });
        mensaje += `_Para descargar, escribe el nombre completo con /play_`;

        return sock.sendMessage(from, { text: mensaje }, { quoted: m });
      }

      // Por defecto, si ponen cualquier otra cosa o usan el alias play, asumimos que es una búsqueda para descargar el audio
      const songQuery = ['play', 'audio', 'ytm', 'musica'].includes(command) ? query : texto;

      if (!songQuery) {
        return sock.sendMessage(from, { text: '⚠️ Escribe el nombre de la canción que quieres reproducir.' }, { quoted: m });
      }

      await sock.sendMessage(from, { text: '🔍 Buscando canción...' }, { quoted: m });
      
      const searchRes = await ytMusic.search(songQuery, 'songs');
      const song = searchRes.results.find(r => r.videoId);

      if (!song) {
        return sock.sendMessage(from, { text: '❌ No encontré ninguna canción con ese nombre.' }, { quoted: m });
      }

      await sock.sendMessage(from, { text: `🎵 *Encontrado:* ${song.title}\n⏳ Preparando y enviando audio...` }, { quoted: m });

      const streamData = await ytMusic.download(song.videoId);

      if (!streamData || !streamData.audioFormats || streamData.audioFormats.length === 0) {
        return sock.sendMessage(from, { text: '❌ No se pudo obtener el audio de este enlace.' }, { quoted: m });
      }

      const audioFormat = streamData.audioFormats.find(f => f.url) || streamData.audioFormats[0];

      if (!audioFormat || !audioFormat.url) {
        return sock.sendMessage(from, { text: '❌ El formato de audio no está disponible.' }, { quoted: m });
      }

      // Envía el audio directamente a WhatsApp
      await sock.sendMessage(from, {
        audio: { url: audioFormat.url },
        mimetype: 'audio/mp4',
        fileName: `${song.title}.mp3`,
        ptt: false
      }, { quoted: m });

    } catch (error) {
      console.error(error);
      await sock.sendMessage(from, { text: `❌ Ocurrió un error: ${error.message}` }, { quoted: m });
    }
  }
};
