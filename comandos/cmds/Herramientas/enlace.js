module.exports = {
    name: 'link',
    alias: ['enlace'],
    description: 'Obtén el enlace de invitación del grupo o de la comunidad.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;

        // Validar que el comando se use dentro de un grupo
        if (!from.endsWith('@g.us')) {
            return sock.sendMessage(from, { text: '*(っ•ᴗ•)╮=‌‌‌‌♡* _Este comando solo se puede usar en grupos._' });
        }

        const sender = m.key.participant || m.participant || from;
        const senderTag = `@${sender.split('@')[0]}`;
        const opcion = texto ? texto.toLowerCase().trim() : '';

        // Mensaje de ayuda si no se especifica el tipo de enlace
        if (opcion !== 'grupo' && opcion !== 'comunidad') {
            return sock.sendMessage(from, { 
                text: `~ ˙° ₊-͟͟͞͞  ♡\n\n*¿Qué enlace necesitas? Esclube una opción:*\n• \`/link grupo\`\n• \`/link comunidad\`\n\n(っ•ᴗ•)╮=‌‌‌‌♡`,
                mentions: [sender]
            });
        }

        try {
            if (opcion === 'grupo') {
                const code = await sock.groupInviteCode(from);
                const link = `https://chat.whatsapp.com/${code}`;

                const mensaje = `~ ˙° ₊-͟͟͞͞  ♡  *(っ•ᴗ•)╮=‌‌‌‌♡  ＼⁠(⁠^⁠o⁠^⁠)⁠／*

  ˙° ₊-‌‌‌‌ 🧋 – *Grupo Link* ♡

=‌‌‌‌♡  \`Solicitado por :\` ${senderTag}
=‌‌‌‌♡  \`Enlace :\` ${link}

(っ•ᴗ•)╮=‌‌‌‌♡`;

                await sock.sendMessage(from, { text: mensaje, mentions: [sender] });

            } else if (opcion === 'comunidad') {
                const metadata = await sock.groupMetadata(from);
                const parentJid = metadata.linkedParent;

                if (!parentJid) {
                    return sock.sendMessage(from, { 
                        text: '*(っ•ᴗ•)╮=‌‌‌‌♡* _Este grupo no pertenece a ninguna comunidad._',
                        mentions: [sender]
                    });
                }

                const code = await sock.groupInviteCode(parentJid);
                const link = `https://chat.whatsapp.com/${code}`;

                const mensaje = `~ ˙° ₊-͟͟͞͞  ♡  *(っ•ᴗ•)╮=‌‌‌‌♡  ＼⁠(⁠^⁠o⁠^⁠)⁠／*

  ˙° ₊-‌‌‌‌ 🧋 – *Comunidad Link* ♡

=‌‌‌‌♡  \`Solicitado por :\` ${senderTag}
=‌‌‌‌♡  \`Enlace :\` ${link}

(っ•ᴗ•)╮=‌‌‌‌♡`;

                await sock.sendMessage(from, { text: mensaje, mentions: [sender] });
            }

        } catch (error) {
            console.error(error);
            return sock.sendMessage(from, { 
                text: '⚠️ *Error:* No tengo los permisos necesarios para generar el enlace. ¡Asegúrate de hacerme Administrador!',
                mentions: [sender]
            });
        }
    }
};
