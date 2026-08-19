const axios = require("axios");

let handler = {
    name: 'spotify',
    alias: ['sp', 'cancion'],
    command: ['spotify', 'sp'],
    description: 'Busca canciones en Spotify.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;

        if (!texto) {
            return sock.sendMessage(from, { 
                text: '⚠️ Por favor, ingresa el nombre de la canción que deseas buscar.\n\n*Ejemplo:* /sp despacito' 
            }, { quoted: m });
        }

        try {
            await sock.sendMessage(from, { text: '🔍 Buscando en Spotify...' }, { quoted: m });

            const { data } = await axios.post(
                "https://api-sky.ultraplus.click/search/spotify",
                { query: texto },
                { 
                    headers: { 
                        "apikey": "sk_7f41a58b-bd6f-4df1-be6c-ea4d64913247",
                        "Content-Type": "application/json"
                    } 
                }
            );

            if (!data.status) {
                throw new Error("La API no devolvió un estado exitoso.");
            }

            // Obtenemos el primer resultado de la lista
            const canciones = data.result?.results;
            if (!canciones || canciones.length === 0) {
                return sock.sendMessage(from, { text: '❌ No se encontraron resultados para esa búsqueda.' }, { quoted: m });
            }

            const track = canciones[0];

            let resultadoTexto = `🎵 *Resultado de Spotify*\n\n` +
                                 `* *Título:* ${track.title}\n` +
                                 `* *Artista:* ${track.artist || 'Desconocido'}\n` +
                                 `* *Álbum:* ${track.album || 'N/A'}\n` +
                                 `* *Enlace:* ${track.url}`;

            await sock.sendMessage(from, { text: resultadoTexto }, { quoted: m });

        } catch (error) {
            console.error('Error en el plugin de Spotify:', error);
            await sock.sendMessage(from, { text: '❌ Ocurrió un error al intentar conectar con la API de Spotify.' }, { quoted: m });
        }
    }
};

module.exports = handler;
