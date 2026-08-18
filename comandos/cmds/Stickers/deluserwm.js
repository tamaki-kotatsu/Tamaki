const WmConfig = require('../../../sistema/Modelos/Stickers/wmconfig');

module.exports = {
  name: 'deluserwm',
  description: 'Elimina tu marca de agua personal.',
  run: async (sock, m) => {
    const sender = m.key.participant || m.key.remoteJid;
    await WmConfig.deleteOne({ id: sender, type: 'user' });
    await sock.sendMessage(m.key.remoteJid, { text: '✅ _Tu marca de agua personal ha sido eliminada._' }, { quoted: m });
  }
};
