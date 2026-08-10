const User = require('../../Modelos/susers');
const ms = require('ms');

module.exports = {
  name: 'usmarca',
  alias: ['usmarca', 'usersmarca', 'mimarca'],
  description: 'Ajusta tu nombre de paquete y descripción personal (fija o temporal) para stickers (/s).',
  run: async (sock, m, texto) => {
    const sender = m.key.participant || m.key.remoteJid;

    if (!texto) {
      return sock.sendMessage(m.key.remoteJid, { 
        text: '👤 *Marca Personal para Stickers:* \n\n' +
              '• Fija: `/usmarca Nombre / Autor`\n' +
              '• Temporal: `/usmarca Nombre / Autor 1h`\n' +
              '• Solo Autor: `/usmarca Mi Descripción`\n\n' +
              '💡 _Para tu marca personal de paquetes usa `/upackmarca`._' 
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
      if (newPackname) userData.tempPackname = newPackname;
      userData.tempAuthor = newAuthor;
      userData.tempExpire = new Date(Date.now() + duration);
      await userData.save();

      return sock.sendMessage(m.key.remoteJid, { 
        text: `⏳ *Marca Personal Temporal Guardada (${lastArg}):*\n\n` +
              `📦 *Pack:* ${newPackname || userData.packname}\n` +
              `✍️ *Autor:* ${newAuthor}` 
      }, { quoted: m });
    } else {
      if (newPackname) userData.packname = newPackname;
      userData.author = newAuthor;
      userData.tempPackname = null;
      userData.tempAuthor = null;
      userData.tempExpire = null;
      await userData.save();

      return sock.sendMessage(m.key.remoteJid, { 
        text: `✅ *Marca Personal Fija Actualizada:*\n\n` +
              `📦 *Pack:* ${userData.packname}\n` +
              `✍️ *Autor:* ${userData.author}` 
      }, { quoted: m });
    }
  }
};
