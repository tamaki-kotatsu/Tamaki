const mongoose = require('mongoose');

// Esquema para la colección de historial de mensajes almacenada por el controlador principal
const messageSchema = new mongoose.Schema({
    remoteJid: { type: String, required: true },
    messageId: { type: String, required: true },
    fromMe: { type: Boolean, default: false },
    participant: { type: String },
    timestamp: { type: Date, default: Date.now }
});

const MessageModel = mongoose.models.Message || mongoose.model('Message', messageSchema);

module.exports = {
    name: 'delete',
    alias: ['del', 'eliminar', 'clear', 'limpiar'],
    description: 'Elimina mensajes individuales o en masa usando la base de datos de historial.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;

        const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedKey = m.message?.extendedTextMessage?.contextInfo?.stanzaId;
        const participant = m.message?.extendedTextMessage?.contextInfo?.participant;

        // =========================================================================
        // 1. ELIMINAR MENSAJE RESPONDIDO (CITADO)
        // =========================================================================
        if (quoted && quotedKey) {
            try {
                await sock.sendMessage(from, { react: { text: '⏳', key: m.key } });
                const statusMsg = await sock.sendMessage(from, { text: '🔄 Procesando eliminación...' });

                await new Promise(resolve => setTimeout(resolve, 1200));
                await sock.sendMessage(from, { text: '✅ ¡Mensaje eliminado con éxito!', edit: statusMsg.key });

                await sock.sendMessage(from, {
                    delete: { 
                        remoteJid: from, 
                        fromMe: participant === sock.user.id, 
                        id: quotedKey, 
                        participant: participant 
                    }
                });

                await sock.sendMessage(from, { react: { text: '✅', key: m.key } });

                await new Promise(resolve => setTimeout(resolve, 2500));
                await sock.sendMessage(from, { delete: statusMsg.key });
                await sock.sendMessage(from, { delete: m.key });

                // Opcional: borrar el registro de la DB
                await MessageModel.deleteOne({ messageId: quotedKey }).catch(() => {});
                return;
            } catch (e) {
                console.log('Error al eliminar mensaje individual:', e);
                return;
            }
        }

        // =========================================================================
        // 2. ELIMINAR MENSAJES EN MASA (/clear N)
        // =========================================================================
        const cantidad = parseInt(texto);
        if (!isNaN(cantidad) && cantidad > 0) {
            try {
                await sock.sendMessage(from, { react: { text: '⏳', key: m.key } });
                
                const statusMsg = await sock.sendMessage(from, { text: `🧹 Buscando y borrando los últimos ${cantidad} mensajes...` });

                const limite = Math.min(cantidad + 2, 52);
                let mensajesGuardados = [];

                // Primero intenta sacar del historial global en memoria si existe
                if (global.historialMensajes && global.historialMensajes[from]) {
                    mensajesGuardados = global.historialMensajes[from].slice(-limite);
                }

                // Si no hay suficientes en memoria, consulta directamente a MongoDB
                if (mensajesGuardados.length < cantidad) {
                    const dbLogs = await MessageModel.find({ remoteJid: from })
                        .sort({ timestamp: -1 })
                        .limit(limite)
                        .lean();

                    mensajesGuardados = dbLogs.map(doc => ({
                        key: {
                            remoteJid: doc.remoteJid,
                            fromMe: doc.fromMe,
                            id: doc.messageId,
                            participant: doc.participant
                        }
                    }));
                }

                for (const msg of mensajesGuardados) {
                    if (msg.key.id === statusMsg.key.id) continue;

                    try {
                        await sock.sendMessage(from, {
                            delete: {
                                remoteJid: from,
                                fromMe: msg.key.fromMe,
                                id: msg.key.id,
                                participant: msg.key.participant || msg.key.remoteJid
                            }
                        });
                        
                        // Eliminar también el rastro en DB
                        await MessageModel.deleteOne({ messageId: msg.key.id }).catch(() => {});
                        await new Promise(resolve => setTimeout(resolve, 300)); 
                    } catch (err) {}
                }

                await sock.sendMessage(from, { text: `✨ Se completó la limpieza de los últimos ${cantidad} mensajes.`, edit: statusMsg.key });
                await sock.sendMessage(from, { react: { text: '✅', key: m.key } });

                await new Promise(resolve => setTimeout(resolve, 2500));
                await sock.sendMessage(from, { delete: statusMsg.key });
                return;
            } catch (e) {
                console.log('Error en borrado masivo:', e);
                return;
            }
        }

        return sock.sendMessage(from, { text: '💡 *Uso:* `/del` respondiendo a un mensaje o `/clear 10`.' });
    }
};
