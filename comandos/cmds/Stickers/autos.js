const Group = require('../../../sistema/Modelos/Stickers/sgrupo');

module.exports = {
  name: 'autosticker',
  alias: ['autosticker', 'autos'],
  description: 'Activa o desactiva la conversión automática de imágenes/videos a stickers en el grupo.',
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid;

    let groupData = await Group.findOne({ groupId: from });
    if (!groupData) {
      groupData = await Group.create({ groupId: from });
    }

    // Si el usuario especifica "on" u "off", asignamos directamente. De lo contrario, hace toggle (switch)
    const option = texto ? texto.toLowerCase().trim() : '';

    if (option === 'on' || option === '1' || option === 'activar') {
      groupData.autosticker = true;
    } else if (option === 'off' || option === '0' || option === 'desactivar') {
      groupData.autosticker = false;
    } else {
      groupData.autosticker = !groupData.autosticker; // Invierte el estado actual
    }

    await groupData.save();

    const estado = groupData.autosticker ? 'ACTIVADO 🟢' : 'DESACTIVADO 🔴';
    return sock.sendMessage(from, { text: `✨ *Autosticker en este grupo:* ${estado}` }, { quoted: m });
  }
};
