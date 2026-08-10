const { prepareWAMessageMedia } = require('@whiskeysockets/baileys');

// Variable en memoria para no re-subir la imagen en cada mensaje
let cachedMedia = null;
let lastBannerUrl = '';

module.exports = {
  name: 'menu',
  alias: ['help', 'comandos', 'allmenu'],
  description: 'Muestra el menú con carga instantánea.',
  run: async (sock, m, texto) => {
    try {
      const from = m.key.remoteJid;
      const name = m.pushName || 'Usuario';

      const link = 'https://api.alyacore.xyz'; 
      const banner = 'https://files.catbox.moe/n42hnr.jpg'; // Imagen ligera (< 200 KB)
      const botname = '╰☆╮Hatsune ╭☆╮Miku╰☆╮• AI Assistant';
      const descripcion = '✧ ─━⊜ POWERED BY |─━ Hanner';

      const textoMenu = `> Hola *${name}*, soy *Miku*₍ᐢ..ᐢ₎
> ¡buenas noches! Aquí tienes el
> menú de mis comandos.

: ̗̀❖ *ᴜʀʟ ::* ${link}

  *  .    .    *    .  
. ⌒ ⌒  ✿ 𖤘  ✿  ⌒ ⌒  .

⌒ 𓆩♡𓆪`;

      // 1. Reutilizar la imagen subida si no ha cambiado el enlace
      if (!cachedMedia || lastBannerUrl !== banner) {
        cachedMedia = await prepareWAMessageMedia(
          { image: { url: banner } },
          { upload: sock.waUploadToServer, mediaTypeOverride: 'thumbnail-link' }
        );
        lastBannerUrl = banner;
      }

      // 2. Enviar mensaje usando la caché
      await sock.sendMessage(from, {
        text: textoMenu.trim(),
        linkPreview: {
          'canonical-url': link,
          'matched-text': link,
          title: botname,
          description: descripcion,
          jpegThumbnail: cachedMedia?.imageMessage?.jpegThumbnail ? Buffer.from(cachedMedia.imageMessage.jpegThumbnail) : undefined,
          highQualityThumbnail: cachedMedia?.imageMessage || undefined
        },
        contextInfo: {
          mentionedJid: null,
          isForwarded: false
        }
      }, { quoted: m });

    } catch (e) {
      console.error('Error al enviar el menú:', e);
      // Si la caché falla, se limpia para el siguiente intento
      cachedMedia = null;
      await sock.sendMessage(m.key.remoteJid, { text: '❌ Ocurrió un error al cargar el menú.' }, { quoted: m });
    }
  }
};
