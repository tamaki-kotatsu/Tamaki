module.exports = {
    name: 'dados',
    alias: ['dado', 'suerte', 'azar'],
    description: 'Lanza unos dados o decide la suerte de un usuario.',
    soloAdmins: false, // Cualquier usuario lo puede usar
    botAdminRequerido: false,
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;
        const sender = m.key.participant || m.key.remoteJid;
        const tag = `@${sender.split('@')[0]}`;

        // Lista de respuestas graciosas sobre la suerte
        const predicciones = [
            "🎲 Sacaste un *6*. ¡Hoy es tu día de suerte! Alguien te va a confesar su amor. 💖",
            "🎲 Sacaste un *1*. Qué mala pata... Mejor ni salgas de la cama hoy. 🛏️",
            "🎲 Sacaste un *4*. Tu fortuna dice: El bot Maruchan te traerá buenas vibras. 🍜",
            "🎲 Sacaste un *3*. Suerte regular. Ni frío ni calor, todo marcha normal. ⚖️",
            "🎲 Sacaste un *5*. ¡Casi perfecto! Vas a encontrar dinero tirado en el piso. 💵",
            "🎲 Sacaste un *2*. Alguien te está dejando en visto ahora mismo. 🤭"
        ];

        // Elegir una predicción al azar
        const resultado = predicciones[Math.floor(Math.random() * predicciones.length)];

        try {
            // Reacción de azar
            await sock.sendMessage(from, { react: { text: '🎲', key: m.key } });
            
            // Mensaje de carga para darle emoción
            const statusMsg = await sock.sendMessage(from, { text: ` Lanzando los dados para ${tag}...` }, { mentions: [sender] });
            
            // Esperamos 1.5 segundos para simular el giro
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Editamos el mensaje con el resultado final
            await sock.sendMessage(from, { 
                text: `✨ *RESULTADO DEL AZAR* ✨\n\n👋👤 Usuario: ${tag}\n\n${resultado}`, 
                edit: statusMsg.key,
                mentions: [sender]
            });

        } catch (e) {
            console.log(e);
        }
    }
};
