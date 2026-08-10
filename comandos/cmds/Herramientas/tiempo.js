module.exports = {
    name: 'ping',
    alias: ['ping', 'pin', 'pong', 'pon', 'p'],
    description: 'Mide la velocidad de respuesta del bot.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;

        // 1. Reacción inicial en el mensaje del usuario
        await sock.sendMessage(from, { 
            react: { text: '⏳', key: m.key } 
        });

        const inicio = Date.now();

        const timestampMensaje = m.messageTimestamp.toString().length === 10 
            ? m.messageTimestamp * 1000 
            : m.messageTimestamp;

        const latenciaWhatsApp = Date.now() - timestampMensaje;

        // 2. Mensaje de espera original
        const enviado = await sock.sendMessage(from, { text: '✈️ ¡Haciendo ping...' });

        const latenciaBot = Date.now() - inicio;

        // 3. Editar el mensaje con el formato limpio que pediste
        await sock.sendMessage(from, {
            text: `🏓 *¡PONG!*\n\n` +
                  `🚀 *Latencia del Bot:* \`${latenciaBot} ms\`\n` +
                  `🛸 *Tiempo de tránsito:* \`${latenciaWhatsApp} ms\``,
            edit: enviado.key
        }, { quoted: m });

        // 4. Actualizar la reacción del usuario a 🫏
        await sock.sendMessage(from, { 
            react: { text: '🫏', key: m.key } 
        });

        // 5. Añadir una reacción al propio mensaje ya editado del bot
        await sock.sendMessage(from, { 
            react: { text: '⚡', key: enviado.key } 
        });
    }
};
