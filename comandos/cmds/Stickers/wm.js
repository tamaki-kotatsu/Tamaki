const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
// Asegúrate de que esta ruta apunte a tu archivo sticker.js original
const { toWebp, writeExifWebp } = require('./stickers'); 

module.exports = {
    name: 'wm',
    alias: ['watermark', 'robs'],
    description: 'Robar sticker o procesar multimedia con texto personalizado.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;
        const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        // Detección de multimedia
        const mediaMsg = m.message?.stickerMessage || m.message?.imageMessage || m.message?.videoMessage || 
                         quoted?.stickerMessage || quoted?.imageMessage || quoted?.videoMessage;

        if (!mediaMsg) {
            return sock.sendMessage(from, { text: '⚠️ _Responde a un sticker, imagen o video con /wm <texto>_' }, { quoted: m });
        }

        if (!texto) {
            return sock.sendMessage(from, { text: '⚠️ _Escribe un texto para la marca de agua._' }, { quoted: m });
        }

        try {
            const isVideo = !!(mediaMsg.videoMessage || quoted?.videoMessage);
            const isSticker = !!(mediaMsg.stickerMessage || quoted?.stickerMessage);
            const mediaType = isVideo ? 'video' : 'image';

            // Descargar el contenido
            const stream = await downloadContentFromMessage(mediaMsg, isSticker ? 'sticker' : mediaType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // LÓGICA DE PROCESAMIENTO:
            let webpBuffer;
            if (isSticker) {
                // Si es sticker, lo usamos tal cual
                webpBuffer = buffer;
            } else {
                // Si es imagen o video, lo pasamos por TU función toWebp original para asegurar calidad
                webpBuffer = await toWebp(buffer, mediaType);
            }

            // Metadatos limpios usando TU función writeExifWebp
            const metadata = {
                packname: texto.trim(),
                author: '' 
            };

            const stickerWithExif = await writeExifWebp(webpBuffer, metadata);

            // Enviar el sticker resultante
            await sock.sendMessage(from, { sticker: stickerWithExif }, { quoted: m });

        } catch (e) {
            console.error('Error en wm.js:', e);
            await sock.sendMessage(from, { text: '❌ _Error al procesar el archivo. Intenta de nuevo._' }, { quoted: m });
        }
    }
};
