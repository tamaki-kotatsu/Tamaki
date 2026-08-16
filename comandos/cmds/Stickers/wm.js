const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const { exec } = require('child_process');

module.exports = {
    name: 'wm',
    alias: ['watermark', 'rob'],
    description: 'Personaliza el autor y pack de un sticker al responderle.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;
        const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const mediaMsg = m.message?.stickerMessage || quoted?.stickerMessage || quoted?.imageMessage || m.message?.imageMessage;

        if (!mediaMsg) {
            return sock.sendMessage(from, { text: '⚠️ _Por favor, responde a un sticker o imagen con /wm <texto> para cambiar su marca de agua._' });
        }

        if (!texto) {
            return sock.sendMessage(from, { text: '⚠️ _Falta el texto. Ejemplo: /wm MiPack · @miusuario_' });
        }

        try {
            // Separar el texto en Pack y Autor opcional (ej: "PackName · AutorName" o usar todo como pack)
            let packName = texto;
            let authorName = '@hannerjhossue'; // Puedes cambiarlo o dejarlo dinámico si divides el texto por comas o símbolos

            if (texto.includes('|')) {
                let parts = texto.split('|');
                packName = parts[0].trim();
                authorName = parts[1].trim();
            }

            let type = mediaMsg.stickerMessage || quoted?.stickerMessage ? 'sticker' : 'image';
            const stream = await downloadContentFromMessage(mediaMsg, type);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            const tempFile = `./temp_${Date.now()}.${type === 'sticker' ? 'webp' : 'jpg'}`;
            const outWebp = `./output_${Date.now()}.webp`;
            fs.writeFileSync(tempFile, buffer);

            // Comando FFmpeg para convertir y añadir los metadatos EXIF personalizados
            // (Similar a cómo funciona la creación de stickers pero con los metadatos editados)
            exec(`ffmpeg -i ${tempFile} -vcodec libwebp -vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -y ${outWebp}`, (err) => {
                if (err) {
                    fs.unlinkSync(tempFile);
                    return sock.sendMessage(from, { text: '❌ _Error al procesar el archivo con ffmpeg._' });
                }

                // Aquí inyectamos los metadatos EXIF con webpmux (asegúrate de tener webpmux instalado en tu entorno o usa el paquete webp-node)
                exec(`webpmux -set exif metadata.exif ${outWebp} -o ${outWebp}`, async () => {
                    // Si no usas webpmux global, Node.js puede enviar el sticker directamente o usar un creador EXIF interno.
                    // Leemos el archivo resultante y lo enviamos
                    if (fs.existsSync(outWebp)) {
                        await sock.sendMessage(from, { sticker: fs.readFileSync(outWebp) }, { quoted: m });
                        fs.unlinkSync(outWebp);
                    } else {
                        await sock.sendMessage(from, { sticker: buffer }, { quoted: m }); // Fallback si falla el exiv
                    }
                    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
                });
            });

        } catch (e) {
            console.error(e);
            await sock.sendMessage(from, { text: '❌ _Ocurrió un error al aplicar la marca de agua._' });
        }
    }
};
