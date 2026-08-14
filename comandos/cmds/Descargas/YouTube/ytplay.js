const ytMusic = require('../../../../sistema/Libreria/music.js');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

module.exports = {
  name: 'play',
  alias: ['play', 'audio', 'musica'],
  description: 'Busca, procesa con FFmpeg y envía música de YouTube Music.',
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid;
    
    if (!texto || !texto.trim()) {
      return sock.sendMessage(from, { 
        text: '❌ *Uso incorrecto.*\n\nEjemplo:\n• `/play Linkin Park Numb`' 
      }, { quoted: m });
    }

    try {
      await sock.sendMessage(from, { text: '🔍 Buscando canción en YouTube Music...' }, { quoted: m });
      
      const searchRes = await ytMusic.search(texto.trim(), 'songs');
      const song = searchRes.results.find(r => r.videoId);

      if (!song) {
        return sock.sendMessage(from, { text: '❌ No encontré ninguna canción con ese nombre.' }, { quoted: m });
      }

      await sock.sendMessage(from, { text: `🎵 *${song.title}*\n⏳ Descargando y convirtiendo audio con FFmpeg...` }, { quoted: m });

      const streamData = await ytMusic.download(song.videoId);

      if (!streamData || !streamData.audioFormats || streamData.audioFormats.length === 0) {
        return sock.sendMessage(from, { text: '❌ No se pudo obtener el audio de este enlace.' }, { quoted: m });
      }

      const audioFormat = streamData.audioFormats.find(f => f.url) || streamData.audioFormats.find(f => f.cipher?.url);
      const targetUrl = audioFormat?.url || audioFormat?.cipher?.url;

      if (!targetUrl) {
        return sock.sendMessage(from, { text: '❌ El formato de audio está protegido o no disponible por YouTube.' }, { quoted: m });
      }

      const randomId = Date.now();
      const outputTemp = `./tmp_output_${randomId}.mp3`;

      try {
        // Hacemos que FFmpeg descargue directamente el enlace con un User-Agent de navegador simulado
        const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36';
        
        const ffmpegCommand = `ffmpeg -user_agent "${userAgent}" -i "${targetUrl}" -vn -ab 128k -ar 44100 -f mp3 "${outputTemp}"`;
        
        await execPromise(ffmpegCommand);

        if (!fs.existsSync(outputTemp)) {
          throw new Error('Fallo al generar el archivo con FFmpeg');
        }

        // Enviamos el audio procesado a WhatsApp
        await sock.sendMessage(from, {
          audio: fs.readFileSync(outputTemp),
          mimetype: 'audio/mp4',
          fileName: `${song.title}.mp3`,
          ptt: false
        }, { quoted: m });

      } finally {
        // Limpieza de archivos temporales
        if (fs.existsSync(outputTemp)) fs.unlinkSync(outputTemp);
      }

    } catch (error) {
      console.error(error);
      await sock.sendMessage(from, { text: `❌ Ocurrió un error al procesar el audio: ${error.message}` }, { quoted: m });
    }
  }
};
