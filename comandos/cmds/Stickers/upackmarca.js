const User = require('../../../sistema/Modelos/Stickers/susers');
const ms = require('ms');

module.exports = {
  name: 'upackmarca',
  alias: ['upackmarca', 'upmarca', 'mipackmarca'],
  description: 'Ajusta tu marca personal (fija o temporal) para tus PAQUETES de stickers.',
  run: async (sock, m, texto) => {
    const sender = m.key.participant || m.key.remoteJid;

    if (!texto) {
      return sock.sendMessage(m.key.remoteJid, { 
        text: '📦👤 *Marca Personal para Paquetes:*\n\n' +
              '• Fija: `/upackmarca Nombre / Autor`\n' +
              '• Temporal: `/upackmarca Nombre / Autor 1h`\n' +
              '• Solo Autor: `/upackmarca Mi Descripción`\n\n' +
              '💡 _Para tu marca de stickers individuales usa `/usmarca`._' 
      }, { quoted: m });
    }

    const args = texto.split(' ');
    const lastArg = args[args.length - 1];
    const duration = ms(lastArg);

    let cleanText = texto;
    if (duration) {
      cleanText = args.slice(0, -1).join(' ');
    }

    let newPackname = null;
    let newAuthor = cleanText;

    if (cleanText.includes('/')) {
      const parts = cleanText.split('/');
      newPackname = parts[0].trim();
      newAuthor = parts.slice(1).join('/').trim();
    }

    let userData = await User.findOne({ userId: sender }) || new User({ userId: sender });

    if (duration) {
      if (newPackname) userData.tempPackNamePack = newPackname;
      userData.tempAuthorPack = newAuthor;
      userData.tempExpirePack = new Date(Date.now() + duration);
      await userData.save();

      return sock.sendMessage(m.key.remoteJid, { 
        text: `⏳ *Marca Personal Temporal para Paquetes (${lastArg}):*\n\n` +
              `📦 *Pack:* ${newPackname || userData.packNamePack}\n` +
              `✍️ *Autor:* ${newAuthor}` 
      }, { quoted: m });
    } else {
      if (newPackname) userData.packNamePack = newPackname;
      userData.authorPack = newAuthor;
      userData.tempPackNamePack = null;
      userData.tempAuthorPack = null;
      userData.tempExpirePack = null;
      await userData.save();

      return sock.sendMessage(m.key.remoteJid, { 
        text: `✅ *Marca Personal Fija para Paquetes Actualizada:*\n\n` +
              `📦 *Pack:* ${userData.packNamePack}\n` +
              `✍️ *Autor:* ${userData.authorPack}` 
      }, { quoted: m });
    }
  }
};
