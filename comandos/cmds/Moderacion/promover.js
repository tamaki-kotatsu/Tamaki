module.exports = {
    name: 'promover',
    alias: ['promote', 'daradmin'],
    description: 'Promueve a uno o varios usuarios a administrador.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;
        if (!from.endsWith('@g.us')) return sock.sendMessage(from, { text: '🪕 _Solo en grupos._' });

        // Obtener usuarios asignados por mención o por mensaje respondido
        let usuarios = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const quoted = m.message?.extendedTextMessage?.contextInfo?.participant;
        
        if (quoted && !usuarios.includes(quoted)) {
            usuarios.push(quoted);
        }

        if (usuarios.length === 0) {
            return sock.sendMessage(from, { text: '🔔 _Uso: Menciona a uno o varios usuarios o responde a su mensaje._\n*Ejemplo:* /promover @user1 @user2 por buen comportamiento' });
        }

        // Limpiar el texto para extraer el motivo quitando las menciones (@549...)
        let motivo = texto ? texto.replace(/@[0-9]+/g, '').trim() : '';
        if (!motivo) motivo = 'Sin motivo especificado';

        try {
            // Baileys acepta un array de strings (JIDs) directamente
            await sock.groupParticipantsUpdate(from, usuarios, 'promote');

            // Formatear los usuarios agregados para el log visual
            const mencionesLogs = usuarios.map(u => `@${u.split('@')[0]}`).join(', ');

            let mensajeLog = `│ 🛡️ *[ SISTEMA DE LOGS ]*\n`;
            mensajeLog += `│ \n`;
            mensajeLog += `│ 👤 *Acción:* Promover Admin\n`;
            mensajeLog += `│ 🎯 *Destinatarios:* ${mencionesLogs}\n`;
            mensajeLog += `│ ✍️ *Motivo:* ${motivo}\n`;
            mensajeLog += `│ ⏰ *Fecha:* ${new Date().toLocaleString('es-XM')}\n`;

            await sock.sendMessage(from, { 
                text: mensajeLog, 
                mentions: usuarios 
            });

        } catch (e) {
            console.error(e);
            await sock.sendMessage(from, { text: '❌ Ocurrió un error o el bot no cuenta con permisos de Administrador.' });
        }
    }
};
