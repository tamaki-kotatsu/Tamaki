module.exports = {
    name: 'love',
    alias: ['compatibilidad'],
    description: 'Mide el porcentaje de amor y compatibilidad con alguien.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;

        // Validación de grupo usando la misma lógica de tu plugin grupo.js
        if (!from.endsWith('@g.us')) {
            return sock.sendMessage(from, { text: '🤷‍♂️ _Solo en grupos._' });
        }

        // Extraer las menciones desde el contexto del mensaje de Baileys
        const mentions = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const sender = m.key.participant || m.key.remoteJid;

        // Si no se etiqueta a nadie, avisar al usuario
        if (mentions.length === 0) {
            return sock.sendMessage(from, { 
                text: '❌ ¡Oye! Necesitas etiquetar a alguien para medir tu compatibilidad. Ejemplo: `/love @usuario`',
                mentions: [sender]
            }, { quoted: m });
        }

        const destino = mentions[0];
        const porcentaje = Math.floor(Math.random() * 101);
        const bloquesLlenos = Math.round(porcentaje / 10);
        const barra = '❤️'.repeat(bloquesLlenos) + '🖤'.repeat(10 - bloquesLlenos);

        let veredicto = '';
        if (porcentaje < 20) {
            veredicto = '💔 *Zona de Peligro:* Corran en direcciones opuestas. Ni el café los une.';
        } else if (porcentaje < 50) {
            veredicto = '🤝 *Solo Amigos:* Tienen más futuro compartiendo memes que en una cita.';
        } else if (porcentaje < 80) {
            veredicto = '🔥 *Huele a Química:* Aquí hay tensión de la buena. Invítale unos tacos ya.';
        } else {
            veredicto = '👑 *Almas Gemelas:* Ya vayan comprando los anillos. ¡Están destinados!';
        }

        const textoRespuesta = `
💘 *【 MEDIDOR DE COMPATIBILIDAD 】* 💘

👤 *Tú:* @${sender.split('@')[0]}
👤 *Objetivo:* @${destino.split('@')[0]}

📊 *Progreso:* [ ${barra} ] *${porcentaje}%*

📝 *Veredicto:* ${veredicto}
        `.trim();

        // Enviar el resultado mencionando a ambos y respondiendo al mensaje original
        await sock.sendMessage(from, {
            text: textoRespuesta,
            mentions: [sender, destino]
        }, { quoted: m });
    }
};
