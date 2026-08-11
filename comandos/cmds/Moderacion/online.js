module.exports = {
    name: 'online',
    alias: ['activados'],
    description: 'Etiqueta a los miembros del grupo.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;
        
        // Validación de grupo idéntica a tu código
        if (!from.endsWith('@g.us')) return sock.sendMessage(from, { text: '👥 _Solo disponible en grupos._' });

        try {
            // Obtenemos los metadatos del grupo y sus participantes
            const groupMetadata = await sock.groupMetadata(from);
            const participants = groupMetadata.participants;
            
            let textoMencion = '📢 *Convocatoria de Miembros Activos:* \n\n';
            let mentions = [];

            for (let participant of participants) {
                textoMencion += `✨ @${participant.id.split('@')[0]}\n`;
                mentions.push(participant.id);
            }

            await sock.sendMessage(from, { text: textoMencion, mentions: mentions });

        } catch (e) {
            console.log(e);
            await sock.sendMessage(from, { text: '❌ Ocurrió un error al obtener la lista.' });
        }
    }
};
