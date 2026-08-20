const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const API_BASE = "https://api-sky.ultraplus.click";
const API_KEY = "sk_7f41a58b-bd6f-4df1-be6c-ea4d64913247";
const MAX_TIMEOUT = 60000;

// Convierte cualquier buffer de audio a MP3 real mediante FFmpeg
function convertToMp3(inputBuffer) {
  return new Promise((resolve, reject) => {
    const tmpDir = path.resolve("./tmp");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const inputPath = path.join(tmpDir, `in_aud_${Date.now()}_${Math.random().toString(36).substring(7)}`);
    const outputPath = path.join(tmpDir, `out_aud_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`);

    fs.writeFileSync(inputPath, inputBuffer);

    exec(`ffmpeg -i "${inputPath}" -vn -ar 44100 -ac 2 -b:a 192k "${outputPath}"`, (error) => {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

      if (error) {
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        return reject(error);
      }

      const mp3Buffer = fs.readFileSync(outputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      resolve(mp3Buffer);
    });
  });
}

// Procesa y convierte imágenes a JPG limpio mediante FFmpeg
function processImageWithFFmpeg(inputBuffer) {
  return new Promise((resolve, reject) => {
    const tmpDir = path.resolve("./tmp");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const inputPath = path.join(tmpDir, `in_img_${Date.now()}_${Math.random().toString(36).substring(7)}`);
    const outputPath = path.join(tmpDir, `out_img_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`);

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

module.exports = {
  name: 'tiktok2',
  alias: ['ttv2', 'ttmp3', 'tiktokmp3'],
  description: 'Descarga de TikTok: audios convertidos a MP3, videos e imágenes procesadas.',
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
      await sock.sendMessage(from, { text: '⏳ _Procesando contenido con FFmpeg..._' }, { quoted: m });

      const data = await getTikTokFromSky(url);

      // CASO 1: EXTRAER AUDIO (/ttmp3)
      if (command === 'ttmp3' || command === 'tiktokmp3') {
        const targetAudioUrl = data.audioUrl || data.videoUrl;
        if (!targetAudioUrl) {
          return sock.sendMessage(from, { text: '❌ _No se encontró audio disponible en esta publicación._' }, { quoted: m });
        }

        const rawRes = await axios.get(targetAudioUrl, { responseType: 'arraybuffer', timeout: 60000 });
        const mp3Buffer = await convertToMp3(Buffer.from(rawRes.data));

        return sock.sendMessage(from, {
          audio: mp3Buffer,
          mimetype: 'audio/mp4',
          ptt: false
        }, { quoted: m });
      }

      // CASO 2: IMÁGENES / CARRUSEL
      if (Array.isArray(data.images) && data.images.length > 0) {
        await sock.sendMessage(from, { text: `📸 _Procesando ${data.images.length} imágenes..._` }, { quoted: m });

        for (let i = 0; i < data.images.length; i++) {
          const imgUrl = typeof data.images[i] === 'string' ? data.images[i] : data.images[i]?.url;
          if (!imgUrl) continue;

          try {
            const res = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 30000 });
            const cleanImage = await processImageWithFFmpeg(Buffer.from(res.data));

            await sock.sendMessage(from, {
              image: cleanImage,
              caption: i === 0 ? `🖼️ *TikTok Fotos*\n📝 *Título:* ${data.title}\n👤 *Autor:* ${data.author}` : ''
            }, { quoted: m });
          } catch (e) {
            console.error(`Error procesando imagen ${i + 1}:`, e);
          }
        }

        // Envío del audio de fondo si existe
        if (data.audioUrl) {
          try {
            const audioRes = await axios.get(data.audioUrl, { responseType: 'arraybuffer', timeout: 60000 });
            const mp3Buffer = await convertToMp3(Buffer.from(audioRes.data));
            await sock.sendMessage(from, {
              audio: mp3Buffer,
              mimetype: 'audio/mp4',
              ptt: false
            }, { quoted: m });
          } catch (e) {}
        }
        return;
      }

      // CASO 3: VIDEO ESTÁNDAR
      if (data.videoUrl) {
        const caption = `╭━━━━━━━━━━━━━━━╮\n   ⚡ *TIKTOK V2*\n╰━━━━━━━━━━━━━━━━╯\n\n📝 *Título:* ${data.title}\n👤 *Autor:* ${data.author}`;
        const videoRes = await axios.get(data.videoUrl, { responseType: 'arraybuffer', timeout: 90000 });

        return sock.sendMessage(from, {
          video: Buffer.from(videoRes.data),
          mimetype: "video/mp4",
          caption: caption
        }, { quoted: m });
      }

      throw new Error("No se encontró contenido compatible en la publicación.");

    } catch (err) {
      console.error("[TIKTOK V2 ERROR]:", err);
      await sock.sendMessage(from, { text: `❌ _Ocurrió un error:_ ${err.message}` }, { quoted: m });
    }
  }
};
