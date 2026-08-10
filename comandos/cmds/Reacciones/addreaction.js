const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const axios = require('axios');
const FormData = require('form-data');

async function uploadToCatbox(buffer, filename) {
  const form = new FormData();
  form.append('reqtype', 'fileupload');
  form.append('fileToUpload', buffer, { filename });

  const response = await axios.post('https://catbox.moe/user/api.php', form, {
    headers: {
      ...form.getHeaders(),
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
    }
  });

  return response.data;
}

module.exports = {
  name: 'addreaction',
  alias: ['subir', 'catbox', 'addgif'],
  description: 'Sube un video/GIF a Catbox y genera el JSON formateado.',
  run: async (sock, m, args) => {
    const from = m.key.remoteJid;

    let textInput = '';
    if (typeof args === 'string') textInput = args;
    else if (Array.isArray(args)) textInput = args.join(' ');
    else if (args && typeof args === 'object' && args.text) textInput = args.text;

    const contextInfo = m.message?.extendedTextMessage?.contextInfo;
    const quotedMsg = contextInfo?.quotedMessage;

    const video = m.message?.videoMessage || quotedMsg?.videoMessage || quotedMsg?.viewOnceMessageV2?.message?.videoMessage;
    const image = m.message?.imageMessage || quotedMsg?.imageMessage || quotedMsg?.viewOnceMessageV2?.message?.imageMessage;

    const mediaMsg = video || image;
    const mediaType = video ? 'video' : image ? 'image' : null;

    if (!mediaMsg) {
      return sock.sendMessage(from, { 
        text: '🦦 _Responde a un video, GIF o imagen usando el comando:_\n\n' +
              '`.addreaction Nombre del Anime | Capítulo | Minuto | Categoria`\n\n' +
              '*Ejemplo:*\n`.addreaction Darling in the Franxx | Cap. 1 | 12:35 | hug`' 
      }, { quoted: m });
    }

    try {
      await sock.sendMessage(from, { text: '⚙️ _Procesando y subiendo archivo a Catbox..._' }, { quoted: m });

      const splitArgs = textInput ? textInput.split('|').map(item => item.trim()) : [];
      const anime = splitArgs[0] || 'Anime Desconocido';
      const episode = splitArgs[1] || 'Cap. ??';
      const time = splitArgs[2] || '00:00';
      const category = splitArgs[3] || 'general';

      const stream = await downloadContentFromMessage(mediaMsg, mediaType);
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      const extension = mediaType === 'video' ? 'mp4' : 'jpg';
      const filename = `reaction_${Date.now()}.${extension}`;

      const catboxUrl = await uploadToCatbox(buffer, filename);

      if (typeof catboxUrl !== 'string' || !catboxUrl.startsWith('http')) {
        throw new Error(`Respuesta de servidor inválida: ${catboxUrl}`);
      }

      const jsonTemplate = `{
  "url": "${catboxUrl.trim()}",
  "anime": "${anime}",
  "episode": "${episode}",
  "time": "${time}"
}`;

      const replyText = 
`✅ *¡Archivo subido con éxito!*

🔗 *URL Directa:*
${catboxUrl.trim()}

📁 *Categoría:* \`${category}\`

📋 *Copia este fragmento en tu database:*
\`\`\`json
${jsonTemplate}
\`\`\``;

      await sock.sendMessage(from, { text: replyText }, { quoted: m });

    } catch (e) {
      console.error('[ADDREACTION ERROR]:', e);
      await sock.sendMessage(from, { 
        text: `❌ _Error al procesar el comando._\n\n📌 *Detalle del error:* ${e.message || e}` 
      }, { quoted: m });
    }
  }
};
