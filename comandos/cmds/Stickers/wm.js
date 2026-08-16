const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
// Importamos tus funciones originales
const { toWebp, writeExifWebp, resolveStickerMetadata } = require('./stickers'); 

module.exports = {
  name: 'wm',
  alias: ['watermark', 'rob'],
  description: 'Procesa multimedia con marcas de agua personalizadas.',
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid;
    const sender = m.key.participant || m.key.remoteJid;

    // Detectar si estamos respondiendo a algo
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    // Detectar si el mensaje es video, imagen o sticker
    const mediaMsg = m.message?.imageMessage || m.message?.videoMessage || m.message?.stickerMessage || 
                     quoted?.imageMessage || quoted?.videoMessage || quoted?.stickerMessage;

    if (!mediaMsg) {
      return sock.sendMessage(from, { text: '🍩 _Responde a una imagen, video o sticker para aplicar la marca de agua._' }, { quoted: m });
    }

    try {
      // 1. Usar tu lógica de metadatos (prioridad usuario/grupo)
      const metadata = await resolveStickerMetadata(sender, from, texto);

      // 2. Determinar si es video o imagen/sticker
      const isVideo = !!(m.message?.videoMessage || quoted?.videoMessage);
      const isSticker = !!(m.message?.stickerMessage || quoted?.stickerMessage);
      const mediaType = isVideo ? 'video' : 'image';

      // 3. Descargar el archivo
      const stream = await downloadContentFromMessage(mediaMsg, isSticker ? 'sticker' : mediaType);
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      // 4. Convertir a webp (si no es ya sticker)
      let webpBuffer;
      if (isSticker) {
        webpBuffer = buffer;
      } else {
        // Al pasar por tu función toWebp, los videos se arreglan automáticamente con ffmpeg
        webpBuffer = await toWebp(buffer, mediaType);
      }

      // 5. Inyectar metadatos (tu función original)
      const stickerWithExif = await writeExifWebp(webpBuffer, metadata);

      // 6. Enviar
      await sock.sendMessage(from, { sticker: stickerWithExif }, { quoted: m });

    } catch (e) {
      console.error('Error en el comando wm:', e);
      await sock.sendMessage(from, { text: '❌ Ocurrió un error al procesar el archivo.' }, { quoted: m });
    }
  }
};
