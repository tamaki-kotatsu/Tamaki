const Group = require('../Modelos/Stickers/sgrupo');

module.exports = {
  name: 'autosticker',
  alias: ['onstiker', 'offstiker'],
  soloAdmins: true, // Tu sistema ya bloquea esto automáticamente
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid;
    const status = texto.toLowerCase() === 'on';
    
    await Group.findOneAndUpdate(
      { groupId: from },
      { autosticker: status },
      { upsert: true, new: true }
    );
    
    await sock.sendMessage(from, { text: `✅ _Autosticker ${status ? 'activado' : 'desactivado'} en este grupo._` }, { quoted: m });
  }
};
