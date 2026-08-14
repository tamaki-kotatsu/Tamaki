const ytMusic = require('../../../../sistema/Libreria/music.js');

module.exports = {
  name: 'ytmusic2',
  alias: ['ñya', 'music', 'musica'],
  description: 'Explora YouTube Music (Búsquedas, Álbumes, Artistas, Letras y Más).',
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid;
    
    if (!texto || !texto.trim()) {
      return sock.sendMessage(from, { 
        text: `🎵 *Menú de YouTube Music* 🎵\n\nUso correcto de los comandos:\n\n• \`/ytm search <canción/artista> [songs/videos/albums/artists/playlists]\`\n  _Ejemplo: /ytm search avenged sevenfold songs_\n\n• \`/ytm info <browseId>\`\n  _Obtiene detalles de álbumes (MPREb...), artistas (UC...) o playlists (PL...)_\n\n• \`/ytm lyrics <videoId>\`\n  _Muestra la letra de una canción usando su ID_\n\n• \`/ytm related <videoId>\`\n  _Muestra canciones relacionadas/recomendadas_\n\n• \`/ytm dl <videoId>\`\n  _Muestra metadatos y estado del stream de audio_\n` 
      }, { quoted: m });
    }

    const args = texto.trim().split(' ');
    const subCommand = args[0].toLowerCase();
    const queryArgs = args.slice(1).join(' ');
    const extraArg = args[2]; // Para filtros de búsqueda

    try {
      if (subCommand === 'search') {
        if (!queryArgs) {
          return sock.sendMessage(from, { text: '⚠️ Escribe lo que deseas buscar.\n*Ejemplo:* `/ytm search rock songs`' }, { quoted: m });
        }

        await sock.sendMessage(from, { text: '🔍 Buscando en YouTube Music...' }, { quoted: m });
        
        // El segundo argumento puede ser el filtro: songs, videos, albums, artists, playlists
        const filterType = ['songs', 'videos', 'albums', 'artists', 'playlists'].includes(extraArg) ? extraArg : undefined;
        const searchTerm = filterType ? args.slice(1, -1).join(' ') : queryArgs;

        const res = await ytMusic.search(searchTerm, filterType);

        if (!res.results || res.results.length === 0) {
          return sock.sendMessage(from, { text: '❌ No se encontraron resultados para esa búsqueda.' }, { quoted: m });
        }

        let mensaje = `🎶 *Resultados para:* "${searchTerm}"\n`;
        if (filterType) mensaje += `🏷️ *Filtro:* ${filterType}\n`;
        mensaje += `📊 *Total encontrados:* ${res.count}\n\n`;

        res.results.slice(0, 8).forEach((item, index) => {
          mensaje += `${index + 1}. *${item.title || 'Sin título'}*\n`;
          mensaje += `   • *Tipo:* ${item.resultType || 'Desconocido'}\n`;
          if (item.subtitle) mensaje += `   • *Subtítulo:* ${item.subtitle}\n`;
          if (item.duration) mensaje += `   • *Duración:* ${item.duration}\n`;
          if (item.videoId) mensaje += `   • *Video ID:* \`${item.videoId}\`\n`;
          if (item.browseId) mensaje += `   • *Browse ID:* \`${item.browseId}\`\n`;
          mensaje += `\n`;
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
          let msg = `💿 *Álbum:* ${data.title}\n`;
          msg += `👤 *Artista:* ${data.artist || 'Desconocido'}\n`;
          msg += `📅 *Año:* ${data.year || 'N/A'}\n`;
          msg += `🎵 *Pistas:* ${data.trackCount}\n\n*Canciones principales:* \n`;
          data.tracks.slice(0, 10).forEach((t, i) => {
            msg += `${i + 1}. ${t.title} (${t.duration || 'N/A'})\n`;
          });
          return sock.sendMessage(from, { text: msg }, { quoted: m });
        } 
        
        if (data.type === 'artist') {
          let msg = `🎤 *Artista:* ${data.name}\n`;
          if (data.views) msg += `👁️ *Vistas:* ${data.views}\n`;
          if (data.description) msg += `📝 *Info:* ${data.description.slice(0, 200)}...\n\n*Canciones top:* \n`;
          data.songs.slice(0, 5).forEach((s, i) => {
            msg += `${i + 1}. ${s.title} (ID: \`${s.videoId}\`)\n`;
          });
          return sock.sendMessage(from, { text: msg }, { quoted: m });
        }

        if (data.type === 'playlist') {
          let msg = `📋 *Playlist:* ${data.title}\n`;
          msg += `📊 *Estadísticas:* ${data.stats || 'N/A'}\n`;
          msg += `🎵 *Total de pistas:* ${data.trackCount}\n\n`;
          return sock.sendMessage(from, { text: msg }, { quoted: m });
        }

        return sock.sendMessage(from, { text: '📄 Información obtenida con éxito:\n\n' + JSON.stringify(data, null, 2).slice(0, 1500) }, { quoted: m });

      } else if (subCommand === 'lyrics') {
        const videoId = args[1];
        if (!videoId) {
          return sock.sendMessage(from, { text: '⚠️ Debes ingresar el videoId de la canción.\n*Ejemplo:* `/ytm lyrics onCZOgWlr1U`' }, { quoted: m });
        }

        await sock.sendMessage(from, { text: '📜 Buscando letra de la canción...' }, { quoted: m });
        const lyricData = await ytMusic.lyrics(videoId);

        if (!lyricData || !lyricData.lyrics) {
          return sock.sendMessage(from, { text: '❌ No se encontró la letra para este videoId.' }, { quoted: m });
        }

        let msg = `📜 *Letra de la canción*\n\n${lyricData.lyrics}`;
        if (lyricData.source) msg += `\n\n_Fuente: ${lyricData.source}_`;

        // Si la letra es muy larga, WhatsApp la recorta, se puede enviar en bloques si es necesario
        return sock.sendMessage(from, { text: msg.length > 3900 ? msg.slice(0, 3900) + '...\n(Texto recortado por límite)' : msg }, { quoted: m });

      } else if (subCommand === 'related') {
        const videoId = args[1];
        if (!videoId) {
          return sock.sendMessage(from, { text: '⚠️ Debes ingresar un videoId válido.\n*Ejemplo:* `/ytm related onCZOgWlr1U`' }, { quoted: m });
        }

        await sock.sendMessage(from, { text: '🎶 Buscando canciones relacionadas...' }, { quoted: m });
        const rel = await ytMusic.related(videoId);

        if (!rel.tracks || rel.tracks.length === 0) {
          return sock.sendMessage(from, { text: '❌ No se encontraron pistas relacionadas.' }, { quoted: m });
        }

        let msg = `🎶 *Canciones Relacionadas / Up Next*\n\n`;
        rel.tracks.slice(0, 8).forEach((t, i) => {
          msg += `${i + 1}. *${t.title}*\n`;
          msg += `   • *Artistas:* ${t.artists.map(a => a.name).join(', ') || 'N/A'}\n`;
          msg += `   • *ID:* \`${t.videoId}\`\n\n`;
        });

        return sock.sendMessage(from, { text: msg }, { quoted: m });

      } else if (subCommand === 'dl' || subCommand === 'download') {
        const videoId = args[1];
        if (!videoId) {
          return sock.sendMessage(from, { text: '⚠️ Ingresa el videoId para consultar metadatos de stream.\n*Ejemplo:* `/ytm dl onCZOgWlr1U`' }, { quoted: m });
        }

        await sock.sendMessage(from, { text: '⚙️ Consultando metadatos del reproductor...' }, { quoted: m });
        const dlInfo = await ytMusic.download(videoId);

        let msg = `📦 *Datos del Stream (Player)*\n\n`;
        msg += `• *Título:* ${dlInfo.title || 'N/A'}\n`;
        msg += `• *Artista:* ${dlInfo.artist || 'N/A'}\n`;
        msg += `• *Duración:* ${dlInfo.lengthSeconds} segundos\n`;
        msg += `• *Formatos de audio disponibles:* ${dlInfo.audioFormats?.length || 0}\n`;
        if (dlInfo.reason) msg += `• *Estado/Motivo:* ${dlInfo.reason}\n`;

        return sock.sendMessage(from, { text: msg }, { quoted: m });

      } else {
        return sock.sendMessage(from, { text: '❓ Subcomando no reconocido. Escribe `/ytm` para ver la ayuda.' }, { quoted: m });
      }

    } catch (error) {
      console.error(error);
      await sock.sendMessage(from, { text: `❌ Ocurrió un error: ${error.message}` }, { quoted: m });
    }
  }
};
