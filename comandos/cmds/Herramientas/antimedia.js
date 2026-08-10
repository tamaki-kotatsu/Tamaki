const mongoose = require('mongoose');

const antiMediaSchema = new mongoose.Schema({
    groupId: { type: String, required: true, unique: true },
    config: {
        image: { type: Boolean, default: false },
        video: { type: Boolean, default: false },
        sticker: { type: Boolean, default: false },
        viewonce: { type: Boolean, default: false }
    }
});

const AntiMediaModel = mongoose.models.AntiMedia || mongoose.model('AntiMedia', antiMediaSchema);

global.antiMediaCache = global.antiMediaCache || {};

const cargarCache = async () => {
    try {
        const todos = await AntiMediaModel.find({});
        todos.forEach(doc => {
            global.antiMediaCache[doc.groupId] = doc.config;
        });
    } catch (e) {
        console.error('Error al cargar caché de AntiMedia:', e);
    }
};

cargarCache();

module.exports = {
    name: 'antimedia',
    alias: ['am', 'borrarmedia'],
    description: 'Elimina automáticamente tipos específicos de mensajes enviados en el grupo.',
    soloAdmins: true,

    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;

        if (!from.endsWith('@g.us')) {
            return sock.sendMessage(from, { text: '⏳ _Este comando solo se puede usar en grupos._' }, { quoted: m });
        }

        if (!global.antiMediaCache[from]) {
            global.antiMediaCache[from] = {
                image: false,
                video: false,
                sticker: false,
                viewonce: false
            };
        }

        const args = texto ? texto.trim().toLowerCase().split(' ') : [];
        const tipo = args[0];
        const tiposValidos = ['image', 'video', 'sticker', 'viewonce'];

        if (!tipo || !tiposValidos.includes(tipo)) {
            const estado = global.antiMediaCache[from];
            const menu = `⚙️ *CONFIGURACIÓN ANTI-MEDIA*\n\n` +
                         `Uso: \`/antimedia [tipo]\`\n\n` +
                         `*Tipos disponibles para bloquear:*\n` +
                         `• \`image\` (Imágenes normales)\n` +
                         `• \`video\` (Videos normales)\n` +
                         `• \`sticker\` (Cualquier sticker)\n` +
                         `• \`viewonce\` (Fotos/Videos de una sola vez)\n\n` +
                         `*Estado actual en este grupo:*\n` +
                         `📸 Imágenes: ${estado.image ? '✅ Activo (Se borran)' : '❌ Inactivo'}\n` +
                         `🎥 Videos: ${estado.video ? '✅ Activo (Se borran)' : '❌ Inactivo'}\n` +
                         `🎨 Stickers: ${estado.sticker ? '✅ Activo (Se borran)' : '❌ Inactivo'}\n` +
                         `👁️ Ver una sola vez: ${estado.viewonce ? '✅ Activo (Se borran)' : '❌ Inactivo'}`;
            
            return sock.sendMessage(from, { text: menu }, { quoted: m });
        }

        global.antiMediaCache[from][tipo] = !global.antiMediaCache[from][tipo];

        await AntiMediaModel.findOneAndUpdate(
            { groupId: from },
            { groupId: from, config: global.antiMediaCache[from] },
            { upsert: true, new: true }
        );

        const nuevoEstado = global.antiMediaCache[from][tipo] ? '🟩 *ACTIVADO (Se borrará)*' : '🟥 *DESACTIVADO (Permitido)*';
        return sock.sendMessage(from, { 
            text: `⚙️ El filtro para *${tipo}* ahora está: ${nuevoEstado}` 
        }, { quoted: m });
    },

    before: async (m, { sock, isGroup, sender }) => {
        if (!isGroup || m.key.fromMe || !m.message) return;

        const from = m.key.remoteJid;
        const grupoConfig = global.antiMediaCache[from];

        if (!grupoConfig) return;

        const messageType = Object.keys(m.message)[0];
        let debaBorrar = false;

        const isViewOnce = m.message.viewOnceMessageV2 || m.message.viewOnceMessage;
        if (grupoConfig.viewonce && isViewOnce) {
            debaBorrar = true;
        }

        if (grupoConfig.image) {
            const esImagenNormal = messageType === 'imageMessage';
            const esImagenViewOnce = m.message?.viewOnceMessageV2?.message?.imageMessage || m.message?.viewOnceMessage?.message?.imageMessage;
            if (esImagenNormal || esImagenViewOnce) {
                debaBorrar = true;
            }
        }

        if (grupoConfig.video) {
            const esVideoNormal = messageType === 'videoMessage';
            const esVideoViewOnce = m.message?.viewOnceMessageV2?.message?.videoMessage || m.message?.viewOnceMessage?.message?.videoMessage;
            if (esVideoNormal || esVideoViewOnce) {
                debaBorrar = true;
            }
        }

        if (grupoConfig.sticker) {
            const esSticker = messageType === 'stickerMessage' || 
                              m.message?.documentWithCaptionMessage?.message?.stickerMessage;
            if (esSticker) {
                debaBorrar = true;
            }
        }

        if (debaBorrar) {
            try {
                const groupMetadata = await sock.groupMetadata(from);
                const participants = groupMetadata.participants;
                const userParticipant = participants.find(p => p.id.split(':')[0] === sender.split(':')[0]);
                const usuarioEsAdmin = userParticipant && (userParticipant.admin === 'admin' || userParticipant.admin === 'superadmin');

                if (usuarioEsAdmin) return;

                await sock.sendMessage(from, {
                    delete: {
                        remoteJid: from,
                        fromMe: false,
                        id: m.key.id,
                        participant: sender
                    }
                });
            } catch (err) {
                console.log('⚠️ No se pudo eliminar el mensaje (probablemente el bot no tiene permisos de admin):', err.message);
            }
        }
    }
};
