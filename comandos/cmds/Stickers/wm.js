const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
// Ajusta esta ruta a tu archivo sticker.js real
const { toWebp, writeExifWebp } = require('./stickers'); 

module.exports = {
    name: 'wm',
    alias: ['watermark', 'rob'],
    description: 'Procesa multimedia (video/gif/foto) con texto personalizado.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;
        
        // 1. Normalización: buscamos el contenido en el mensaje mismo o en el citado
        const msg = m.message?.extendedTextMessage?.contextInfo?.quotedMessage || m.message;
        
        const mediaMsg = msg?.imageMessage || 
                         msg?.videoMessage || 
                         msg?.stickerMessage ||
                         msg?.documentMessage; // Opcional: si envían como documento

        if (!mediaMsg) {
            return sock.sendMessage(from, { text: '⚠️ _Responde a una imagen, video, gif o sticker._' }, { quoted: m });
        }

        if (!texto) {
            return sock.sendMessage(from, { text: '⚠️ _Escribe el texto para la marca de agua._' }, { quoted: m });
        }

        try {
            // Determinar si es sticker, video (que incluye gifs) o imagen
            const isSticker = !!mediaMsg.stickerMessage;
            const isVideo = !!mediaMsg.videoMessage;
            const mediaType = isVideo ? 'video' : 'image';

            // 2. Descarga del contenido usando la clave normalizada
            const stream = await downloadContentFromMessage(mediaMsg, isSticker ? 'sticker' : mediaType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // 3. Conversión a webp (solo si no es ya un sticker)
            let webpBuffer;
            if (isSticker) {
                webpBuffer = buffer;
            } else {
                webpBuffer = await toWebp(buffer, mediaType);
            }

            // 4. Aplicar metadatos (usando tu función original)
            const metadata = {
                packname: texto.trim(),
                author: '' 
            };
            const stickerWithExif = await writeExifWebp(webpBuffer, metadata);

            await sock.sendMessage(from, { sticker: stickerWithExif }, { quoted: m });

        } catch (e) {
            console.error('Error en wm.js:', e);
            await sock.sendMessage(from, { text: '❌ _Error al procesar el archivo. Intenta de nuevo._' }, { quoted: m });
        }
    }
};
