module.exports = {
    name: 'admins',
    alias: ['administradores', 'staff'],
    description: 'Muestra la lista de administradores del grupo.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;

        if (!from.endsWith('@g.us')) {
            return sock.sendMessage(from, { text: '🏽 _Este comando solo funciona en grupos._' });
        }

        try {
            const metadata = await sock.groupMetadata(from);
            const admins = metadata.participants.filter(p => p.admin !== null);
            
            let lista = `🛡️ *Administradores de: ${metadata.subject}*\n\n`;

            admins.forEach((admin, index) => {
                const numero = admin.id.split('@')[0];
                const rango = admin.admin === 'superadmin' ? 'Creador 👑' : 'Admin ⚙️';
                lista += `${index + 1}. @${numero} - *${rango}*\n`;
            });

            await sock.sendMessage(from, { 
                text: lista, 
                mentions: admins.map(a => a.id) 
            }, { quoted: m });

        } catch (e) {
            console.log(e);
            await sock.sendMessage(from, { text: '❌ Ocurrió un error al obtener la lista de administradores.' });
        }
    }
};
