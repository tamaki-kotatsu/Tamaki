const axios = require('axios');

module.exports = {
    name: 'tiktoksearch',
    alias: ['ttss', 'tsearch', 'tiktok'],
    description: 'Busca y descarga videos de TikTok.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;

        if (!texto) {
            return sock.sendMessage(from, { 
                text: ' *── 「 TIKTOK SEARCH 」 ──*\n\n *Uso:* /tiktoksearch <términos>' 
            }, { quoted: m });
        }

        // Reacción opcional de espera
        await sock.sendMessage(from, { react: { text: '🕒', key: m.key } });

        try {
            const { data: response } = await axios.get(`https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(texto)}`);

            if (!response.data || !response.data.videos || response.data.videos.length === 0) {
                await sock.sendMessage(from, { react: { text: '❌', key: m.key } });
                return sock.sendMessage(from, { 
                    text: ` *── 「 SIN RESULTADOS 」 ──*\n\nNo se localizó contenido para "${texto}".` 
                }, { quoted: m });
            }

            const video = response.data.videos[0];
            const videoUrl = `https://www.tiktok.com/@${video.author?.unique_id}/video/${video.video_id}`;
            const fmt = (num) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(num || 0);

            const res = await axios.get(video.play, { 
                responseType: 'arraybuffer',
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36' 
                }
            });
            const videoBuffer = Buffer.from(res.data);

            const caption = ` *── 「 TIKTOK RESULT 」 ──*\n\n` +
                            `▢ *TÍTULO:* ${video.title || 'Sin descripción'}\n` +
                            `▢ *AUTOR:* ${video.author?.nickname || 'Desconocido'}\n` +
                            `▢ *DURACIÓN:* ${video.duration}s\n` +
                            `▢ *PESO:* ${(video.size / (1024 * 1024)).toFixed(2)} MB\n` +
                            `▢ *MÉTRICAS:* 👁️ ${fmt(video.play_count)} | ❤️ ${fmt(video.digg_count)}\n\n` +
                            `▢ *LINK:* ${videoUrl}`;

            await sock.sendMessage(from, { 
                video: videoBuffer, 
                caption: caption,
                mimetype: 'video/mp4'
            }, { quoted: m });

            await sock.sendMessage(from, { react: { text: '✅', key: m.key } });

        } catch (error) {
            console.error(error);
            await sock.sendMessage(from, { react: { text: '❌', key: m.key } });
            await sock.sendMessage(from, { 
                text: ' *── 「 FAILURE 」 ──*\n\nOcurrió un error al procesar o enviar el video.' 
            }, { quoted: m });
        }
    }
};
