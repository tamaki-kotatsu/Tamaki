const ytMusic = require('../../../../sistema/Libreria/music.js');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

module.exports = {
  name: 'ytmusic',
  alias: ['yts', 'musica', 'play', 'audio'],
  description: 'Busca, procesa con FFmpeg y envía música de YouTube Music.',
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid;
    
    if (!texto || !texto.trim()) {
      return sock.sendMessage(from, { 
        text: '❌ *Uso incorrecto.*\n\nEjemplo:\n• `/play Linkin Park Numb`' 
      }, { quoted: m });
    }

    const args = texto.trim().split(' ');
    const command = args[0].toLowerCase();
    const query = args.slice(1).join(' ');

    try {
      const songQuery = ['play', 'audio', 'ytm', 'musica'].includes(command) ? query : texto;

      if (!songQuery) {
        return sock.sendMessage(from, { text: '⚠️ Escribe el nombre de la canción que quieres reproducir.' }, { quoted: m });
      }

      await sock.sendMessage(from, { text: '🔍 Buscando canción...' }, { quoted: m });
      
      const searchRes = await ytMusic.search(songQuery, 'songs');
      const song = searchRes.results.find(r => r.videoId);

      if (!song) {
        return sock.sendMessage(from, { text: '❌ No encontré ninguna canción con ese nombre.' }, { quoted: m });
      }

      await sock.sendMessage(from, { text: '🎵 ' + song.title + '\n⏳ Descargando y convirtiendo audio con FFmpeg...' }, { quoted: m });

      const streamData = await ytMusic.download(song.videoId);

      if (!streamData || !streamData.audioFormats || streamData.audioFormats.length === 0) {
        return sock.sendMessage(from, { text: '❌ No se pudo obtener el audio de este enlace.' }, { quoted: m });
      }

      // Buscamos un formato que tenga URL directa
      const audioFormat = streamData.audioFormats.find(f => f.url) || streamData.audioFormats[0];

      if (!audioFormat || !audioFormat.url) {
        return sock.sendMessage(from, { text: '❌ El formato de audio está protegido o no disponible.' }, { quoted: m });
      }

      // Archivos temporales únicos para evitar conflictos
      const randomId = Date.now();
      const inputTemp = `./tmp_input_${randomId}.mp4`;
      const outputTemp = `./tmp_output_${randomId}.mp3`;

      try {
        // 1. Descargamos el stream crudo de la URL a un archivo temporal usando fetch
        const response = await fetch(audioFormat.url);
        if (!response.ok) throw new Error(`Falló la descarga del stream (${response.status})`);
        const bufferStream = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(inputTemp, bufferStream);

        // 2. Procesamos y convertimos estrictamente con FFmpeg a MP3 estándar compatible con WhatsApp
        await execPromise(`ffmpeg -i "${inputTemp}" -vn -ab 128k -ar 44100 -f mp3 "${outputTemp}"`);

        // 3. Verificamos que se haya creado el archivo convertido
        if (!fs.existsSync(outputTemp)) {
          throw new Error('Fallo al generar el archivo con FFmpeg');
        }

        // 4. Enviamos el audio procesado correctamente
        await sock.sendMessage(from, {
          audio: fs.readFileSync(outputTemp),
          mimetype: 'audio/mp4',
          fileName: `${song.title}.mp3`,
          ptt: false // Cambia a true si quieres que se envíe como nota de voz
        }, { quoted: m });

      } finally {
        // Limpieza de archivos temporales de forma segura
        if (fs.existsSync(inputTemp)) fs.unlinkSync(inputTemp);
        if (fs.existsSync(outputTemp)) fs.unlinkSync(outputTemp);
      }

    } catch (error) {
      console.error(error);
      await sock.sendMessage(from, { text: `❌ Ocurrió un error al procesar el audio: ${error.message}` }, { quoted: m });
    }
  }
};
