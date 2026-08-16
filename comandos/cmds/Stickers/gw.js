module.exports = {
    name: 'gw',
    alias: ['setgroupwm', 'groupwm'],
    description: 'Define el texto predeterminado del grupo para el comando /wm.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;

        if (!from.endsWith('@g.us')) {
            return sock.sendMessage(from, { text: '⚠️ _Este comando solo se puede usar en grupos._' });
        }

        // Validación básica de administrador (depende de cómo obtengas los metadata en tu bot)
        const groupMetadata = await sock.groupMetadata(from);
        const participants = groupMetadata.participants;
        const sender = m.key.participant || m.participant;
        const isParticipantAdmin = participants.find(p => p.id === sender)?.admin;

        if (!isParticipantAdmin) {
            return sock.sendMessage(from, { text: '❌ _Solo los administradores pueden usar este comando._' });
        }

        if (!texto) {
            return sock.sendMessage(from, { text: '⚠️ _Por favor, ingresa el texto para el grupo._' });
        }

        try {
            if (!global.db.data.chats[from]) {
                global.db.data.chats[from] = {};
            }
            global.db.data.chats[from].wmText = texto;

            await sock.sendMessage(from, { text: `✅ _El texto predeterminado de este grupo fue actualizado a:_ \n\n"${texto}"` });
        } catch (e) {
            console.log(e);
            await sock.sendMessage(from, { text: '❌ _Ocurrió un error al guardar el texto del grupo._' });
        }
    }
};
