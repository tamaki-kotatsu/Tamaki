const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../database.json');

function readDB() {
    if (!fs.existsSync(dbPath)) {
        fs.writeFileSync(dbPath, JSON.stringify({ owners: {}, config: {} }, null, 2));
    }
    return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
}

module.exports = {
    name: 'ownermenu',
    alias: ['tiendaowner', 'distintivos', 'panelowner'],
    description: 'Menú exclusivo de personalización y distintivos para Owners.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;
        const sender = m.key.participant || m.key.remoteJid;
        
        // Cargar datos del usuario
        const db = readDB();
        const infoUser = db.owners[sender] || { emoji: 'Ninguno', activo: false };
        const estadoReac = infoUser.activo ? `Activo (${infoUser.emoji})` : 'Inactivo ❌';

        // Estructura visual del Menú
        let menuText = `👑 *PANEL DE CONTROL & DISTINTIVOS* 👑\n`;
        menuText += `*Owner:* @${sender.split('@')[0]}\n`;
        menuText += `*Reacción Distintiva:* ${estadoReac}\n`;
        menuText += `-------------------------------------------\n\n`;
        
        menuText += `🔮 *TIENDA DE DISTINTIVOS (EXCLUSIVA)*\n`;
        menuText += `Modifica tu presencia en los chats usando los comandos de abajo:\n\n`;
        
        menuText += `• 🦇 *Estilo Murciélago (Predeterminado)*\n`;
        menuText += `  └ _Comando:_ \`/setreac 🦇\`\n\n`;
        
        menuText += `• 🔥 *Estilo Infierno*\n`;
        menuText += `  └ _Comando:_ \`/setreac 🔥\`\n\n`;
        
        menuText += `• 👑 *Estilo Corona Real*\n`;
        menuText += `  └ _Comando:_ \`/setreac 👑\`\n\n`;

        menuText += `⚡ *AJUSTES RÁPIDOS:*\n`;
        menuText += `• Desactivar reacción: \`/reacoff\`\n`;
        menuText += `• Cambiar a cualquier emoji: \`/setreac <emoji_cualquiera>\`\n\n`;
        
        menuText += `_Nota: Tus configuraciones se guardan permanentemente en la base de datos del Bot._`;

        // Enviar el menú mencionando al Owner
        await sock.sendMessage(from, {
            text: menuText,
            mentions: [sender]
        }, { quoted: m });
    }
};
