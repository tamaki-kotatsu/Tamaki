const WmConfig = require('../../../sistema/Modelos/Stickers/wmconfig'); // Ajusta la ruta

module.exports = {
  name: 'setuserw',
  run: async (sock, m, texto) => {
    const sender = m.key.participant || m.key.remoteJid;
    if (!texto) return sock.sendMessage(m.key.remoteJid, { text: '⚠️ _Escribe el nombre para tu marca de agua._' }, { quoted: m });

    await WmConfig.findOneAndUpdate(
      { id: sender, type: 'user' },
      { packname: texto.trim() },
      { upsert: true, new: true }
    );
    await sock.sendMessage(m.key.remoteJid, { text: `✅ _Tu marca personal es ahora: "${texto.trim()}"_` }, { quoted: m });
  }
};
