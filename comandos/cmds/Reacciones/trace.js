const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const axios = require('axios');
const fs = require('fs');
const { exec } = require('child_process');

module.exports = {
  name: 'whatanime',
  alias: ['trace', 'buscaranime'],
  description: 'Identifica el anime, capítulo y minuto a partir de una imagen.',
  run: async (sock, m) => {
    const from = m.key.remoteJid;

    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const imageMsg = m.message?.imageMessage || quoted?.imageMessage;

    if (!imageMsg) {
      return sock.sendMessage(from, { text: '🦦 _Envía o responde a una imagen con el comando para identificar el anime._' }, { quoted: m });
    }

    try {
      await sock.sendMessage(from, { text: '🔍 _Buscando coincidencias..._' }, { quoted: m });

      // Descargar imagen enviada por el usuario
      const stream = await downloadContentFromMessage(imageMsg, 'image');
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      // Consulta a la API de trace.moe
      const response = await axios.post('https://api.trace.moe/search', buffer, {
        headers: { 'Content-Type': 'image/jpeg' }
      });

      const result = response.data?.result?.[0];

      if (!result) {
        return sock.sendMessage(from, { text: '❌ _No se encontraron coincidencias._' }, { quoted: m });
      }

      const formatTime = (seconds) => {
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min}:${sec < 10 ? '0' : ''}${sec}`;
      };

      const animeTitle = result.filename || 'Desconocido';
      const episode = result.episode || 'N/A';
      const fromTime = formatTime(result.from);
      const toTime = formatTime(result.to);
      const similarity = (result.similarity * 100).toFixed(1);

      const captionText = 
`📺 *Anime:* ${animeTitle}
🎬 *Episodio:* ${episode}
⏱️ *Minuto:* ${fromTime} - ${toTime}
🎯 *Similitud:* ${similarity}%

───────────────
✨ *Respuesta impulsada por trace.moe*`;

      if (result.video) {
        const id = Date.now();
        const inputPath = `./temp_in_${id}.mp4`;
        const outputPath = `./temp_out_${id}.mp4`;

        // 1. Descargar el fragmento original
        const videoRes = await axios.get(result.video, { responseType: 'arraybuffer' });
        fs.writeFileSync(inputPath, videoRes.data);

        // 2. Re-codificar el video con FFmpeg para WhatsApp
        exec(`ffmpeg -y -i ${inputPath} -c:v libx264 -pix_fmt yuv420p -preset ultrafast -movflags +faststart ${outputPath}`, async (err) => {
          if (!err && fs.existsSync(outputPath)) {
            await sock.sendMessage(from, {
              video: fs.readFileSync(outputPath),
              caption: captionText
            }, { quoted: m });
          } else {
            // Alternativa en caso de fallo en la conversión: enviar la captura en imagen
            await sock.sendMessage(from, {
              image: { url: result.image },
              caption: captionText
            }, { quoted: m });
          }

          // Limpiar archivos temporales
          if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
          if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        });

      } else {
        await sock.sendMessage(from, {
          image: { url: result.image },
          caption: captionText
        }, { quoted: m });
      }

    } catch (e) {
      console.error(e);
      await sock.sendMessage(from, { text: '❌ _Ocurrió un error al procesar la imagen._' }, { quoted: m });
    }
  }
};
