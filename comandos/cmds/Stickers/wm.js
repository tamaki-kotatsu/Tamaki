const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
// Importamos las funciones exactas de tu archivo de stickers
const { toWebp, writeExifWebp } = require('./stickers'); // Asegúrate de ajustar la ruta si tu archivo de sticker se llama diferente o está en otra carpeta

module.exports = {
    name: 'wm',
    alias: ['watermark', 'rob'],
    description: 'Robar o reenviar un sticker/imagen aplicando texto personalizado directamente.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;

        // Detectar si se respondió a un sticker, imagen, video o si el mensaje actual lo tiene
        const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const mediaMsg = m.message?.stickerMessage || m.message?.imageMessage || m.message?.videoMessage || 
                         quoted?.stickerMessage || quoted?.imageMessage || quoted?.videoMessage;

        if (!mediaMsg) {
            return sock.sendMessage(from, { text: '⚠️ _Por favor, responde a un sticker, imagen o video con el comando /wm <texto>_' }, { quoted: m });
        }

        if (!texto) {
            return sock.sendMessage(from, { text: '⚠️ _Debes escribir un texto. Ejemplo: /wm Mi Texto Personalizado_' }, { quoted: m });
        }

        try {
            // Definimos el texto ingresado directamente como el nombre del pack (o autor, como prefieras)
            // Sin barras ni separadores molestos, todo directo.
            const metadata = {
                packname: texto.trim(),
                author: '' // Si quieres que vaya vacío o ponerle algo por defecto, cámbialo aquí
            };

            const isVideo = !!(mediaMsg.videoMessage || quoted?.videoMessage);
            const isSticker = !!(mediaMsg.stickerMessage || quoted?.stickerMessage);
            const mediaType = isVideo ? 'video' : 'image';

            // Descargar el contenido multimedia (sea sticker viejo, imagen o video)
            const stream = await downloadContentFromMessage(mediaMsg, isSticker ? 'sticker' : mediaType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            let webpBuffer;
            if (isSticker) {
                // Si ya es un sticker, lo usamos directo para reescribirle los EXIF
                webpBuffer = buffer;
            } else {
                // Si es imagen o video, lo convertimos a webp usando tu función existente
                webpBuffer = await toWebp(buffer, mediaType);
            }

            // Aplicamos los metadatos limpios con tu función writeExifWebp
            const stickerWithExif = await writeExifWebp(webpBuffer, metadata);

            // Enviamos el sticker resultante
            await sock.sendMessage(from, { sticker: stickerWithExif }, { quoted: m });

        } catch (e) {
            console.error('Error en el comando wm:', e);
            await sock.sendMessage(from, { text: '❌ Ocurrió un error al procesar el sticker con texto.' }, { quoted: m });
        }
    }
};
