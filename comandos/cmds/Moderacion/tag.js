module.exports = {
    name: 'tag',
    alias: ['todos', 'mencion'],
    description: 'Etiqueta a todos los miembros del grupo de forma visible.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;
        
        if (!from.endsWith('@g.us')) return sock.sendMessage(from, { text: '👥 _Solo disponible en grupos._' });

        try {
            const groupMetadata = await sock.groupMetadata(from);
            const participants = groupMetadata.participants;
            
            // Si el usuario escribió un mensaje después del comando, lo ponemos arriba
            let mensajeBase = texto ? `💬 *Mensaje:* ${texto}\n\n` : '📢 *¡Atención a todos los miembros!:*\n\n';
            let mentions = [];

            for (let participant of participants) {
                mensajeBase += `▪️ @${participant.id.split('@')[0]}\n`;
                mentions.push(participant.id);
            }

            await sock.sendMessage(from, { text: mensajeBase, mentions: mentions });

        } catch (e) {
            console.log(e);
            await sock.sendMessage(from, { text: '❌ Ocurrió un error al ejecutar el comando.' });
        }
    }
};
