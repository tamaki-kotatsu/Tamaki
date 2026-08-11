module.exports = {
    name: 'demover',
    alias: ['demote', 'quitaradmin'],
    description: 'Quita el rango de administrador a uno o varios usuarios.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;
        if (!from.endsWith('@g.us')) return sock.sendMessage(from, { text: '🪕 _Solo en grupos._' });

        // Obtener usuarios por mención o mensaje respondido
        let usuarios = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const quoted = m.message?.extendedTextMessage?.contextInfo?.participant;
        
        if (quoted && !usuarios.includes(quoted)) {
            usuarios.push(quoted);
        }

        if (usuarios.length === 0) {
            return sock.sendMessage(from, { text: '🔔 _Uso: Menciona a los administradores o responde a su mensaje._\n*Ejemplo:* /demover @admin1 por inactividad' });
        }

        // Limpiar el texto para extraer el motivo
        let motivo = texto ? texto.replace(/@[0-9]+/g, '').trim() : '';
        if (!motivo) motivo = 'Sin motivo especificado';

        try {
            // Ejecución masiva del cambio de rango con Baileys
            await sock.groupParticipantsUpdate(from, usuarios, 'demote');

            const mencionesLogs = usuarios.map(u => `@${u.split('@')[0]}`).join(', ');

            let mensajeLog = `│ 📉 *[ SISTEMA DE LOGS ]*\n`;
            mensajeLog += `│ \n`;
            mensajeLog += `│ 👤 *Acción:* Demover Admin\n`;
            mensajeLog += `│ 🎯 *Destinatarios:* ${mencionesLogs}\n`;
            mensajeLog += `│ ✍️ *Motivo:* ${motivo}\n`;
            mensajeLog += `│ ⏰ *Fecha:* ${new Date().toLocaleString('es-XM')}\n`;

            await sock.sendMessage(from, { 
                text: mensajeLog, 
                mentions: usuarios 
            });

        } catch (e) {
            console.error(e);
            await sock.sendMessage(from, { text: '❌ Ocurrió un error. Verifica que los usuarios sean admins o el bot tenga los permisos necesarios.' });
        }
    }
};
