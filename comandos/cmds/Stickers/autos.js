const Group = require('../../../sistema/Modelos/Stickers/sgrupo'); // Tu modelo de configuración de grupo

module.exports = {
  name: 'autosticker',
  alias: ['onstiker', 'offstiker'],
  soloAdmins: true,
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid;
    const args = texto.trim().toLowerCase();
    
    // Buscar configuración actual en BD
    let config = await Group.findOne({ groupId: from });
    const estaActivo = config ? config.autosticker : false;

    // Si solo escriben el comando, mostrar estado
    if (!args) {
        return await sock.sendMessage(from, { 
            text: `📊 *Estado del Autosticker:* ${estaActivo ? '✅ Activado' : '❌ Desactivado'}` 
        }, { quoted: m });
    }

    // Cambiar estado
    const nuevoEstado = (args === 'on');
    await Group.findOneAndUpdate(
        { groupId: from },
        { autosticker: nuevoEstado },
        { upsert: true, new: true }
    );
    
    await sock.sendMessage(from, { 
        text: `✅ _Autosticker ${nuevoEstado ? 'activado' : 'desactivado'} en este grupo._` 
    }, { quoted: m });
  }
};
