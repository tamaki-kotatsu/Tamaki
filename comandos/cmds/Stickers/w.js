const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
// Importamos solo las funciones de conversión y escritura
const { toWebp, writeExifWebp } = require('./stickers'); 

module.exports = {
  name: 'w',
  alias: ['watermark', 'robs'],
  description: 'Procesa multimedia con texto simple, sin usar marcas de grupo/usuario.',
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid;

    // Detectar si estamos respondiendo a algo o si el mensaje mismo tiene el media
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const mediaMsg = m.message?.imageMessage || m.message?.videoMessage || m.message?.stickerMessage || 
                     quoted?.imageMessage || quoted?.videoMessage || quoted?.stickerMessage;

    if (!mediaMsg) {
      return sock.sendMessage(from, { text: '🍩 _Por favor, responde a una imagen, video o sticker._' }, { quoted: m });
    }

    if (!texto) {
      return sock.sendMessage(from, { text: '⚠️ _Escribe el texto que quieres ponerle al sticker._' }, { quoted: m });
    }

    try {
      // Determinar tipo de medio
      const isVideo = !!(m.message?.videoMessage || quoted?.videoMessage);
      const isSticker = !!(m.message?.stickerMessage || quoted?.stickerMessage);
      const mediaType = isVideo ? 'video' : 'image';

      // Descargar
      const stream = await downloadContentFromMessage(mediaMsg, isSticker ? 'sticker' : mediaType);
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      // Convertir (si no es sticker)
      let webpBuffer;
      if (isSticker) {
        webpBuffer = buffer;
      } else {
        webpBuffer = await toWebp(buffer, mediaType);
      }

      // AQUÍ ESTÁ EL CAMBIO: Usamos el texto del comando directo, ignorando BD
      const metadata = {
        packname: texto.trim(),
        author: '' // Dejamos el autor vacío o puedes poner lo que quieras
      };

      const stickerWithExif = await writeExifWebp(webpBuffer, metadata);

      await sock.sendMessage(from, { sticker: stickerWithExif }, { quoted: m });

    } catch (e) {
      console.error('Error en wm.js:', e);
      await sock.sendMessage(from, { text: '❌ Ocurrió un error al procesar el archivo.' }, { quoted: m });
    }
  }
};
