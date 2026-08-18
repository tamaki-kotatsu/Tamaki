const WmConfig = require('../../../sistema/Modelos/Stickers/wmconfig');

module.exports = {
  name: 'delgroupwm',
  alias: ['delgwm'],
  soloAdmins: true, // <-- Esto restringe el comando exclusivamente a administradores
  run: async (sock, m) => {
    const from = m.key.remoteJid;
    await WmConfig.deleteOne({ id: from, type: 'group' });
    await sock.sendMessage(from, { text: '✅ _La marca de agua de este grupo ha sido eliminada._' }, { quoted: m });
  }
};
