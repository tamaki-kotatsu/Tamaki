const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const API_BASE = "https://api-sky.ultraplus.click";
const API_KEY = "sk_7f41a58b-bd6f-4df1-be6c-ea4d64913247";
const MAX_TIMEOUT = 60000;

async function getTikTokFromSky(url) {
  const { data: res, status: http } = await axios.post(
    `${API_BASE}/tiktok`,
    { url },
    {
      headers: {
        apikey: API_KEY,
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: MAX_TIMEOUT,
      validateStatus: (s) => s >= 200 && s < 600,
    }
  );

  if (http !== 200 || !res || res.status !== true) {
    throw new Error(res?.message || "La API no devolvió una respuesta válida.");
  }

  const r = res.result || {};
  const media = r.media || {};

  return {
    title: r.title || "TikTok",
    author: (r.author && (r.author.name || r.author.username)) || "Desconocido",
    videoUrl: media.video || null,
    images: media.images || r.images || [],
    audioUrl: media.audio || null,
  };
}

function processImageWithFFmpeg(inputBuffer) {
  return new Promise((resolve, reject) => {
    const tmpDir = path.resolve("./tmp");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const inputPath = path.join(tmpDir, `in_${Date.now()}_${Math.random().toString(36).substring(7)}`);
    const outputPath = path.join(tmpDir, `out_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`);

    fs.writeFileSync(inputPath, inputBuffer);

    exec(`ffmpeg -i "${inputPath}" -q:v 2 "${outputPath}"`, (error) => {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

      if (error) {
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        return reject(error);
      }

      const cleanBuffer = fs.readFileSync(outputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      resolve(cleanBuffer);
    });
  });
}

module.exports = {
  name: 'tiktok2',
  alias: ['ttv2', 'ttmp3', 'tiktokmp3'],
  description: 'Descarga videos, carrusel de fotos procesadas y audios mp3 de TikTok.',
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid;
    const bodyText = (m.text || m.caption || texto || "").trim();
    const command = bodyText.split(' ')[0].replace(/^[^\w\s]/, '').toLowerCase();
    
    const matchUrl = bodyText.match(/https?:\/\/(www\.|vm\.|vt\.)?tiktok\.com\/[^\s]+/i);
    const url = matchUrl ? matchUrl[0] : null;

    if (!url) {
      return sock.sendMessage(from, { text: '❌ _Ingresa un enlace válido de TikTok._\n\n*Uso:* /ttv2 <url> o /ttmp3 <url>' }, { quoted: m });
    }

    try {
      await sock.sendMessage(from, { text: '⏳ _Procesando contenido de TikTok..._' }, { quoted: m });

      const data = await getTikTokFromSky(url);

      // CASO AUDIO (/ttmp3)
      if (command === 'ttmp3' || command === 'tiktokmp3') {
        const targetAudioUrl = data.audioUrl || data.videoUrl;
        if (!targetAudioUrl) {
          return sock.sendMessage(from, { text: '❌ _No se encontró pista de audio disponible en esta publicación._' }, { quoted: m });
        }

        // Descargamos el buffer antes de enviarlo para forzar el mimetype correcto de audio
        const audioRes = await axios.get(targetAudioUrl, { responseType: 'arraybuffer', timeout: 60000 });
        const audioBuffer = Buffer.from(audioRes.data);

        return sock.sendMessage(from, {
          audio: audioBuffer,
          mimetype: 'audio/mp4',
          ptt: false
        }, { quoted: m });
      }

      // CASO IMÁGENES (Carrusel / Slideshow)
      if (Array.isArray(data.images) && data.images.length > 0) {
        await sock.sendMessage(from, { text: `📸 _Se detectaron ${data.images.length} imágenes. Procesando..._` }, { quoted: m });

        for (let i = 0; i < data.images.length; i++) {
          const imgUrl = typeof data.images[i] === 'string' ? data.images[i] : data.images[i]?.url;
          if (!imgUrl) continue;

          try {
            const res = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 30000 });
            const cleanImageBuffer = await processImageWithFFmpeg(Buffer.from(res.data));

            await sock.sendMessage(from, {
              image: cleanImageBuffer,
              caption: i === 0 ? `🖼️ *TikTok Fotos*\n📝 *Título:* ${data.title}\n👤 *Autor:* ${data.author}` : ''
            }, { quoted: m });
          } catch (e) {
            console.error(`Error procesando imagen ${i + 1}:`, e);
          }
        }

        if (data.audioUrl) {
          try {
            const audioRes = await axios.get(data.audioUrl, { responseType: 'arraybuffer', timeout: 60000 });
            await sock.sendMessage(from, {
              audio: Buffer.from(audioRes.data),
              mimetype: 'audio/mp4',
              ptt: false
            }, { quoted: m });
          } catch (e) {}
        }
        return;
      }

      // CASO VIDEO ESTÁNDAR
      if (data.videoUrl) {
        const caption = `╭━━━━━━━━━━━━━━━╮\n   ⚡ *TIKTOK V2*\n╰━━━━━━━━━━━━━━━━╯\n\n📝 *Título:* ${data.title}\n👤 *Autor:* ${data.author}`;

        const videoRes = await axios.get(data.videoUrl, { responseType: 'arraybuffer', timeout: 90000 });

        return sock.sendMessage(from, {
          video: Buffer.from(videoRes.data),
          mimetype: "video/mp4",
          caption: caption
        }, { quoted: m });
      }

      throw new Error("No se halló formato compatible en el enlace provisto.");

    } catch (err) {
      console.error("[TIKTOK V2 ERROR]:", err);
      await sock.sendMessage(from, { text: `❌ _Ocurrió un error:_ ${err.message}` }, { quoted: m });
    }
  }
};
