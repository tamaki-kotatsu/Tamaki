import fetch from 'node-fetch';

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

            // 2. Realizar la petición POST con los datos de tu cURL
            let response = await fetch("https://api-sky.ultraplus.click/search/spotify", {
                method: "POST",
                headers: {
                    "apikey": "sk_7f41a58b-bd6f-4df1-be6c-ea4d64913247",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ query: texto })
            });

            let data = await response.json();

            // 3. Validar y estructurar la respuesta para el bot
            // Nota: Si la estructura de tu API cambia, ajusta las propiedades (ej. data.resultado)
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

export default handler;
