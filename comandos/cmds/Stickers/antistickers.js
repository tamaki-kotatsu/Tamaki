const Group = require('../../../sistema/Modelos/sgrupo');

module.exports = {
  name: 'antisticker',
  alias: ['antisticker', 'antistickers', 'nosticker'],
  description: 'Activa o desactiva la eliminación de stickers en el grupo.',
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid;

    let groupData = await Group.findOne({ groupId: from });
    if (!groupData) {
      groupData = await Group.create({ groupId: from });
    }

    const option = texto ? texto.toLowerCase().trim() : '';

    if (option === 'on' || option === '1' || option === 'activar') {
      groupData.antisticker = true;
    } else if (option === 'off' || option === '0' || option === 'desactivar') {
      groupData.antisticker = false;
    } else {
      groupData.antisticker = !groupData.antisticker; // Toggle
    }

    await groupData.save();

    const estado = groupData.antisticker ? 'ACTIVADO 🟢' : 'DESACTIVADO 🔴';
    return sock.sendMessage(from, { text: `🚫 *AntiSticker en este grupo:* ${estado}` }, { quoted: m });
  }
};
