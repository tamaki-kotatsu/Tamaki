const path = require('path');
const { obtenerUsuario } = require(path.join(__dirname, 'rpg_helper'));

module.exports = {
    name: 'inventario',
    alias: ['inv', 'stats'],
    description: 'Muestra tu inventario y progreso del RPG Minecraft.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;
        const sender = m.key.participant || m.key.remoteJid;

        const user = obtenerUsuario(sender);

        const info = `🎒 *INVENTARIO DE MINECRAFT* 🎒\n` +
            `👤 *Jugador:* @${sender.split('@')[0]}\n` +
            `⭐ *Nivel:* ${user.nivel} (XP: ${user.xp}/${user.nivel * 100})\n` +
            `⛏️ *Pico Equipado:* Pico de ${user.pico}\n\n` +
            `*Recursos recolectados:*\n` +
            `🪵 Madera: ${user.inventario.madera || 0}\n` +
            `🪨 Piedra: ${user.inventario.piedra || 0}\n` +
            `🪨 Carbón: ${user.inventario.carbón || 0}\n` +
            `🪙 Hierro: ${user.inventario.hierro || 0}\n` +
            `✨ Oro: ${user.inventario.oro || 0}\n` +
            `💎 Diamante: ${user.inventario.diamante || 0}\n`;

        await sock.sendMessage(from, { 
            text: info, 
            mentions: [sender] 
        }, { quoted: m });
    }
};
