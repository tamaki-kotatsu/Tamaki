const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const { exec } = require('child_process');
const axios = require('axios');

const fetchStickerVideo = async (text) => {
  const response = await axios.get('https://skyzxu-brat.hf.space/brat-animated', {
    params: { text },
    responseType: 'arraybuffer'
  });
  if (!response.data) throw new Error('Error al obtener el video de la API.');
  return response.data;
};

module.exports = {
  name: 'bratv',
  alias: ['bratvideo', 'stikerbratv'],
  description: 'Crea un sticker animado estilo Brat a partir de texto.',
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid;

    // Si no se proporciona texto directo, verifica si proviene de un mensaje respondido
    const inputText = texto || m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation;

    if (!inputText) {
      return sock.sendMessage(from, { 
        text: '📦 _Por favor, ingresa un texto o responde a un mensaje para crear el sticker animado._' 
      });
    }

    const tempMp4 = `./bratv-${Date.now()}.mp4`;
    const tempWebp = `./bratv-${Date.now()}.webp`;

    try {
      // 1. Obtener buffer del video desde la API
      const videoBuffer = await fetchStickerVideo(inputText);
      fs.writeFileSync(tempMp4, videoBuffer);

      // 2. Convertir el video MP4 a WebP animado (formato de sticker de WhatsApp)
      exec(`ffmpeg -i ${tempMp4} -vcodec libwebp -filter:v "scale='min(320,iw)':min(320,ih)':force_original_aspect_ratio=decrease,fps=15,pad=320:320:(320-iw)/2:(320-ih)/2:color=0x00000000" -loop 0 -ss 00:00:00 -t 00:00:10 -preset default -an -vsync 0 ${tempWebp}`, async (err) => {
        if (err) {
          console.error(err);
          await sock.sendMessage(from, { text: '✖️ _Ocurrió un error al procesar el sticker animado._' });
        } else {
          // 3. Enviar el sticker animado generado
          await sock.sendMessage(from, { 
            sticker: fs.readFileSync(tempWebp) 
          }, { quoted: m });
        }

        // Limpieza de archivos temporales
        if (fs.existsSync(tempMp4)) fs.unlinkSync(tempMp4);
        if (fs.existsSync(tempWebp)) fs.unlinkSync(tempWebp);
      });

    } catch (e) {
      console.error(e);
      await sock.sendMessage(from, { 
        text: `✖️ _Error al ejecutar el comando:_ ${e.message}` 
      });

      // Limpieza en caso de error previo
      if (fs.existsSync(tempMp4)) fs.unlinkSync(tempMp4);
      if (fs.existsSync(tempWebp)) fs.unlinkSync(tempWebp);
    }
  }
};
