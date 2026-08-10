const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'ver',
    alias: ['mirar', 'viewonce'],
    description: 'Revela imágenes o videos de una sola vez.',
    run: async (sock, m) => {
        const from = m.key.remoteJid;
        
        // 1. Obtener el mensaje citado de forma segura
        const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted) return sock.sendMessage(from, { text: '❌ _Responde a un mensaje de una sola vez para usar este comando._' });

        // 2. Buscar la estructura de una sola vez en múltiples capas posibles de WhatsApp
        const viewOnceModel = quoted.viewOnceMessageV2?.message || 
                              quoted.viewOnceMessage?.message || 
                              quoted.documentWithCaptionMessage?.message?.viewOnceMessageV2?.message ||
                              quoted; // En algunos casos viene directo si es una estructura limpia

        // Verificamos si realmente contiene una imagen o video de una sola vez
        const isViewOnce = viewOnceModel.imageMessage?.viewOnce || 
                           viewOnceModel.videoMessage?.viewOnce || 
                           quoted.viewOnceMessageV2 || 
                           quoted.viewOnceMessage;

        if (!isViewOnce) return sock.sendMessage(from, { text: '❌ _El mensaje seleccionado no es de una sola vez._' });

        // 3. Extraer el objeto real del contenido (imageMessage o videoMessage)
        const targetMessage = viewOnceModel.imageMessage || viewOnceModel.videoMessage || 
                              viewOnceModel.viewOnceMessageV2?.message?.imageMessage ||
                              viewOnceModel.viewOnceMessageV2?.message?.videoMessage;

        if (!targetMessage) return sock.sendMessage(from, { text: '❌ _No se pudo extraer el archivo multimedia._' });

        // 4. Determinar si es imagen o video
        const isImage = !!targetMessage.mimetype?.includes('image');
        const mediaType = isImage ? 'image' : 'video';

        try {
            // Descargar el contenido usando los metadatos del mensaje extraído
            const stream = await downloadContentFromMessage(targetMessage, mediaType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // Enviar la respuesta
            if (isImage) {
                await sock.sendMessage(from, { image: buffer, caption: '🔓 *Imagen de una sola vez revelada*' }, { quoted: m });
            } else {
                await sock.sendMessage(from, { video: buffer, caption: '🔓 *Video de una sola vez revelado*' }, { quoted: m });
            }
        } catch (e) {
            console.error(e);
            await sock.sendMessage(from, { text: '❌ _Hubo un error al procesar el archivo. Inténtalo de nuevo._' });
        }
    }
};
