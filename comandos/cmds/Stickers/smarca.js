const Group = require('../../../sistema/Modelos/Stickers/sgrupo');
const ms = require('ms');

module.exports = {
  name: 'smarca',
  alias: ['smarca', 'setmarca'],
  description: 'Ajusta el nombre del paquete y descripción fija/temporal para stickers individuales (/s).',
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid;

    if (!texto) {
      return sock.sendMessage(from, { 
        text: '⚠️ *Uso de Marca para Stickers Individuales:*\n\n' +
              '• Fija: `/smarca Nombre del Pack / Autor`\n' +
              '• Temporal: `/smarca Nombre del Pack / Autor 1h`\n' +
              '• Solo Autor/Descripción: `/smarca Mi Descripción`\n\n' +
              '💡 _Para configurar marca de paquetes usa `/packmarca`._' 
      }, { quoted: m });
    }

    const args = texto.split(' ');
    const lastArg = args[args.length - 1];
    const duration = ms(lastArg); // Revisa si el último parámetro es tiempo (10m, 1h, etc.)

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

    let groupData = await Group.findOne({ groupId: from }) || new Group({ groupId: from });

    if (duration) {
      // Guardar marca TEMPORAL para stickers
      if (newPackname) groupData.tempPackname = newPackname;
      groupData.tempAuthor = newAuthor;
      groupData.tempExpire = new Date(Date.now() + duration);
      await groupData.save();

      return sock.sendMessage(from, { 
        text: `⏳ *Marca Temporal Guardada para Stickers (${lastArg}):*\n\n` +
              `📦 *Pack:* ${newPackname || groupData.packname}\n` +
              `✍️ *Autor:* ${newAuthor}` 
      }, { quoted: m });
    } else {
      // Guardar marca FIJA para stickers
      if (newPackname) groupData.packname = newPackname;
      groupData.author = newAuthor;
      groupData.tempPackname = null;
      groupData.tempAuthor = null;
      groupData.tempExpire = null;
      await groupData.save();

      return sock.sendMessage(from, { 
        text: `✅ *Marca Fija Actualizada para Stickers:*\n\n` +
              `📦 *Pack:* ${groupData.packname}\n` +
              `✍️ *Autor:* ${groupData.author}` 
      }, { quoted: m });
    }
  }
};
