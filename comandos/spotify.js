const axios = require('axios');

let handler = {
    name: 'spotify',
    alias: ['sp', 'cancion'],
    command: ['spotify', 'sp'],
    description: 'Busca música en Spotify usando una API externa.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;

        // 1. Validar si el usuario escribió el nombre de la canción
        if (!texto) {
            return sock.sendMessage(from, { 
                text: '⚠️ Por favor, ingresa el nombre de la canción que deseas buscar.\n\n*Ejemplo:* /spotify despacito' 
            }, { quoted: m });
        }

        try {
            await sock.sendMessage(from, { text: '🔍 Buscando en Spotify, por favor espera...' }, { quoted: m });

            // 2. Realizar la petición POST con Axios
            let response = await axios.post("https://api-sky.ultraplus.click/search/spotify", {
                query: texto
            }, {
                headers: {
                    "apikey": "sk_7f41a58b-bd6f-4df1-be6c-ea4d64913247",
                    "Content-Type": "application/json"
                }
            });

            let data = response.data;

            // 3. Validar y estructurar la respuesta para el bot
            if (data && data.resultado) {
                let resultadoTexto = `🎵 *Resultado de Spotify*\n\n` +
                                     `* *Título:* ${data.resultado.title}\n` +
                                     `* *Artista:* ${data.resultado.artist}\n` +
                                     `* *Enlace:* ${data.resultado.url}`;

                await sock.sendMessage(from, { text: resultadoTexto }, { quoted: m });
            } else {
                await sock.sendMessage(from, { text: '❌ No se encontraron resultados para esa búsqueda.' }, { quoted: m });
            }

        } catch (error) {
            console.error('Error en el plugin de Spotify:', error);
            await sock.sendMessage(from, { text: '❌ Ocurrió un error al intentar conectar con la API de Spotify.' }, { quoted: m });
        }
    }
};

module.exports = handler;
