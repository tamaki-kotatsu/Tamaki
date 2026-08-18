const WmConfig = require('../../../sistema/Modelos/Stickers/wmconfig'); // Ajusta la ruta

module.exports = {
  name: 'setgroupwm',
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid;
    if (!texto) return sock.sendMessage(from, { text: '⚠️ _Escribe el nombre para la marca del grupo._' }, { quoted: m });

    await WmConfig.findOneAndUpdate(
      { id: from, type: 'group' },
      { packname: texto.trim() },
      { upsert: true, new: true }
    );
    await sock.sendMessage(from, { text: `✅ _Marca del grupo establecida a: "${texto.trim()}"_` }, { quoted: m });
  }
};
