const Group = require('../../Modelos/sgrupo');
const ms = require('ms');

module.exports = {
  name: 'packmarca',
  alias: ['pmarca', 'packmarca', 'setpackmarca'],
  description: 'Ajusta el nombre del paquete y descripción fija/temporal para PAQUETES de stickers.',
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid;

    if (!texto) {
      return sock.sendMessage(from, { 
        text: '📦 *Uso de Marca para Paquetes de Stickers:*\n\n' +
              '• Fija: `/packmarca Nombre del Paquete / Autor`\n' +
              '• Temporal: `/packmarca Nombre del Paquete / Autor 1h`\n' +
              '• Solo Autor/Descripción: `/packmarca Autor`\n\n' +
              '💡 _Para configurar marca de stickers individuales usa `/smarca`._' 
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

    let groupData = await Group.findOne({ groupId: from }) || new Group({ groupId: from });

    if (duration) {
      // Guardar marca TEMPORAL para paquetes
      if (newPackname) groupData.tempPackNamePack = newPackname;
      groupData.tempAuthorPack = newAuthor;
      groupData.tempExpirePack = new Date(Date.now() + duration);
      await groupData.save();

      return sock.sendMessage(from, { 
        text: `⏳ *Marca Temporal Guardada para Paquetes (${lastArg}):*\n\n` +
              `📦 *Pack Paquete:* ${newPackname || groupData.packNamePack}\n` +
              `✍️ *Autor Paquete:* ${newAuthor}` 
      }, { quoted: m });
    } else {
      // Guardar marca FIJA para paquetes
      if (newPackname) groupData.packNamePack = newPackname;
      groupData.authorPack = newAuthor;
      groupData.tempPackNamePack = null;
      groupData.tempAuthorPack = null;
      groupData.tempExpirePack = null;
      await groupData.save();

      return sock.sendMessage(from, { 
        text: `✅ *Marca Fija Actualizada para Paquetes:*\n\n` +
              `📦 *Pack Paquete:* ${groupData.packNamePack}\n` +
              `✍️ *Autor Paquete:* ${groupData.authorPack}` 
      }, { quoted: m });
    }
  }
};
