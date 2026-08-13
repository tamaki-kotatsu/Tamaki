const { prepareWAMessageMedia } = require('@whiskeysockets/baileys');
const { getMenuPages } = require('./menuPages');

global.menuPaginadoActivo = global.menuPaginadoActivo || {};

let cachedMedia = {};
let lastBannerUrl = {};

module.exports = {
  name: 'menupaginado',
  alias: ['paginas', 'mpage'],
  description: 'Muestra un menú interactivo por páginas usando respuestas.',
  run: async (sock, m, texto) => {
    try {
      const from = m.key.remoteJid;
      const name = m.pushName || 'Usuario';
      const link = 'https://tamaki-kotatsu.github.io/.xyz/'; 
      const botname = '╰☆╮Hatsune ╭☆╮Miku╰☆╮• WA BOT';
      const descripcion = '✧ ─━⊜ POWERED BY |─━ Hanner';

      const pagesData = getMenuPages(name, link);
      const paginaInicialText = pagesData[0].text;
      const bannerInicial = pagesData[0].banner;

      if (!cachedMedia[bannerInicial] || lastBannerUrl[bannerInicial] !== bannerInicial) {
        cachedMedia[bannerInicial] = await prepareWAMessageMedia(
          { image: { url: bannerInicial } },
          { upload: sock.waUploadToServer, mediaTypeOverride: 'thumbnail-link' }
        );
        lastBannerUrl[bannerInicial] = bannerInicial;
      }

      const mediaActual = cachedMedia[bannerInicial];

      const sentMsg = await sock.sendMessage(from, {
        text: paginaInicialText.trim(),
        linkPreview: {
          'canonical-url': link,
          'matched-text': link,
          title: botname,
          description: descripcion,
          jpegThumbnail: mediaActual?.imageMessage?.jpegThumbnail ? Buffer.from(mediaActual.imageMessage.jpegThumbnail) : undefined,
          highQualityThumbnail: mediaActual?.imageMessage || undefined
        },
        contextInfo: { mentionedJid: null, isForwarded: false }
      }, { quoted: m });

      if (sentMsg && sentMsg.key && sentMsg.key.id) {
        global.menuPaginadoActivo[sentMsg.key.id] = {
          remitente: m.key.participant || from,
          pages: pagesData,
          link: link,
          botname: botname,
          descripcion: descripcion
        };
      }

    } catch (e) {
      console.error('Error al enviar el menú paginado:', e);
      await sock.sendMessage(m.key.remoteJid, { text: '❌ Ocurrió un error al cargar el menú paginado.' }, { quoted: m });
    }
  }
};
