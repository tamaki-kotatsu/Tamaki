module.exports = {
    name: 'demotetodos',
    alias: ['demotetotal', 'limpiaradmins'],
    description: 'Remueve el rango de administrador a todos los miembros del grupo, con opción de exceptuar a algunos.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;
        if (!from.endsWith('@g.us')) return sock.sendMessage(from, { text: '🪕 _Solo en grupos._' });

        try {
            // 1. Obtener los metadatos actualizados del grupo y los datos del bot
            const metadata = await sock.groupMetadata(from);
            const participantes = metadata.participants;
            const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';

            // 2. Filtrar quiénes son administradores actualmente (excluyendo al creador del grupo y al propio bot)
            // Esto evita que el bot se quite el admin a sí mismo o intente demover al dueño absoluto
            let adminsActuales = participantes
                .filter(p => (p.admin === 'admin' || p.admin === 'superadmin') && p.id !== botJid && p.id !== metadata.owner)
                .map(p => p.id);

            if (adminsActuales.length === 0) {
                return sock.sendMessage(from, { text: '⚙️ _No hay administradores en este grupo a los que el bot pueda remover el rango._' });
            }

            // 3. Detectar si hay excepciones (usuarios mencionados tras el "todos menos")
            let usuariosAExcluir = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            
            // Si se usó respondiendo a alguien, también lo sumamos a las excepciones
            const quoted = m.message?.extendedTextMessage?.contextInfo?.participant;
            if (quoted && !usuariosAExcluir.includes(quoted)) {
                usuariosAExcluir.push(quoted);
            }

            // 4. Filtrar la lista final de admins a remover aplicando las excepciones
            let adminsARemover = adminsActuales.filter(adminJid => !usuariosAExcluir.includes(adminJid));

            if (adminsARemover.length === 0) {
                return sock.sendMessage(from, { text: '🔔 _Todos los administradores actuales están en la lista de excepciones._' });
            }

            // 5. Aislar el motivo limpiando las menciones y palabras clave del texto
            let motivo = texto ? texto.replace(/todos|menos/g, '').replace(/@[0-9]+/g, '').trim() : '';
            if (!motivo) motivo = 'Remoción masiva de administradores';

            // 6. Ejecutar la acción masiva en WhatsApp
            await sock.groupParticipantsUpdate(from, adminsARemover, 'demote');

            // 7. Renderizar el reporte/log en el chat
            const mencionesLogs = adminsARemover.map(u => `@${u.split('@')[0]}`).join(', ');
            const excepcionesLogs = usuariosAExcluir.length > 0 
                ? usuariosAExcluir.map(u => `@${u.split('@')[0]}`).join(', ') 
                : 'Ninguna';

            let mensajeLog = `│ 🛡️ *[ LOGS: DEMOTE MASIVO ]*\n`;
            mensajeLog += `│ \n`;
            mensajeLog += `│ 👤 *Acción:* Demover Todos\n`;
            mensajeLog += `│ 📉 *Removidos:* ${mencionesLogs}\n`;
            mensajeLog += `│ 😇 *Exceptuados:* ${excepcionesLogs}\n`;
            mensajeLog += `│ ✍️ *Motivo:* ${motivo}\n`;
            mensajeLog += `│ ⏰ *Fecha:* ${new Date().toLocaleString('es-XM')}\n`;

            // Combinamos los removidos y exceptuados en las menciones del mensaje para que se vean correctamente los tags
            const todasLasMenciones = [...adminsARemover, ...usuariosAExcluir];

            await sock.sendMessage(from, { 
                text: mensajeLog, 
                mentions: todasLasMenciones 
            });

        } catch (e) {
            console.error(e);
            await sock.sendMessage(from, { text: '❌ Hubo un fallo al intentar obtener la lista de miembros o procesar la orden.' });
        }
    }
};
