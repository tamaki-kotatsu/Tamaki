module.exports = {
    name: 'kick',
    alias: ['banear', 'expulsar', 'sacar'],
    description: 'Expulsa a un usuario del grupo sin validación previa de admin.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;

        if (!from.endsWith('@g.us')) {
            return sock.sendMessage(from, { text: '⚠️ _Este comando solo se puede usar en grupos._' }, { quoted: m });
        }

        let victim;
        const quoted = m.message?.extendedTextMessage?.contextInfo?.participant;
        const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

        if (quoted) {
            victim = quoted;
        } else if (mentioned) {
            victim = mentioned;
        } else if (texto && texto.trim() !== '') {
            const numero = texto.replace(/[^0-9]/g, '');
            victim = `${numero}@s.whatsapp.net`;
        }

        if (!victim) {
            return sock.sendMessage(from, { text: '⚠️ _Debes responder al mensaje de alguien, mencionarlo (@user) o escribir su número de teléfono para poder expulsarlo._' }, { quoted: m });
        }

        try {
            await sock.groupParticipantsUpdate(from, [victim], 'remove');
            await sock.sendMessage(from, { 
                text: `✅ El usuario @${victim.split('@')[0]} fue expulsado con éxito.`, 
                mentions: [victim] 
            }, { quoted: m });
        } catch (err) {
            console.error(err);
            await sock.sendMessage(from, { text: '❌ No se pudo expulsar al usuario. Asegúrate de que el bot tenga el rango de admin en el grupo.' }, { quoted: m });
        }
    }
};
