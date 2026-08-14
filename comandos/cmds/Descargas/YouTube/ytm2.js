const ytMusic = require('../../../../sistema/Libreria/music.js');

module.exports = {
  name: 'ytsearch',
  alias: ['yts', 'musicinfo', 'ytmsearch'],
  description: 'Herramienta avanzada de búsqueda e información de YouTube Music.',
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid;
    
    if (!texto || !texto.trim()) {
      return sock.sendMessage(from, { 
        text: `🎵 *Menú de Búsqueda YouTube Music* 🎵\n\nUso correcto:\n\n• \`/yts search <canción/artista> [songs/videos/albums/artists/playlists]\`\n  _Ejemplo: /yts search avenged sevenfold songs_\n\n• \`/yts info <browseId>\`\n  _Detalles de álbumes (MPREb...), artistas (UC...) o playlists (PL...)_\n\n• \`/yts lyrics <videoId>\`\n  _Muestra la letra de una canción_\n\n• \`/yts related <videoId>\`\n  _Muestra canciones relacionadas_\n` 
      }, { quoted: m });
    }

    const args = texto.trim().split(' ');
    const subCommand = args[0].toLowerCase();
    const queryArgs = args.slice(1).join(' ');
    const extraArg = args[2];

    try {
      if (subCommand === 'search') {
        if (!queryArgs) {
          return sock.sendMessage(from, { text: '⚠️ Escribe lo que deseas buscar.\n*Ejemplo:* `/yts search rock songs`' }, { quoted: m });
        }

        await sock.sendMessage(from, { text: '🔍 Buscando en YouTube Music...' }, { quoted: m });
        
        const filterType = ['songs', 'videos', 'albums', 'artists', 'playlists'].includes(extraArg) ? extraArg : undefined;
        const searchTerm = filterType ? args.slice(1, -1).join(' ') : queryArgs;

        const res = await ytMusic.search(searchTerm, filterType);

        if (!res.results || res.results.length === 0) {
          return sock.sendMessage(from, { text: '❌ No se encontraron resultados.' }, { quoted: m });
        }

        let mensaje = `🎶 *Resultados para:* "${searchTerm}"\n`;
        if (filterType) mensaje += `🏷️ *Filtro:* ${filterType}\n\n`;

        res.results.slice(0, 8).forEach((item, index) => {
          mensaje += `${index + 1}. *${item.title || 'Sin título'}*\n`;
          mensaje += `   • *Tipo:* ${item.resultType || 'Desconocido'}\n`;
          if (item.subtitle) mensaje += `   • *Subtítulo:* ${item.subtitle}\n`;
          if (item.videoId) mensaje += `   • *Video ID:* \`${item.videoId}\`\n`;
          if (item.browseId) mensaje += `   • *Browse ID:* \`${item.browseId}\`\n\n`;
        });

        return sock.sendMessage(from, { text: mensaje }, { quoted: m });

      } else if (subCommand === 'info') {
        const browseId = args[1];
        if (!browseId) {
          return sock.sendMessage(from, { text: '⚠️ Debes proporcionar un browseId válido.\n*(Ej: MPREb..., UC..., VL...)*' }, { quoted: m });
        }

        await sock.sendMessage(from, { text: '🔍 Obteniendo información detallada...' }, { quoted: m });
        const data = await ytMusic.info(browseId);

        if (data.type === 'album') {
          let msg = `💿 *Álbum:* ${data.title}\n👤 *Artista:* ${data.artist || 'Desconocido'}\n📅 *Año:* ${data.year || 'N/A'}\n🎵 *Pistas:* ${data.trackCount}\n\n`;
          data.tracks.slice(0, 10).forEach((t, i) => {
            msg += `${i + 1}. ${t.title} (${t.duration || 'N/A'})\n`;
          });
          return sock.sendMessage(from, { text: msg }, { quoted: m });
        } 
        
        if (data.type === 'artist') {
          let msg = `🎤 *Artista:* ${data.name}\n`;
          if (data.views) msg += `👁️ *Vistas:* ${data.views}\n\n*Canciones top:* \n`;
          data.songs.slice(0, 5).forEach((s, i) => {
            msg += `${i + 1}. ${s.title} (ID: \`${s.videoId}\`)\n`;
          });
          return sock.sendMessage(from, { text: msg }, { quoted: m });
        }

        return sock.sendMessage(from, { text: '📄 Información obtenida:\n\n' + JSON.stringify(data, null, 2).slice(0, 1500) }, { quoted: m });

      } else if (subCommand === 'lyrics') {
        const videoId = args[1];
        if (!videoId) {
          return sock.sendMessage(from, { text: '⚠️ Ingresa el videoId de la canción.\n*Ejemplo:* `/yts lyrics <videoId>`' }, { quoted: m });
        }

        await sock.sendMessage(from, { text: '📜 Buscando letra...' }, { quoted: m });
        const lyricData = await ytMusic.lyrics(videoId);

        if (!lyricData || !lyricData.lyrics) {
          return sock.sendMessage(from, { text: '❌ No se encontró la letra.' }, { quoted: m });
        }

        let msg = `📜 *Letra de la canción*\n\n${lyricData.lyrics}`;
        return sock.sendMessage(from, { text: msg.length > 3900 ? msg.slice(0, 3900) + '...' : msg }, { quoted: m });

      } else if (subCommand === 'related') {
        const videoId = args[1];
        if (!videoId) {
          return sock.sendMessage(from, { text: '⚠️ Ingresa un videoId válido.\n*Ejemplo:* `/yts related <videoId>`' }, { quoted: m });
        }

        await sock.sendMessage(from, { text: '🎶 Buscando canciones relacionadas...' }, { quoted: m });
        const rel = await ytMusic.related(videoId);

        if (!rel.tracks || rel.tracks.length === 0) {
          return sock.sendMessage(from, { text: '❌ No se encontraron pistas.' }, { quoted: m });
        }

        let msg = `🎶 *Canciones Relacionadas*\n\n`;
        rel.tracks.slice(0, 8).forEach((t, i) => {
          msg += `${i + 1}. *${t.title}* - ID: \`${t.videoId}\`\n`;
        });

        return sock.sendMessage(from, { text: msg }, { quoted: m });

      } else {
        return sock.sendMessage(from, { text: '❓ Subcomando no reconocido. Escribe `/yts` para ver la ayuda.' }, { quoted: m });
      }

    } catch (error) {
      console.error(error);
      await sock.sendMessage(from, { text: `❌ Ocurrió un error: ${error.message}` }, { quoted: m });
    }
  }
};
