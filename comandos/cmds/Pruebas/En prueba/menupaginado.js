const { prepareWAMessageMedia } = require('@whiskeysockets/baileys');
const { getMenuPages } = require('./menupaginas');

// Almacén temporal en memoria para rastrear qué mensaje de menú pertenece a qué usuario/chat
global.menuPaginadoActivo = global.menuPaginadoActivo || {};

let cachedMedia = null;
let lastBannerUrl = '';

module.exports = {
  name: 'menupaginado',
  alias: ['paginas', 'mpage'],
  description: 'Muestra un menú interactivo por páginas usando respuestas.',
  run: async (sock, m, texto) => {
    try {
      const from = m.key.remoteJid;
      const name = m.pushName || 'Usuario';
      const link = 'https://tamaki-kotatsu.github.io/.xyz/'; 
      const banner = 'https://files.catbox.moe/oa48ft.jpg'; 
      const botname = '╰☆╮Hatsune ╭☆╮Miku╰☆╮• WA BOT';
      const descripcion = '✧ ─━⊜ POWERED BY |─━ Hanner';

      const pages = getMenuPages(name, link);
      const paginaInicial = pages[0];

      if (!cachedMedia || lastBannerUrl !== banner) {
        cachedMedia = await prepareWAMessageMedia(
          { image: { url: banner } },
          { upload: sock.waUploadToServer, mediaTypeOverride: 'thumbnail-link' }
        );
        lastBannerUrl = banner;
      }

      const sentMsg = await sock.sendMessage(from, {
        text: paginaInicial.trim(),
        linkPreview: {
          'canonical-url': link,
          'matched-text': link,
          title: botname,
          description: descripcion,
          jpegThumbnail: cachedMedia?.imageMessage?.jpegThumbnail ? Buffer.from(cachedMedia.imageMessage.jpegThumbnail) : undefined,
          highQualityThumbnail: cachedMedia?.imageMessage || undefined
        },
        contextInfo: { mentionedJid: null, isForwarded: false }
      }, { quoted: m });

      // Guardamos el ID del mensaje enviado para validarlo cuando respondan
      if (sentMsg && sentMsg.key && sentMsg.key.id) {
        global.menuPaginadoActivo[sentMsg.key.id] = {
          remitente: m.key.participant || from,
          pages: pages
        };
      }

    } catch (e) {
      console.error('Error al enviar el menú paginado:', e);
      cachedMedia = null;
      await sock.sendMessage(m.key.remoteJid, { text: '❌ Ocurrió un error al cargar el menú paginado.' }, { quoted: m });
    }
  }
};
