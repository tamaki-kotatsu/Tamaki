const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const API_BASE = "https://api-sky.ultraplus.click";
const API_KEY = "sk_7f41a58b-bd6f-4df1-be6c-ea4d64913247";
const MAX_TIMEOUT = 60000;

// Descarga un archivo a disco para evitar streams corruptos
async function downloadFile(url, outputPath) {
  const res = await axios.get(url, { responseType: 'stream', timeout: 60000 });
  const writer = fs.createWriteStream(outputPath);
  res.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(outputPath));
    writer.on('error', reject);
  });
}

// Convierte cualquier entrada a MP3 real
function convertToMp3(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    exec(`ffmpeg -y -i "${inputPath}" -vn -ar 44100 -ac 2 -b:a 192k "${outputPath}"`, (error) => {
      if (error) return reject(error);
      resolve(outputPath);
    });
  });
}

// Convierte/limpia imágenes con FFmpeg
function processImageWithFFmpeg(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    exec(`ffmpeg -y -i "${inputPath}" -q:v 2 "${outputPath}"`, (error) => {
      if (error) return reject(error);
      resolve(outputPath);
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

  // Mapea las posibles ubicaciones de imágenes en la respuesta de la API
  let imgList = [];
  if (Array.isArray(media.images) && media.images.length > 0) imgList = media.images;
  else if (Array.isArray(r.images) && r.images.length > 0) imgList = r.images;

  return {
    title: r.title || "TikTok",
    author: (r.author && (r.author.name || r.author.username)) || "Desconocido",
    videoUrl: media.video || null,
    images: imgList,
    audioUrl: media.audio || null,
  };
}

module.exports = {
  name: 'tiktok2',
  alias: ['ttv2', 'ttmp3', 'tiktokmp3'],
  description: 'Descarga de TikTok: audios MP3 nativos, videos e imágenes procesadas.',
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid;
    const bodyText = (m.text || m.caption || texto || "").trim();
    const command = bodyText.split(' ')[0].replace(/^[^\w\s]/, '').toLowerCase();

    const matchUrl = bodyText.match(/https?:\/\/(www\.|vm\.|vt\.)?tiktok\.com\/[^\s]+/i);
    const url = matchUrl ? matchUrl[0] : null;

    if (!url) {
      return sock.sendMessage(from, { text: '❌ _Ingresa un enlace válido de TikTok._\n\n*Uso:* /ttv2 <url> o /ttmp3 <url>' }, { quoted: m });
    }

    const tmpDir = path.resolve("./tmp");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    try {
      await sock.sendMessage(from, { text: '⏳ _Procesando contenido..._' }, { quoted: m });

      const data = await getTikTokFromSky(url);

      // 1. COMANDO AUDIO (/ttmp3)
      if (command === 'ttmp3' || command === 'tiktokmp3') {
        const targetAudioUrl = data.audioUrl || data.videoUrl;
        if (!targetAudioUrl) {
          return sock.sendMessage(from, { text: '❌ _No se encontró audio disponible en esta publicación._' }, { quoted: m });
        }

        const rawAudioPath = path.join(tmpDir, `raw_${Date.now()}.mp4`);
        const mp3Path = path.join(tmpDir, `aud_${Date.now()}.mp3`);

        await downloadFile(targetAudioUrl, rawAudioPath);
        await convertToMp3(rawAudioPath, mp3Path);

        const audioBuffer = fs.readFileSync(mp3Path);

        // Limpieza de temporales
        try { fs.unlinkSync(rawAudioPath); fs.unlinkSync(mp3Path); } catch (e) {}

        return sock.sendMessage(from, {
          audio: audioBuffer,
          mimetype: 'audio/mpeg',
          ptt: false
        }, { quoted: m });
      }

      // 2. CARRUSEL DE IMÁGENES
      if (data.images.length > 0) {
        await sock.sendMessage(from, { text: `📸 _Encontradas ${data.images.length} imágenes. Enviando..._` }, { quoted: m });

        for (let i = 0; i < data.images.length; i++) {
          const rawUrl = typeof data.images[i] === 'string' ? data.images[i] : data.images[i]?.url;
          if (!rawUrl) continue;

          const rawImgPath = path.join(tmpDir, `raw_img_${i}_${Date.now()}`);
          const cleanImgPath = path.join(tmpDir, `clean_img_${i}_${Date.now()}.jpg`);

          try {
            await downloadFile(rawUrl, rawImgPath);
            await processImageWithFFmpeg(rawImgPath, cleanImgPath);

            const imgBuffer = fs.readFileSync(cleanImgPath);

            await sock.sendMessage(from, {
              image: imgBuffer,
              caption: i === 0 ? `🖼️ *TikTok Fotos*\n📝 *Título:* ${data.title}\n👤 *Autor:* ${data.author}` : ''
            }, { quoted: m });

            try { fs.unlinkSync(rawImgPath); fs.unlinkSync(cleanImgPath); } catch (e) {}
          } catch (e) {
            console.error(`Error procesando imagen ${i + 1}:`, e);
          }
        }
        return;
      }

      // 3. VIDEO
      if (data.videoUrl) {
        const videoPath = path.join(tmpDir, `vid_${Date.now()}.mp4`);
        await downloadFile(data.videoUrl, videoPath);

        const videoBuffer = fs.readFileSync(videoPath);
        try { fs.unlinkSync(videoPath); } catch (e) {}

        const caption = `╭━━━━━━━━━━━━━━━╮\n   ⚡ *TIKTOK V2*\n╰━━━━━━━━━━━━━━━━╯\n\n📝 *Título:* ${data.title}\n👤 *Autor:* ${data.author}`;

        return sock.sendMessage(from, {
          video: videoBuffer,
          mimetype: "video/mp4",
          caption: caption
        }, { quoted: m });
      }

      throw new Error("No se encontró contenido descargable.");

    } catch (err) {
      console.error("[TIKTOK V2 ERROR]:", err);
      await sock.sendMessage(from, { text: `❌ _Ocurrió un error:_ ${err.message}` }, { quoted: m });
    }
  }
};
