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

  const r = res.result;
  return {
    title: r.title || "TikTok",
    author: (r.author && (r.author.name || r.author.username)) || "Desconocido",
    videoUrl: r.media?.video || null,
    images: r.media?.images || r.images || [],
    audioUrl: r.media?.audio || null,
  };
}

// Procesa y limpia imagen mediante ffmpeg
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
  description: 'Descarga videos, carrusel de fotos (procesadas con ffmpeg) y audios de TikTok.',
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid;
    const command = (m.text || m.caption || "").trim().split(' ')[0].slice(1).toLowerCase();
    
    // Extrae la primera URL de TikTok encontrada en el texto enviada
    const matchUrl = (texto || "").match(/https?:\/\/(www\.|vm\.|vt\.)?tiktok\.com\/[^\s]+/i);
    const url = matchUrl ? matchUrl[0] : null;

    if (!url) {
      return sock.sendMessage(from, { text: '❌ _Ingresa un enlace válido de TikTok._\n\n*Uso:* /ttv2 <url> o /ttmp3 <url>' }, { quoted: m });
    }

    try {
      await sock.sendMessage(from, { text: '⏳ _Procesando contenido de TikTok..._' }, { quoted: m });

      const data = await getTikTokFromSky(url);

      // Si el comando usado es para extraer audio
      if (command === 'ttmp3' || command === 'tiktokmp3') {
        const audioSrc = data.audioUrl || data.videoUrl;
        if (!audioSrc) {
          return sock.sendMessage(from, { text: '❌ _No se encontró pista de audio disponible en esta publicación._' }, { quoted: m });
        }

        return sock.sendMessage(from, {
          audio: { url: audioSrc },
          mimetype: 'audio/mp4',
          fileName: `${data.title.slice(0, 30)}.mp3`
        }, { quoted: m });
      }

      // CASO 1: Publicación de Imágenes (Carrusel / Slideshow)
      if (data.images && data.images.length > 0) {
        await sock.sendMessage(from, { text: `📸 _Se detectó un carrusel con ${data.images.length} imágenes. Procesando con FFmpeg..._` }, { quoted: m });

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

        // Si incluye música/audio de fondo lo envía al finalizar
        if (data.audioUrl) {
          await sock.sendMessage(from, {
            audio: { url: data.audioUrl },
            mimetype: 'audio/mp4',
            fileName: 'tiktok_sound.mp3'
          }, { quoted: m });
        }
        return;
      }

      // CASO 2: Publicación de Video
      if (data.videoUrl) {
        const caption = `╭━━━━━━━━━━━━━━━╮\n   ⚡ *TIKTOK V2*\n╰━━━━━━━━━━━━━━━━╯\n\n📝 *Título:* ${data.title}\n👤 *Autor:* ${data.author}`;

        return sock.sendMessage(from, {
          video: { url: data.videoUrl },
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
