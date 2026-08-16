const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'wm',
    alias: ['watermark', 'rob'],
    description: 'Añade tu texto o marca de agua a una imagen, video, gif o sticker al que respondas.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;
        const sender = m.key.participant || from;

        // Identificar mensaje citado (imagen, video, sticker)
        const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const mediaMsg = m.message?.imageMessage || m.message?.videoMessage || m.message?.stickerMessage || 
                         quoted?.imageMessage || quoted?.videoMessage || quoted?.stickerMessage;

        if (!mediaMsg) {
            return sock.sendMessage(from, { text: '⚠️ _Responde a una imagen, video, gif o sticker para aplicar el texto._' });
        }

        // Jerarquía de textos: 1. Texto ingresado en el comando | 2. Texto personal (/sw) | 3. Texto del grupo (/gw)
        let finalTexto = texto;
        
        if (!finalTexto) {
            const userDb = global.db?.data?.users?.[sender];
            const chatDb = global.db?.data?.chats?.[from];

            finalTexto = userDb?.wmText || chatDb?.wmText || 'Mi Bot'; // Texto por defecto general si no hay nada configurado
        }

        try {
            // Descargar el contenido multimedia de forma segura
            let type = '';
            if (mediaMsg.imageMessage) type = 'image';
            else if (mediaMsg.videoMessage) type = 'video';
            else if (mediaMsg.stickerMessage) type = 'sticker';
            else if (quoted?.imageMessage) type = 'image';
            else if (quoted?.videoMessage) type = 'video';
            else if (quoted?.stickerMessage) type = 'sticker';

            const stream = await downloadContentFromMessage(mediaMsg, type);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // Reenviar el archivo con el texto (caption) obtenido
            if (type === 'image') {
                await sock.sendMessage(from, { image: buffer, caption: finalTexto }, { quoted: m });
            } else if (type === 'video') {
                await sock.sendMessage(from, { video: buffer, caption: finalTexto, mimetype: 'video/mp4' }, { quoted: m });
            } else if (type === 'sticker') {
                // Si es sticker y quieres enviarlo con texto o como imagen descriptiva según prefieras
                await sock.sendMessage(from, { sticker: buffer }, { quoted: m });
            }

        } catch (e) {
            console.log(e);
            await sock.sendMessage(from, { text: '❌ _Hubo un error al procesar el archivo multimedia._' });
        }
    }
};
