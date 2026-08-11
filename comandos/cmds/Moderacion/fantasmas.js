module.exports = {
    name: 'offline',
    alias: ['inactivados', 'fantasmas'],
    description: 'Etiqueta a los miembros que no son administradores.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;
        
        if (!from.endsWith('@g.us')) return sock.sendMessage(from, { text: '👥 _Solo disponible en grupos._' });

        try {
            const groupMetadata = await sock.groupMetadata(from);
            const participants = groupMetadata.participants;
            
            let textoMencion = '💤 *Llamado a los miembros inactivos/fantasmas:* \n\n';
            let mentions = [];

            for (let participant of participants) {
                // Filtramos: Si NO es admin ni superadmin, lo añadimos
                if (!participant.admin) {
                    textoMencion += `👤 @${participant.id.split('@')[0]}\n`;
                    mentions.push(participant.id);
                }
            }

            if (mentions.length === 0) {
                return sock.sendMessage(from, { text: '¡Vaya! Parece que todos en este grupo son administradores.' });
            }

            await sock.sendMessage(from, { text: textoMencion, mentions: mentions });

        } catch (e) {
            console.log(e);
            await sock.sendMessage(from, { text: '❌ Ocurrió un error al obtener la lista.' });
        }
    }
};
