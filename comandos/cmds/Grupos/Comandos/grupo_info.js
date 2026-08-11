module.exports = {
    name: 'infogrupo',
    alias: ['grupoinfo', 'info'],
    description: 'Muestra información general del grupo.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;

        if (!from.endsWith('@g.us')) {
            return sock.sendMessage(from, { text: '🏽 _Este comando solo funciona en grupos._' });
        }

        try {
            const metadata = await sock.groupMetadata(from);
            const creador = metadata.owner ? `@${metadata.owner.split('@')[0]}` : 'No disponible';
            const fechaCreacion = new Date(metadata.creation * 1000).toLocaleDateString('es-ES');

            let info = `📝 *Información del Grupo*\n\n`;
            info += `📌 *Nombre:* ${metadata.subject}\n`;
            info += `🆔 *ID:* ${metadata.id}\n`;
            info += `👑 *Creador:* ${creador}\n`;
            info += `📅 *Creado el:* ${fechaCreacion}\n`;
            info += `👥 *Participantes:* ${metadata.participants.length}\n`;

            await sock.sendMessage(from, { 
                text: info, 
                mentions: metadata.owner ? [metadata.owner] : [] 
            }, { quoted: m });

        } catch (e) {
            console.log(e);
            await sock.sendMessage(from, { text: '❌ Ocurrió un error al obtener la información del grupo.' });
        }
    }
};
