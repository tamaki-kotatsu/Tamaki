const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const Group = require('../../../sistema/Modelos/Stickers/sgrupo');
const User = require('../../../sistema/Modelos/Stickers/susers');
const { toWebp, writeExifWebp, resolveStickerMetadata } = require('./stickers');

module.exports = {
  name: 'pack',
  alias: ['spack', 'paquete', 'packsticker'],
  description: 'Crea un paquete de stickers con todas las imágenes enviadas o respondidas.',
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid;
    const sender = m.key.participant || m.key.remoteJid;

    // 1. Obtener datos de la Marca (Personal > Grupo)
    let { packname, author } = await resolveStickerMetadata(sender, from, texto);

    const userData = await User.findOne({ userId: sender });
    const groupData = await Group.findOne({ groupId: from });

    if (userData && (userData.packNamePack || userData.authorPack)) {
      packname = userData.packNamePack || packname;
      author = userData.authorPack || author;
    } else if (groupData && (groupData.packNamePack || groupData.authorPack)) {
      packname = groupData.packNamePack || groupData.authorPack;
      author = groupData.authorPack || author;
    }

    // 2. BUSCADOR INTELIGENTE DE IMÁGENES
    let mediaMessages = [];

    // Comprobar si el mensaje actual o el mensaje citado tiene imagen/video
    const msg = m.message;
    const quoted = msg?.extendedTextMessage?.contextInfo?.quotedMessage;
    const quotedParticipant = msg?.extendedTextMessage?.contextInfo?.participant;

    // Si respondió a un mensaje
    if (quoted) {
      // Si citó una sola imagen
      if (quoted.imageMessage) mediaMessages.push({ msg: quoted.imageMessage, type: 'image' });
      if (quoted.videoMessage) mediaMessages.push({ msg: quoted.videoMessage, type: 'video' });

      // Si citó parte de un ÁLBUM, buscamos en el historial global los mensajes del mismo usuario enviados al mismo tiempo
      if (global.historialMensajes && global.historialMensajes[from]) {
        const historial = global.historialMensajes[from];
        const timestampCitado = m.message?.extendedTextMessage?.contextInfo?.stanzaId;

        historial.forEach(h => {
          const hSender = h.key.participant || h.key.remoteJid;
          const hMsg = h.message;
          
          // Buscar mensajes multimedia del mismo emisor
          if (hSender === quotedParticipant && (hMsg?.imageMessage || hMsg?.videoMessage)) {
            if (hMsg.imageMessage) mediaMessages.push({ msg: hMsg.imageMessage, type: 'image' });
            if (hMsg.videoMessage) mediaMessages.push({ msg: hMsg.videoMessage, type: 'video' });
          }
        });
      }
    } else {
      // Si el comando fue enviado directamente con la imagen
      if (msg?.imageMessage) mediaMessages.push({ msg: msg.imageMessage, type: 'image' });
      if (msg?.videoMessage) mediaMessages.push({ msg: msg.videoMessage, type: 'video' });
    }

    // Eliminar duplicados en la lista de imágenes recopiladas
    mediaMessages = mediaMessages.filter((v, i, a) => 
      a.findIndex(t => (t.msg.url === v.msg.url || t.msg.fileSha256?.toString('hex') === v.msg.fileSha256?.toString('hex'))) === i
    );

    if (mediaMessages.length === 0) {
      return sock.sendMessage(from, { 
        text: '📦 _Debes responder a un grupo/álbum de imágenes o enviar imágenes junto con el comando._' 
      }, { quoted: m });
    }

    // 3. Emoji de confirmación de inicio ⏳
    try {
      await sock.sendMessage(from, { react: { text: '⏳', key: m.key } });
    } catch (e) {}

    // 4. Transformar y enviar cada sticker
    let creados = 0;

    for (const item of mediaMessages) {
      try {
        const stream = await downloadContentFromMessage(item.msg, item.type);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }

        const webpBuffer = await toWebp(buffer, item.type);
        const stickerWithExif = await writeExifWebp(webpBuffer, { packname, author });

        // Enviar el sticker a la conversación
        await sock.sendMessage(from, { sticker: stickerWithExif });
        creados++;

        // Pequeña espera entre envíos para no saturar la conexión
        await new Promise(res => setTimeout(res, 600));

      } catch (err) {
        console.error('Error convirtiendo imagen:', err);
      }
    }

    // 5. Reacción final ✅ y reporte
    try {
      await sock.sendMessage(from, { react: { text: '✅', key: m.key } });
    } catch (e) {}

    return sock.sendMessage(from, { 
      text: `🎉 *¡Paquete generado con éxito!*\n\n` +
            `📦 *Nombre:* ${packname}\n` +
            `✍️ *Autor:* ${author}\n` +
            `🖼️ *Stickers creados:* ${creados}/${mediaMessages.length}\n\n` +
            `💡 _WhatsApp agrupará estos stickers en tu galería al añadirlos a favoritos._` 
    }, { quoted: m });
  }
};
