const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { toWebp, writeExifWebp } = require('./stickers'); // Asegúrate de que apunte a tu sticker.js
const Group = require('../../../sistema/Modelos/Stickers/sgrupo');

module.exports = {
  name: 'autosticker',
  description: 'Activa o desactiva el autosticker en el grupo',
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid;
    // Verificación simple de admin (puedes ajustar según cómo verifiques admins en tu bot)
    const groupMetadata = await sock.groupMetadata(from);
    const participants = groupMetadata.participants;
    const isAdmins = participants.find(p => p.id === m.key.participant)?.admin !== null;

    if (!isAdmins) return sock.sendMessage(from, { text: '⚠️ _Solo administradores pueden activar/desactivar esto._' }, { quoted: m });

    const status = texto.toLowerCase() === 'on';
    await Group.findOneAndUpdate(
      { groupId: from },
      { autosticker: status },
      { upsert: true, new: true }
    );
    
    await sock.sendMessage(from, { text: `✅ _Autosticker ${status ? 'activado' : 'desactivado'}_` }, { quoted: m });
  }
};

// --- LÓGICA QUE VA EN EL ARCHIVO PRINCIPAL DE MENSAJES (handler principal) ---
// Para que el bot convierta automáticamente, debes agregar este listener en tu archivo que recibe mensajes
/*
  if (m.isGroup && db.data.chats[m.chat]?.autosticker) {
    const mime = (m.message?.imageMessage || m.message?.videoMessage)?.mimetype || '';
    if (/image|video/.test(mime)) {
      const buffer = await downloadContentFromMessage(m.message.imageMessage || m.message.videoMessage, /image/.test(mime) ? 'image' : 'video');
      const webp = await toWebp(buffer, /image/.test(mime) ? 'image' : 'video');
      const sticker = await writeExifWebp(webp, { packname: 'AutoSticker', author: '' });
      await sock.sendMessage(m.key.remoteJid, { sticker });
    }
  }
*/
