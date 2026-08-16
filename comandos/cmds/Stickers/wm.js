const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const { exec } = require('child_process');

module.exports = {
    name: 'wm',
    alias: ['watermark', 'rob'],
    description: 'Crea o cambia la marca de agua de un sticker.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;
        const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const mediaMsg = m.message?.stickerMessage || quoted?.stickerMessage || quoted?.imageMessage || m.message?.imageMessage;

        if (!mediaMsg) {
            return sock.sendMessage(from, { text: '⚠️ Responde a un sticker o imagen con /wm <texto>' });
        }

        if (!texto) {
            return sock.sendMessage(from, { text: '⚠️ Debes escribir el texto. Ejemplo: /wm Mi Texto Personalizado' });
        }

        try {
            let type = mediaMsg.stickerMessage || quoted?.stickerMessage ? 'sticker' : 'image';
            const stream = await downloadContentFromMessage(mediaMsg, type);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            const tempFile = `./temp_${Date.now()}.${type === 'sticker' ? 'webp' : 'jpg'}`;
            const outWebp = `./output_${Date.now()}.webp`;
            fs.writeFileSync(tempFile, buffer);

            exec(`ffmpeg -i ${tempFile} -vcodec libwebp -vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -y ${outWebp}`, async (err) => {
                if (err) {
                    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
                    return sock.sendMessage(from, { text: '❌ Error al procesar con ffmpeg.' });
                }

                const img = fs.readFileSync(outWebp);
                const exifAttr = Buffer.from([
                    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00
                ]);
                
                const jsonic = {
                    "sticker-pack-id": "com.bot.whatsapp",
                    "sticker-pack-name": texto, // Aquí va todo el texto completo sin separadores
                    "sticker-pack-publisher": "", 
                    "emojis": ["🤖"]
                };
                
                const latin1 = JSON.stringify(jsonic);
                const latin1Buffer = Buffer.from(latin1, 'utf-8');
                const exif = Buffer.concat([exifAttr, latin1Buffer]);
                exif.writeUIntLE(latin1Buffer.length, 14, 4);
                
                img.write(exif, 12);
                
                await sock.sendMessage(from, { sticker: img }, { quoted: m });

                if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
                if (fs.existsSync(outWebp)) fs.unlinkSync(outWebp);
            });

        } catch (e) {
            console.error(e);
            await sock.sendMessage(from, { text: '❌ Ocurrió un error inesperado al procesar el archivo.' });
        }
    }
};
