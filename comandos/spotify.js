const axios = require('axios');

let handler = {
    name: 'spotify',
    alias: ['sp', 'cancion'],
    command: ['spotify', 'sp'],
    description: 'Busca y descarga música de Spotify.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;

        // 1. Validar si el usuario escribió la canción o link
        if (!texto) {
            return sock.sendMessage(from, { 
                text: '⚠️ Por favor, ingresa el nombre de una canción o enlace de Spotify.\n\n*Ejemplo:* /sp despacito' 
            }, { quoted: m });
        }

        try {
            await sock.sendMessage(from, { text: '🔍 Buscando en Spotify, por favor espera...' }, { quoted: m });

            // 2. Determinar si es URL o texto de búsqueda (idéntico al otro bot)
            const isUrl = /spotify\.com/i.test(texto);
            const body = isUrl ? { url: texto } : { query: texto };

            // 3. Petición POST a la API correcta (/spotify)
            let response = await axios.post("https://api-sky.ultraplus.click/spotify", body, {
                headers: {
                    "apikey": "sk_7f41a58b-bd6f-4df1-be6c-ea4d64913247",
                    "Content-Type": "application/json"
                },
                timeout: 30000
            });

            let data = response.data;

            // Validar si la API respondió con éxito
            if (!data || (data.status !== true && data.status !== "true")) {
                return sock.sendMessage(from, { text: '❌ No se encontró la canción o hubo un error en la API.' }, { quoted: m });
            }

            const title = data.result?.title || "Spotify Track";
            const artist = data.result?.artist || "Desconocido";
            const audioUrl = data.result?.media?.audio;

            if (!audioUrl) {
                return sock.sendMessage(from, { text: '❌ No se pudo obtener el enlace de descarga del audio.' }, { quoted: m });
            }

            // 4. Enviar la información de la canción
            let infoTexto = `🎵 *Spotify - Encontrado*\n\n` +
                            `* *Título:* ${title}\n` +
                            `* *Artista:* ${artist}`;

            await sock.sendMessage(from, { text: infoTexto }, { quoted: m });

            // 5. Enviar el archivo de audio directamente al chat
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
