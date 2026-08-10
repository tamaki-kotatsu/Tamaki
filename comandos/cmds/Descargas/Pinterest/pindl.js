async function resolverLinkPinterest(url) {
    const res = await fetch(`https://api.vreden.web.id/api/pinterestdl?url=${encodeURIComponent(url)}`);
    if (!res.ok) throw new Error('Error al conectar con la API de descarga');
    const json = await res.json();
    
    if (!json.result) throw new Error('No se pudo extraer contenido del enlace.');
    
    // Si devuelve un arreglo de resultados (carrusel o múltiples resoluciones)
    if (Array.isArray(json.result)) {
        return json.result.map(item => ({
            type: item.endsWith('.mp4') ? 'video' : 'image',
            url: item
        }));
    }

    // Si devuelve un objeto simple
    const mediaUrl = json.result.url || json.result;
    return [{
        type: typeof mediaUrl === 'string' && mediaUrl.includes('.mp4') ? 'video' : 'image',
        url: mediaUrl
    }];
}

module.exports = {
    name: 'pindl',
    alias: ['pdl', 'pindownload'],
    description: 'Descarga fotos, videos o carruseles mediante link de Pinterest.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;

        if (!texto || (!texto.includes('pinterest.com') && !texto.includes('pin.it'))) {
            return sock.sendMessage(from, { text: '🔗 *Por favor proporciona un enlace válido de Pinterest.*' }, { quoted: m });
        }

        try {
            await sock.sendMessage(from, { text: '⏳ _Procesando enlace..._' }, { quoted: m });
            const medias = await resolverLinkPinterest(texto.trim());

            if (!medias || medias.length === 0) {
                return sock.sendMessage(from, { text: '❌ No se pudo obtener el contenido del enlace.' }, { quoted: m });
            }

            const soloImagenes = medias.filter(item => item.type === 'image');

            if (soloImagenes.length > 1 && soloImagenes.length === medias.length) {
                const baileys = require('@whiskeysockets/baileys');
                const album = baileys.generateWAMessageFromContent(from, { albumMessage: { expectedImageCount: soloImagenes.length } }, { quoted: m });
                await sock.relayMessage(album.key.remoteJid, album.message, { messageId: album.key.id });

                for (let i = 0; i < soloImagenes.length; i++) {
                    const img = await baileys.generateWAMessage(album.key.remoteJid, { image: { url: soloImagenes[i].url } }, { upload: sock.waUploadToServer });
                    img.message.messageContextInfo = { messageAssociation: { associationType: 1, parentMessageKey: album.key } };
                    await sock.relayMessage(img.key.remoteJid, img.message, { messageId: img.key.id });
                }
            } else {
                for (const media of medias) {
                    if (media.type === 'video') {
                        await sock.sendMessage(from, { video: { url: media.url } }, { quoted: m });
                    } else {
                        await sock.sendMessage(from, { image: { url: media.url } }, { quoted: m });
                    }
                }
            }
        } catch (e) {
            console.error(e);
            await sock.sendMessage(from, { text: '💔 Ocurrió un error al procesar el enlace.' }, { quoted: m });
        }
    }
};
