const ytMusic = require('../../../../sistema/Libreria/music.js');

module.exports = {
  name: 'ytsearch',
  alias: ['yts', 'musicinfo', 'ytmsearch'],
  description: 'Explorador avanzado de YouTube Music (Álbumes, Artistas, Letras, etc.)',
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid;
    
    // Si no escriben texto o ponen solo /yts, muestra el menú de ayuda interactivo
    if (!texto || !texto.trim()) {
      return sock.sendMessage(from, { 
        text: `🎵 *Menú de YouTube Music* 🎵\n\nUsa los comandos de la siguiente manera:\n\n• \`/yts search <nombre>\`\n  _Busca canciones, álbumes, artistas y playlists_\n\n• \`/yts info <browseId>\`\n  _Muestra las canciones de un Álbum (MPREb...) o Artista (UC...)_\n\n• \`/yts lyrics <videoId>\`\n  _Extrae la letra oficial de una canción_\n\n• \`/yts related <videoId>\`\n  _Muestra canciones relacionadas/recomendadas_` 
      }, { quoted: m });
    }

    const args = texto.trim().split(' ');
    const subCommand = args[0].toLowerCase();
    const query = args.slice(1).join(' ');

    try {
      // 1. Comando SEARCH
      if (subCommand === 'search') {
        if (!query) {
          return sock.sendMessage(from, { text: '⚠️ Escribe lo que deseas buscar.\n*Ejemplo:* `/yts search Daft Punk`' }, { quoted: m });
        }

        await sock.sendMessage(from, { text: '🔍 Buscando en YouTube Music...' }, { quoted: m });
        const res = await ytMusic.search(query);

        if (!res.results || res.results.length === 0) {
          return sock.sendMessage(from, { text: '❌ No se encontraron resultados.' }, { quoted: m });
        }

        let mensaje = `🎶 *Resultados para:* "${query}"\n\n`;

        res.results.slice(0, 8).forEach((item, index) => {
          mensaje += `${index + 1}. *${item.title || 'Sin título'}*\n`;
          mensaje += `   • *Tipo:* ${item.resultType || 'Desconocido'}\n`;
          if (item.subtitle) mensaje += `   • *Detalle:* ${item.subtitle}\n`;
          
          if (item.videoId) {
            mensaje += `   • *Video ID:* \`${item.videoId}\`\n`;
          }
          if (item.browseId) {
            mensaje += `   • *Browse ID:* \`${item.browseId}\`\n`;
          }
          mensaje += `\n`;
        });

        mensaje += `_💡 Usa /yts info <Browse ID> para ver el contenido completo de álbumes o artistas._`;
        return sock.sendMessage(from, { text: mensaje }, { quoted: m });

      } 
      
      // 2. Comando INFO (Álbumes, Artistas, Playlists)
      else if (subCommand === 'info') {
        const browseId = args[1];
        if (!browseId) {
          return sock.sendMessage(from, { text: '⚠️ Debes proporcionar un ID válido.\n*Ejemplo:* `/yts info MPREb_iiwAV5NRcwy`' }, { quoted: m });
        }

        await sock.sendMessage(from, { text: '🔍 Extrayendo información de la plataforma...' }, { quoted: m });
        const data = await ytMusic.info(browseId);

        if (data.type === 'album') {
          let msg = `💿 *Álbum:* ${data.title}\n`;
          msg += `👤 *Artista:* ${data.artist || 'Desconocido'}\n`;
          msg += `📅 *Año:* ${data.year || 'N/A'}\n`;
          msg += `🎵 *Total de pistas:* ${data.trackCount}\n\n*Lista de canciones:*\n`;
          
          data.tracks.slice(0, 15).forEach((t, i) => {
            msg += `${i + 1}. ${t.title} (${t.duration || 'N/A'})\n`;
          });
          return sock.sendMessage(from, { text: msg }, { quoted: m });
        } 
        
        if (data.type === 'artist') {
          let msg = `🎤 *Artista:* ${data.name}\n`;
          if (data.views) msg += `👁️ *Vistas:* ${data.views}\n`;
          if (data.description) msg += `📝 *Bio:* ${data.description.slice(0, 150)}...\n\n*Canciones Principales:*\n`;
          
          data.songs.slice(0, 8).forEach((s, i) => {
            msg += `${i + 1}. ${s.title} (ID: \`${s.videoId}\`)\n`;
          });
          return sock.sendMessage(from, { text: msg }, { quoted: m });
        }

        if (data.type === 'playlist') {
          let msg = `📋 *Playlist:* ${data.title}\n`;
          msg += `📊 *Estadísticas:* ${data.stats || 'N/A'}\n\n`;
          return sock.sendMessage(from, { text: msg }, { quoted: m });
        }

        return sock.sendMessage(from, { text: '📄 Datos:\n\n' + JSON.stringify(data, null, 2).slice(0, 1500) }, { quoted: m });

      } 
      
      // 3. Comando LYRICS (Letras)
      else if (subCommand === 'lyrics') {
        const videoId = args[1];
        if (!videoId) {
          return sock.sendMessage(from, { text: '⚠️ Ingresa el videoId de la canción.\n*Ejemplo:* `/yts lyrics <videoId>`' }, { quoted: m });
        }

        await sock.sendMessage(from, { text: '📜 Buscando letra oficial...' }, { quoted: m });
        const lyricData = await ytMusic.lyrics(videoId);

        if (!lyricData || !lyricData.lyrics) {
          return sock.sendMessage(from, { text: '❌ No se encontró la letra para este ID.' }, { quoted: m });
        }

        let msg = `📜 *Letra de la canción*\n\n${lyricData.lyrics}`;
        return sock.sendMessage(from, { text: msg.length > 3900 ? msg.slice(0, 3900) + '...' : msg }, { quoted: m });

      } 
      
      // 4. Comando RELATED (Relacionados)
      else if (subCommand === 'related') {
        const videoId = args[1];
        if (!videoId) {
          return sock.sendMessage(from, { text: '⚠️ Ingresa un videoId válido.\n*Ejemplo:* `/yts related <videoId>`' }, { quoted: m });
        }

        await sock.sendMessage(from, { text: '🎶 Buscando canciones relacionadas...' }, { quoted: m });
        const rel = await ytMusic.related(videoId);

        if (!rel.tracks || rel.tracks.length === 0) {
          return sock.sendMessage(from, { text: '❌ No se encontraron pistas relacionadas.' }, { quoted: m });
        }

        let msg = `🎶 *Canciones Relacionadas*\n\n`;
        rel.tracks.slice(0, 8).forEach((t, i) => {
          msg += `${i + 1}. *${t.title}* - ID: \`${t.videoId}\`\n`;
        });

        return sock.sendMessage(from, { text: msg }, { quoted: m });

      } 
      
      // Si escriben cualquier otra cosa sin subcomando válido
      else {
        return sock.sendMessage(from, { 
          text: `❓ Subcomando no reconocido. Usa:\n• \`/yts search <nombre>\`\n• \`/yts info <browseId>\`\n• \`/yts lyrics <videoId>\`\n• \`/yts related <videoId>\`` 
        }, { quoted: m });
      }

    } catch (error) {
      console.error(error);
      await sock.sendMessage(from, { text: `❌ Ocurrió un error: ${error.message}` }, { quoted: m });
    }
  }
};
