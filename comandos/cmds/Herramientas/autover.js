const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const mongoose = require('mongoose');

const antiViewOnceSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    activo: { type: Boolean, default: false }
});

const AntiViewOnceModel = mongoose.models.AntiViewOnce || mongoose.model('AntiViewOnce', antiViewOnceSchema);

global.antiviewonce = global.antiviewonce !== undefined ? global.antiviewonce : false;

const cargarEstado = async () => {
    try {
        const config = await AntiViewOnceModel.findOne({ key: 'global_config' });
        if (config) {
            global.antiviewonce = config.activo;
        }
    } catch (e) {
        console.error('Error al cargar estado de AntiViewOnce:', e);
    }
};

cargarEstado();

module.exports = {
    name: 'antiviewonce',
    alias: ['autover', 'avoidonce', 'automirar'],
    description: 'Activa o desactiva el auto-revelado de mensajes de una sola vez.',
    
    // 1. Comando Manual para activar/desactivar
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;
        let param = texto ? texto.toLowerCase().trim() : '';

        if (param === 'on' || param === 'activar') {
            global.antiviewonce = true;
        } else if (param === 'off' || param === 'desactivar') {
            global.antiviewonce = false;
        } else {
            global.antiviewonce = !global.antiviewonce;
        }

        await AntiViewOnceModel.findOneAndUpdate(
            { key: 'global_config' },
            { key: 'global_config', activo: global.antiviewonce },
            { upsert: true, new: true }
        );

        const estado = global.antiviewonce ? '✅ *ACTIVADO*' : '❌ *DESACTIVADO*';
        return sock.sendMessage(from, { text: `👁‍🗨 _Modo automático para ver una sola vez:_ ${estado}\n\n_Configuración guardada._` }, { quoted: m });
    },

    // 2. Interceptor automático que se ejecuta en cada mensaje entrante
    before: async (m, { sock }) => {
        if (!global.antiviewonce || !m || !m.message || m.key.fromMe) return;

        const from = m.key.remoteJid;
        if (!from || from.endsWith('@newsletter')) return;

        const msg = m.message;

        const viewOnceModel = msg.viewOnceMessageV2?.message || 
                              msg.viewOnceMessage?.message || 
                              msg.documentWithCaptionMessage?.message?.viewOnceMessageV2?.message ||
                              msg.ephemeralMessage?.message?.viewOnceMessageV2?.message ||
                              msg.ephemeralMessage?.message?.viewOnceMessage?.message;

        if (!viewOnceModel) return;

        const targetMessage = viewOnceModel.imageMessage || 
                              viewOnceModel.videoMessage;

        if (!targetMessage) return;

        const isImage = !!targetMessage.mimetype?.includes('image');
        const mediaType = isImage ? 'image' : 'video';

        try {
            const stream = await downloadContentFromMessage(targetMessage, mediaType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            if (isImage) {
                await sock.sendMessage(from, { image: buffer, caption: '🔓 *[Auto-Revelado]*' }, { quoted: m });
            } else {
                await sock.sendMessage(from, { video: buffer, caption: '🔓 *[Auto-Revelado]*' }, { quoted: m });
            }
        } catch (e) {
            console.error('❌ Error en el interceptor automático de antiviewonce:', e);
        }
    }
};
