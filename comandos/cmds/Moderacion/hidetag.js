module.exports = {
    name: 'hidetag',
    alias: ['otodos', 'htag'],
    description: 'Etiqueta a todos de forma invisible.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;
        
        if (!from.endsWith('@g.us')) return sock.sendMessage(from, { text: '👥 _Solo disponible en grupos._' });
        if (!texto) return sock.sendMessage(from, { text: '⚠️ _Debes incluir un mensaje para enviar. Uso: /hidetag <mensaje>_' });

        try {
            const groupMetadata = await sock.groupMetadata(from);
            const participants = groupMetadata.participants;
            
            // Creamos el array con las JIDs de todos, pero el texto solo lleva lo que tú escribiste
            let mentions = participants.map(p => p.id);

            await sock.sendMessage(from, { text: texto, mentions: mentions });

        } catch (e) {
            console.log(e);
            await sock.sendMessage(from, { text: '❌ Ocurrió un error al ejecutar el hidetag.' });
        }
    }
};
