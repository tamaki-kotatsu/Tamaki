module.exports = {
    name: 'grupo',
    alias: ['group'],
    description: 'Muestra la información o la foto de perfil del grupo actual.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;

        if (!from.endsWith('@g.us')) {
            return sock.sendMessage(from, { text: '🏽 _Este comando solo funciona dentro de un grupo._' });
        }

        const argumento = texto.toLowerCase().trim();

        try {
            const metadata = await sock.groupMetadata(from);

            // Si el usuario escribe: /grupo icon, /grupo pfp, etc.
            if (['icon', 'pfp', 'perfil', 'imagen'].includes(argumento)) {
                try {
                    const pfpUrl = await sock.profilePictureUrl(from, 'image');
                    return await sock.sendMessage(from, { 
                        image: { url: pfpUrl }, 
                        caption: `📸 *Icono del grupo:* _${metadata.subject}_` 
                    }, { quoted: m });
                } catch {
                    return await sock.sendMessage(from, { text: '❌ *Este grupo no tiene una foto de perfil configurada.*' }, { quoted: m });
                }
            }

            // Si solo escribe /grupo (o /grupo info) manda la información limpia
            const creador = metadata.owner ? `@${metadata.owner.split('@')[0]}` : 'No disponible';
            const fechaCreacion = new Date(metadata.creation * 1000).toLocaleDateString('es-ES');

            let info = `👥 *Información del Grupo*\n\n`;
            info += `📌 *Nombre:* ${metadata.subject}\n`;
            info += `👑 *Creador:* ${creador}\n`;
            info += `📅 *Creado el:* ${fechaCreacion}\n`;
            info += `👥 *Miembros actuales:* ${metadata.participants.length}\n`;

            await sock.sendMessage(from, { 
                text: info, 
                mentions: metadata.owner ? [metadata.owner] : [] 
            }, { quoted: m });

        } catch (e) {
            console.log(e);
            await sock.sendMessage(from, { text: '❌ Ocurrió un error al procesar el comando del grupo.' }, { quoted: m });
        }
    }
};
