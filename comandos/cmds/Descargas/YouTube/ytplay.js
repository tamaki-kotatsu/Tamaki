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

      // Buscamos un formato de audio que tenga URL directa disponible
      const audioFormat = streamData.audioFormats.find(f => f.url) || streamData.audioFormats.find(f => f.cipher?.url);
      const targetUrl = audioFormat?.url || audioFormat?.cipher?.url;

      if (!targetUrl) {
        return sock.sendMessage(from, { text: '❌ El formato de audio está protegido o no disponible por YouTube.' }, { quoted: m });
      }

      const randomId = Date.now();
      const inputTemp = `./tmp_input_${randomId}.mp4`;
      const outputTemp = `./tmp_output_${randomId}.mp3`;

      try {
        // Descargamos el stream binario de la URL
        const response = await fetch(targetUrl);
        if (!response.ok) throw new Error(`Falló la descarga del stream (${response.status})`);
        
        const bufferStream = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(inputTemp, bufferStream);

        // Convertimos a MP3 estándar con FFmpeg para compatibilidad total con WhatsApp
        await execPromise(`ffmpeg -i "${inputTemp}" -vn -ab 128k -ar 44100 -f mp3 "${outputTemp}"`);

        if (!fs.existsSync(outputTemp)) {
          throw new Error('Fallo al generar el archivo con FFmpeg');
        }

        // Enviamos el audio procesado
        await sock.sendMessage(from, {
          audio: fs.readFileSync(outputTemp),
          mimetype: 'audio/mp4',
          fileName: `${song.title}.mp3`,
          ptt: false
        }, { quoted: m });

      } finally {
        // Limpieza de archivos temporales
        if (fs.existsSync(inputTemp)) fs.unlinkSync(inputTemp);
        if (fs.existsSync(outputTemp)) fs.unlinkSync(outputTemp);
      }

    } catch (error) {
      console.error(error);
      await sock.sendMessage(from, { text: `❌ Ocurrió un error al procesar el audio: ${error.message}` }, { quoted: m });
    }
  }
};
