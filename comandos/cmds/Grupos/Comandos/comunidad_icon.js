module.exports = {
    name: 'comunidad',
    alias: ['community'],
    description: 'Muestra la información o la foto de perfil de la comunidad vinculada.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;

        if (!from.endsWith('@g.us')) {
            return sock.sendMessage(from, { text: '🏽 _Este comando solo funciona dentro de un grupo o comunidad._' });
        }

        const argumento = texto.toLowerCase().trim();

        try {
            const metadata = await sock.groupMetadata(from);
            
            // Buscamos el ID real de la comunidad (linkedParentJid)
            const comunidadJid = metadata.linkedParentJid;

            if (!comunidadJid) {
                return sock.sendMessage(from, { text: '❌ *Este grupo no parece estar vinculado a ninguna comunidad.*' }, { quoted: m });
            }

            // Si el usuario escribe: /comunidad icon, /comunidad pfp, etc.
            if (['icon', 'pfp', 'perfil', 'imagen'].includes(argumento)) {
                try {
                    // Pedimos la foto usando la ID de la comunidad madre
                    const pfpUrl = await sock.profilePictureUrl(comunidadJid, 'image');
                    return await sock.sendMessage(from, { 
                        image: { url: pfpUrl }, 
                        caption: `📸 *Icono de la Comunidad:* _${metadata.subject}_` 
                    }, { quoted: m });
                } catch {
                    return await sock.sendMessage(from, { text: '❌ *No se pudo obtener la foto de la comunidad.*' }, { quoted: m });
                }
            }

            // Si solo escribe /comunidad (o /comunidad info) manda la información limpia de la comunidad
            const comunidadMetadata = await sock.groupMetadata(comunidadJid);
            const creador = comunidadMetadata.owner ? `@${comunidadMetadata.owner.split('@')[0]}` : 'No disponible';
            const fechaCreacion = new Date(comunidadMetadata.creation * 1000).toLocaleDateString('es-ES');

            let info = `🏰 *Información de la Comunidad*\n\n`;
            info += `📌 *Nombre:* ${comunidadMetadata.subject}\n`;
            info += `👑 *Creador:* ${creador}\n`;
            info += `📅 *Creada el:* ${fechaCreacion}\n`;
            info += `👥 *Soporte de miembros:* ${comunidadMetadata.participants.length}\n`;

            await sock.sendMessage(from, { 
                text: info, 
                mentions: comunidadMetadata.owner ? [comunidadMetadata.owner] : [] 
            }, { quoted: m });

        } catch (e) {
            console.log(e);
            await sock.sendMessage(from, { text: '❌ Ocurrió un error al procesar el comando de la comunidad.' }, { quoted: m });
        }
    }
};
