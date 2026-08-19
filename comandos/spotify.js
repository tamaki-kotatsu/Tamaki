const axios = require("axios");

let handler = {
    name: 'spotify',
    alias: ['sp', 'cancion', 'spotifydl'],
    command: ['spotify', 'sp'],
    description: 'Busca y descarga música de Spotify en audio.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;

        if (!texto) {
            return sock.sendMessage(from, { 
                text: '⚠️ Por favor, ingresa el nombre de una canción o enlace de Spotify.\n\n*Ejemplo:* /sp despacito' 
            }, { quoted: m });
        }

        try {
            await sock.sendMessage(from, { text: '🔍 Buscando y preparando tu audio de Spotify...' }, { quoted: m });

            // Detectar si es URL o texto de búsqueda
            const isUrl = /spotify\.com/i.test(texto);
            const body = isUrl ? { url: texto } : { query: texto };

            // Usamos el endpoint correcto de descarga (/spotify)
            const { data } = await axios.post(
                "https://api-sky.ultraplus.click/spotify",
                body,
                { 
                    headers: { 
                        "apikey": "sk_7f41a58b-bd6f-4df1-be6c-ea4d64913247",
                        "Content-Type": "application/json"
                    },
                    timeout: 30000
                }
            );

            if (!data || (data.status !== true && data.status !== "true")) {
                return sock.sendMessage(from, { text: '❌ No se pudo procesar la canción en este momento.' }, { quoted: m });
            }

            const title = data.result?.title || "Spotify Track";
            const artist = data.result?.artist || "Desconocido";
            const audioUrl = data.result?.media?.audio;

            if (!audioUrl) {
                return sock.sendMessage(from, { text: '❌ No se encontró el enlace de descarga para este audio.' }, { quoted: m });
            }

            // Enviar la información de la canción
            let infoTexto = `🎵 *Spotify - Descarga*\n\n` +
                            `* *Título:* ${title}\n` +
                            `* *Artista:* ${artist}`;

            await sock.sendMessage(from, { text: infoTexto }, { quoted: m });

            // Enviar el archivo de audio (MP3) directamente al chat
            await sock.sendMessage(from, {
                audio: { url: audioUrl },
                mimetype: 'audio/mpeg',
                fileName: `${title} - ${artist}.mp3`
            }, { quoted: m });

        } catch (error) {
            console.error('Error en el plugin de Spotify:', error);
            await sock.sendMessage(from, { text: '❌ Ocurrió un error al intentar conectar con la API de Spotify.' }, { quoted: m });
        }
    }
};

module.exports = handler;
