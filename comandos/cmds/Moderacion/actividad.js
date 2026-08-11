// Al estar en la misma carpeta, se importa directamente con ./
const Actividad = require('./actividadSchema');

module.exports = {
    name: 'activos',
    alias: ['inactivos'],
    description: 'Muestra y etiqueta a los usuarios según su actividad del día de hoy.',
    
    // Función silenciosa que se ejecuta con CADA mensaje
    before: async (m, { isGroup, sender }) => {
        if (!isGroup || !sender || !m.key.remoteJid) return;

        try {
            const from = m.key.remoteJid;
            // Actualiza o inserta la fecha con la hora actual en la base de datos
            await Actividad.findOneAndUpdate(
                { groupId: from, userId: sender },
                { ultimaVezActivo: new Date() },
                { upsert: true, new: true }
            );
        } catch (e) {
            console.error('❌ Error guardando actividad:', e);
        }
    },

    // Función principal cuando ejecutan el comando /activos o /inactivos
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;
        if (!from.endsWith('@g.us')) return sock.sendMessage(from, { text: '👥 _Solo disponible en grupos._' });

        // Identificar qué comando se ejecutó basándonos en el cuerpo del mensaje
        const body = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
        const comandoActual = body.split(' ')[0].toLowerCase().replace('/', '');

        try {
            const groupMetadata = await sock.groupMetadata(from);
            const participants = groupMetadata.participants;

            // Definimos el inicio del día de hoy (00:00:00 horas locales)
            const hoyInicio = new Date();
            hoyInicio.setHours(0, 0, 0, 0);

            // Obtenemos todos los registros de actividad guardados de este grupo
            const registros = await Actividad.find({ groupId: from });

            // Filtramos los usuarios que han enviado mensajes hoy
            const usuariosActivosHoy = registros
                .filter(reg => reg.ultimaVezActivo >= hoyInicio)
                .map(reg => reg.userId);

            let listaEtiquetas = [];
            let mensajeResultado = '';

            if (comandoActual === 'activos') {
                mensajeResultado = texto ? `🔥 *Mensaje para Activos:* ${texto}\n\n` : '⚡ *Usuarios que han estado activos hoy:*\n\n';
                
                for (let participant of participants) {
                    if (usuariosActivosHoy.includes(participant.id)) {
                        mensajeResultado += `▪️ @${participant.id.split('@')[0]}\n`;
                        listaEtiquetas.push(participant.id);
                    }
                }

                if (listaEtiquetas.length === 0) {
                    return sock.sendMessage(from, { text: '💤 Nadie ha escrito el día de hoy todavía.' });
                }

            } else if (comandoActual === 'inactivos') {
                mensajeResultado = texto ? `💤 *Mensaje para Inactivos:* ${texto}\n\n` : '⏳ *Usuarios ausentes/inactivos el día de hoy:*\n\n';
                
                for (let participant of participants) {
                    // Si NO ha escrito hoy, pasa como inactivo
                    if (!usuariosActivosHoy.includes(participant.id)) {
                        mensajeResultado += `▪️ @${participant.id.split('@')[0]}\n`;
                        listaEtiquetas.push(participant.id);
                    }
                }

                if (listaEtiquetas.length === 0) {
                    return sock.sendMessage(from, { text: '🎉 ¡Increíble! Todos los miembros han estado activos hoy.' });
                }
            }

            // Envía la mención correspondiente con el mensaje
            await sock.sendMessage(from, { text: mensajeResultado, mentions: listaEtiquetas });

        } catch (e) {
            console.error(e);
            await sock.sendMessage(from, { text: '❌ Ocurrió un error al procesar la lista de actividad.' });
        }
    }
};
