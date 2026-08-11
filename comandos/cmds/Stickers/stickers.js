const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');
const Crypto = require('crypto');
const ff = require('fluent-ffmpeg');
const webp = require('node-webpmux');
const Group = require('../../../sistema/Modelos/Stickers/sgrupo');
const User = require('../../../Modelos/susers');

async function toWebp(media, type) {
  const tmpIn = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.${type === 'image' ? 'jpg' : 'mp4'}`);
  const tmpOut = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
  
  fs.writeFileSync(tmpIn, media);
  
  await new Promise((resolve, reject) => {
    ff(tmpIn)
      .on('error', (err) => {
        if (fs.existsSync(tmpIn)) fs.unlinkSync(tmpIn);
        reject(err);
      })
      .on('end', () => resolve(true))
      .addOutputOptions(
        type === 'video'
          ? [
              '-vcodec', 'libwebp',
              '-vf', 'scale=320:320:force_original_aspect_ratio=increase,crop=320:320,fps=15',
              '-loop', '0', '-ss', '00:00:00', '-t', '00:00:15', '-preset', 'default', '-an', '-vsync', '0'
            ]
          : [
              '-vcodec', 'libwebp',
              '-vf', 'scale=320:320:force_original_aspect_ratio=increase,crop=320:320'
            ]
      )
      .toFormat('webp')
      .save(tmpOut);
  });

  const buffer = fs.readFileSync(tmpOut);
  if (fs.existsSync(tmpIn)) fs.unlinkSync(tmpIn);
  if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
  return buffer;
}

async function writeExifWebp(buffer, metadata) {
  const tmpIn = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
  const tmpOut = path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
  
  fs.writeFileSync(tmpIn, buffer);
  
  if (metadata.packname || metadata.author) {
    const img = new webp.Image();
    const json = {
      'sticker-pack-id': `Lurus-Bot-${Crypto.randomBytes(4).toString('hex')}`,
      'sticker-pack-name': metadata.packname || '',
      'sticker-pack-publisher': metadata.author || '',
      'emojis': metadata.categories || ['🍧']
    };
    const exifAttr = Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
    const jsonBuff = Buffer.from(JSON.stringify(json), 'utf-8');
    const exif = Buffer.concat([exifAttr, jsonBuff]);
    exif.writeUIntLE(jsonBuff.length, 14, 4);
    
    await img.load(tmpIn);
    if (fs.existsSync(tmpIn)) fs.unlinkSync(tmpIn);
    img.exif = exif;
    await img.save(tmpOut);
    
    const result = fs.readFileSync(tmpOut);
    if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
    return result;
  }
  
  if (fs.existsSync(tmpIn)) fs.unlinkSync(tmpIn);
  return buffer;
}

// Función para obtener marcas resolviendo prioridad: Usuario > Grupo
async function resolveStickerMetadata(senderId, groupId, customText = '') {
  let packname = 'Proyecto1 Bot Pack';
  let author = '@hannerjhossue';

  // 1. Obtener datos del grupo
  const groupData = await Group.findOne({ groupId });
  if (groupData) {
    if (groupData.tempExpire && groupData.tempExpire > new Date()) {
      if (groupData.tempPackname) packname = groupData.tempPackname;
      if (groupData.tempAuthor) author = groupData.tempAuthor;
    } else {
      if (groupData.packname) packname = groupData.packname;
      if (groupData.author) author = groupData.author;
    }
  }

  // 2. Prioridad Personal del Usuario
  const userData = await User.findOne({ userId: senderId });
  if (userData) {
    if (userData.tempExpire && userData.tempExpire > new Date()) {
      if (userData.tempPackname) packname = userData.tempPackname;
      if (userData.tempAuthor) author = userData.tempAuthor;
    } else if (userData.author || userData.packname) {
      if (userData.packname) packname = userData.packname;
      if (userData.author) author = userData.author;
    }
  }

  // 3. Texto escrito directo en el comando (/s Mi Marca)
  if (customText && customText.trim().length > 0) {
    const input = customText.trim();
    if (input.includes('/')) {
      const parts = input.split('/');
      packname = parts[0].trim();
      author = parts.slice(1).join('/').trim();
    } else {
      author = input;
    }
  }

  return { packname, author };
}

module.exports = {
  name: 'sticker',
  alias: ['s', 'sticker'],
  description: 'Crea stickers con prioridad de marcas (Personal > Grupo).',
  toWebp,
  writeExifWebp,
  resolveStickerMetadata,
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid;
    const sender = m.key.participant || m.key.remoteJid;

    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const imageMsg = m.message?.imageMessage || m.message?.videoMessage || quoted?.imageMessage || quoted?.videoMessage;

    if (!imageMsg) {
      return sock.sendMessage(from, { text: '🍩 _Por favor, responde a una imagen o video para crear el sticker._' }, { quoted: m });
    }

    try {
      const metadata = await resolveStickerMetadata(sender, from, texto);

      const isVideo = !!(m.message?.videoMessage || quoted?.videoMessage);
      const mediaType = isVideo ? 'video' : 'image';

      const stream = await downloadContentFromMessage(imageMsg, mediaType);
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      const webpBuffer = await toWebp(buffer, mediaType);
      const stickerWithExif = await writeExifWebp(webpBuffer, metadata);

      await sock.sendMessage(from, { sticker: stickerWithExif }, { quoted: m });

    } catch (e) {
      console.error('Error en el comando sticker:', e);
      await sock.sendMessage(from, { text: '❌ Ocurrió un error al procesar el sticker.' }, { quoted: m });
    }
  }
};
