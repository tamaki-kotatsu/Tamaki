const path = require('path');
const { obtenerUsuario, actualizarUsuario } = require(path.join(__dirname, 'rpg_helper'));

module.exports = {
    name: 'minar',
    alias: ['mine', 'm'],
    description: 'Mina materiales al estilo Minecraft para mejorar tu equipo.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;
        const sender = m.key.participant || m.key.remoteJid;

        const user = obtenerUsuario(sender);
        const tiempoActual = Date.now();
        const cooldownTime = 30000; // 30 segundos de cooldown

        if (tiempoActual - user.cooldown < cooldownTime) {
            const restante = Math.ceil((cooldownTime - (tiempoActual - user.cooldown)) / 1000);
            return sock.sendMessage(from, { text: `⏳ Estás cansado. Espera *${restante} segundos* para volver a la mina.` }, { quoted: m });
        }

        // Definir probabilidades y drops según el pico
        let drops = { piedra: Math.floor(Math.random() * 4) + 1, carbón: Math.floor(Math.random() * 2) };
        let conseguido = [];

        if (user.pico === 'Madera') {
            if (Math.random() > 0.7) { drops.hierro = 1; conseguido.push('⛏️ *Hierro*'); }
        } else if (user.pico === 'Piedra') {
            drops.piedra += 2;
            drops.carbón += 2;
            if (Math.random() > 0.5) { drops.hierro = Math.floor(Math.random() * 2) + 1; conseguido.push('⛏️ *Hierro*'); }
            if (Math.random() > 0.85) { drops.oro = 1; conseguido.push('✨ *Oro*'); }
        } else if (user.pico === 'Hierro' || user.pico === 'Diamante' || user.pico === 'Netherite') {
            drops.piedra += 4;
            drops.carbón += 3;
            drops.hierro = Math.floor(Math.random() * 3) + 1;
            if (Math.random() > 0.4) { drops.oro = Math.floor(Math.random() * 2) + 1; conseguido.push('✨ *Oro*'); }
            if (Math.random() > 0.8) { drops.diamante = 1; conseguido.push('💎 *Diamante*'); }
        }

        // Sumar drops al inventario
        let mensajeDrop = `⛏️ *¡Has ido a la mina!* ⛏️\n\n`;
        for (const [material, cantidad] of Object.entries(drops)) {
            if (cantidad > 0) {
                user.inventario[material] = (user.inventario[material] || 0) + cantidad;
                mensajeDrop += `• +*${cantidad}* de *${material.charAt(0).toUpperCase() + material.slice(1)}*\n`;
            }
        }

        // Sistema de XP y Nivel
        const xpGanada = Math.floor(Math.random() * 15) + 10;
        user.xp += xpGanada;
        mensajeDrop += `\n✨ +${xpGanada} XP`;

        if (user.xp >= user.nivel * 100) {
            user.nivel += 1;
            user.xp = 0;
            mensajeDrop += `\n🎉 *¡SUBISTE DE NIVEL! Ahora eres Nivel ${user.nivel}* 🎉`;
        }

        user.cooldown = tiempoActual;
        actualizarUsuario(sender, user);

        await sock.sendMessage(from, { text: mensajeDrop }, { quoted: m });
    }
};
