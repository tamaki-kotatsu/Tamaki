const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'wm',
    alias: ['watermark'],
    description: 'Robar o reenviar multimedia con un texto personalizado.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;

        // Detectar si hay un mensaje citado o si el mensaje actual contiene multimedia
        const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        // Verificamos tanto en el mensaje principal como en el mensaje citado (quoted)
        const mediaMsg = m.message?.imageMessage || m.message?.videoMessage || m.message?.stickerMessage ||
                         quoted?.imageMessage || quoted?.videoMessage || quoted?.stickerMessage;

        if (!mediaMsg) {
            return sock.sendMessage(from, { text: '⚠️ _Por favor, responde a una imagen, video, gif o sticker con el comando /wm <texto>._' });
        }

        if (!texto) {
            return sock.sendMessage(from, { text: '⚠️ _Falta el texto. Ejemplo: /wm Mi texto personalizado_' });
        }

        try {
            // Identificar el tipo exacto de contenido multimedia
            let type = '';
            let messageTypeRef = null;

            if (m.message?.imageMessage || quoted?.imageMessage) {
                type = 'image';
                messageTypeRef = m.message?.imageMessage || quoted?.imageMessage;
            } else if (m.message?.videoMessage || quoted?.videoMessage) {
                type = 'video';
                messageTypeRef = m.message?.videoMessage || quoted?.videoMessage;
            } else if (m.message?.stickerMessage || quoted?.stickerMessage) {
                type = 'sticker';
                messageTypeRef = m.message?.stickerMessage || quoted?.stickerMessage;
            }

            // Descargar el contenido multimedia usando Baileys
            const stream = await downloadContentFromMessage(messageTypeRef, type);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // Enviar según corresponda
            if (type === 'image') {
                await sock.sendMessage(from, { image: buffer, caption: texto }, { quoted: m });
            } else if (type === 'video') {
                await sock.sendMessage(from, { video: buffer, caption: texto, mimetype: 'video/mp4' }, { quoted: m });
            } else if (type === 'sticker') {
                // Nota: Los stickers de WhatsApp nativos no llevan "caption" de texto visible flotando igual que una foto, 
                // pero si deseas enviarlo como imagen con texto o procesarlo como sticker manteniendolo:
                await sock.sendMessage(from, { sticker: buffer }, { quoted: m });
                // Si preferías que el sticker mande un texto adjunto o nota al margen, avísame para ajustarlo.
            }

        } catch (e) {
            console.error(e);
            await sock.sendMessage(from, { text: '❌ _Ocurrió un error al procesar el archivo multimedia._' });
        }
    }
};
