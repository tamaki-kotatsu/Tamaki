const path = require('path');
const { obtenerUsuario, actualizarUsuario } = require(path.join(__dirname, 'rpg_helper'));

// Recetas de crafteo para los picos
const recetas = {
    'pico de piedra': { 
        requiere: { madera: 3, piedra: 3 }, 
        mejoraA: 'Piedra',
        anterior: 'Madera'
    },
    'pico de hierro': { 
        requiere: { madera: 3, hierro: 5 }, 
        mejoraA: 'Hierro',
        anterior: 'Piedra'
    },
    'pico de diamante': { 
        requiere: { madera: 3, diamante: 5 }, 
        mejoraA: 'Diamante',
        anterior: 'Hierro'
    }
};

module.exports = {
    name: 'craftear',
    alias: ['craft'],
    description: 'Craftea mejores herramientas para la minería.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;
        const sender = m.key.participant || m.key.remoteJid;
        const user = obtenerUsuario(sender);

        if (!texto) {
            let menuCraft = `🛠️ *MESA DE CRAFTEO* 🛠️\n\n` +
                `Escribe */craftear [item]* para fabricar uno:\n\n` +
                `• *pico de piedra* (Pico actual: ${user.pico})\n` +
                `  Coste: 🪵 3 Madera, 🪨 3 Piedra\n\n` +
                `• *pico de hierro* (Pico actual: ${user.pico})\n` +
                `  Coste: 🪵 3 Madera, 🪙 5 Hierro\n\n` +
                `• *pico de diamante* (Pico actual: ${user.pico})\n` +
                `  Coste: 🪵 3 Madera, 💎 5 Diamante\n`;
            return sock.sendMessage(from, { text: menuCraft }, { quoted: m });
        }

        const itemALower = texto.toLowerCase().trim();
        const receta = recetas[itemALower];

        if (!receta) {
            return sock.sendMessage(from, { text: `❌ El objeto *"${texto}"* no existe o no se puede craftear.` }, { quoted: m });
        }

        // Comprobar orden de progresión del pico
        if (user.pico !== receta.anterior && user.pico !== receta.mejoraA) {
            return sock.sendMessage(from, { text: `⚠️ Necesitas tener equipado un *Pico de ${receta.anterior}* antes de fabricar uno de *${receta.mejoraA}*.` }, { quoted: m });
        }

        if (user.pico === receta.mejoraA) {
            return sock.sendMessage(from, { text: `❌ Ya posees un *Pico de ${receta.mejoraA}*.` }, { quoted: m });
        }

        // Comprobar si tiene suficientes materiales
        for (const [material, cantidad] of Object.entries(receta.requiere)) {
            if ((user.inventario[material] || 0) < cantidad) {
                return sock.sendMessage(from, { text: `❌ No tienes suficientes materiales. Te falta *${material}* (Requieres ${cantidad}).` }, { quoted: m });
            }
        }

        // Descontar materiales
        for (const [material, cantidad] of Object.entries(receta.requiere)) {
            user.inventario[material] -= cantidad;
        }

        // Actualizar pico
        user.pico = receta.mejoraA;
        actualizarUsuario(sender, user);

        await sock.sendMessage(from, { text: `🎉 ¡Enhorabuena! Has fabricado un *🛠️ Pico de ${receta.mejoraA}* exitosamente.` }, { quoted: m });
    }
};
