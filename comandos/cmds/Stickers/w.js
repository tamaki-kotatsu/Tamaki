const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { toWebp, writeExifWebp } = require('./stickers');
const WmConfig = require('../../../sistema/Modelos/Stickers/wmconfig');

module.exports = {
  name: 'wm',
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid;
    const sender = m.key.participant || m.key.remoteJid;
    
    let packName = texto ? texto.trim() : null;

    // Si no hay texto, buscamos en el modelo nuevo
    if (!packName) {
      const user = await WmConfig.findOne({ id: sender, type: 'user' });
      const group = await WmConfig.findOne({ id: from, type: 'group' });
      packName = user?.packname || group?.packname || 'Mi Marca WM';
    }

    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const mediaMsg = m.message?.imageMessage || m.message?.videoMessage || m.message?.stickerMessage || 
                     quoted?.imageMessage || quoted?.videoMessage || quoted?.stickerMessage;

    if (!mediaMsg) return sock.sendMessage(from, { text: '🍩 _Responde a una imagen, video o sticker._' }, { quoted: m });

    try {
      const isVideo = !!(m.message?.videoMessage || quoted?.videoMessage);
      const isSticker = !!(m.message?.stickerMessage || quoted?.stickerMessage);
      const mediaType = isVideo ? 'video' : 'image';

      const stream = await downloadContentFromMessage(mediaMsg, isSticker ? 'sticker' : mediaType);
      let buffer = Buffer.from([]);
      for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

      const webpBuffer = isSticker ? buffer : await toWebp(buffer, mediaType);
      
      const stickerWithExif = await writeExifWebp(webpBuffer, { packname: packName, author: '' });
      await sock.sendMessage(from, { sticker: stickerWithExif }, { quoted: m });
    } catch (e) {
      await sock.sendMessage(from, { text: '❌ Error al procesar.' }, { quoted: m });
    }
  }
};
