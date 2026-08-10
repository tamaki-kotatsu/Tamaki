module.exports = {
    name: 'pfp',
    alias: ['avatar', 'perfil', 'foto'],
    description: 'Muestra la foto de perfil de un usuario.',
    run: async (sock, m) => {
        const from = m.key.remoteJid;
        let jid;

        // 1. Verificar si hay alguien mencionado
        if (m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            jid = m.message.extendedTextMessage.contextInfo.mentionedJid[0];
        // 2. Verificar si se está respondiendo a un mensaje
        } else if (m.message?.extendedTextMessage?.contextInfo?.participant) {
            jid = m.message.extendedTextMessage.contextInfo.participant;
        // 3. Si no, obtener la foto del mismo remitente
        } else {
            jid = m.key.participant || m.key.remoteJid;
        }

        try {
            // Obtenemos la URL de la imagen en alta resolución ('image')
            const ppUrl = await sock.profilePictureUrl(jid, 'image');

            await sock.sendMessage(from, { 
                image: { url: ppUrl }, 
                caption: `📸 *Foto de perfil de:* @${jid.split('@')[0]}`,
                mentions: [jid]
            }, { quoted: m });

        } catch (e) {
            // Si el usuario no tiene foto de perfil o la privacidad lo restringe
            await sock.sendMessage(from, { text: '❌ _No se pudo obtener la foto de perfil (puede que no tenga o esté oculta por privacidad)._' }, { quoted: m });
        }
    }
};
