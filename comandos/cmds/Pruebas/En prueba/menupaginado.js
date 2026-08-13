const { getMenuPages } = require('./menuPages');

global.menuPaginadoActivo = global.menuPaginadoActivo || {};

module.exports = {
  name: 'menupaginado',
  alias: ['paginas', 'mpage'],
  description: 'Muestra un menú interactivo por páginas usando respuestas.',
  run: async (sock, m, texto) => {
    try {
      const from = m.key.remoteJid;
      const name = m.pushName || 'Usuario';
      const link = 'https://tamaki-kotatsu.github.io/.xyz/'; 

      const pagesData = getMenuPages(name, link);
      const paginaInicial = pagesData[0];

      const sentMsg = await sock.sendMessage(from, {
        image: { url: paginaInicial.banner },
        caption: paginaInicial.text.trim()
      }, { quoted: m });

      if (sentMsg && sentMsg.key && sentMsg.key.id) {
        const rootId = sentMsg.key.id;
        const sesionData = {
          rootId: rootId,
          remitente: m.key.participant || from,
          pages: pagesData
        };

        global.menuPaginadoActivo[rootId] = sesionData;
      }

    } catch (e) {
      console.error('Error al enviar el menú paginado:', e);
      await sock.sendMessage(m.key.remoteJid, { text: '❌ Ocurrió un error al cargar el menú paginado.' }, { quoted: m });
    }
  }
};
