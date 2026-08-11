module.exports = {
    name: 'comunidad-info',
    alias: ['comunidad'],
    description: 'Muestra los detalles de la comunidad.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;

        if (!from.endsWith('@g.us')) {
            return sock.sendMessage(from, { text: '🏽 _Este comando solo funciona dentro de una comunidad._' });
        }

        try {
            const metadata = await sock.groupMetadata(from);
            const creador = metadata.owner ? `@${metadata.owner.split('@')[0]}` : 'No disponible';
            const fechaCreacion = new Date(metadata.creation * 1000).toLocaleDateString('es-ES');

            let info = `🏰 *Información de la Comunidad*\n\n`;
            info += `📌 *Nombre:* ${metadata.subject}\n`;
            info += `🆔 *ID Jid:* ${metadata.id}\n`;
            info += `👑 *Creador:* ${creador}\n`;
            info += `📅 *Creada el:* ${fechaCreacion}\n`;
            info += `👥 *Miembros:* ${metadata.participants.length}\n`;

            await sock.sendMessage(from, { 
                text: info, 
                mentions: metadata.owner ? [metadata.owner] : [] 
            }, { quoted: m });
        } catch (e) {
            console.log(e);
            await sock.sendMessage(from, { text: '❌ Ocurrió un error al obtener la información de la comunidad.' }, { quoted: m });
        }
    }
};
