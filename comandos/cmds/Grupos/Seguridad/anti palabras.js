// Lista de palabras clave y dominios prohibidos (puedes ampliarla a tu gusto)
const palabrasProhibidas = [
    'pornhub', 'xvideos', 'xnxx', 'rule34', 'hentai', 'onlyfans', 
    'nopor', 'pornografía', 'xxx', 'redtube', 'stripchat'
];

module.exports = {
    name: 'anti-adultos',
    alias: [],
    description: 'Monitorea el chat para evitar enlaces o palabras de contenido para adultos.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;

        // Solo monitorear en grupos o comunidades
        if (!from.endsWith('@g.us')) return;

        // Obtener el texto del mensaje actual (puede estar en el texto directo o en la descripción de un archivo)
        const mensajeTexto = (
            m.message?.conversation || 
            m.message?.extendedTextMessage?.text || 
            m.message?.imageMessage?.caption || 
            m.message?.videoMessage?.caption || 
            ''
        ).toLowerCase();

        // Verificar si contiene alguna palabra prohibida
        const contieneContenidoProhibido = palabrasProhibidas.some(palabra => mensajeTexto.includes(palabra));

        if (contieneContenidoProhibido) {
            const sender = m.key.participant || m.key.remoteJid;

            try {
                // 1. Enviar advertencia al usuario
                await sock.sendMessage(from, { 
                    text: `⚠️ @${sender.split('@')[0]} *El contenido para adultos está totalmente prohibido en este grupo. Tu mensaje ha sido eliminado.*`,
                    mentions: [sender]
                });

                // 2. Intentar eliminar el mensaje (Requiere que el bot sea administrador del grupo)
                await sock.sendMessage(from, {
                    delete: {
                        remoteJid: from,
                        fromMe: false,
                        id: m.key.id,
                        participant: sender
                    }
                });

            } catch (e) {
                console.log('Error al intentar eliminar el mensaje:', e);
                // Si el bot no es admin, solo enviará la advertencia de texto pero no podrá borrar el mensaje.
            }
        }
    }
};
