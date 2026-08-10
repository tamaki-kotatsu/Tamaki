const mongoose = require('mongoose');

const PvConfigModel = mongoose.models.PvConfig || mongoose.model('PvConfig', new mongoose.Schema({
    groupId: { type: String, required: true, unique: true },
    activo: { type: Boolean, default: true },
    limite: { type: Number, default: 3 }
}));

async function buscarVideosPinterest(query, limit = 3) {
    // Usamos endpoint proxy de scraping para evitar el bloqueo 403
    const response = await fetch(`https://api.agatz.xyz/api/pinterest?message=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
    const res = await response.json();

    if (!res.data || !Array.isArray(res.data)) {
        throw new Error('Sin resultados');
    }

    // Filtramos solo enlaces que apunten a formato de video MP4
    const videos = res.data
        .map(item => item.video || item.url || item)
        .filter(url => typeof url === 'string' && url.includes('.mp4'));

    // Si la API general no extrae videos mp4 directa, intentamos endpoint fallback de videos
    if (videos.length === 0) {
        const fallbackRes = await fetch(`https://bk9.fun/download/pinterest?q=${encodeURIComponent(query)}`);
        if (fallbackRes.ok) {
            const fbJson = await fallbackRes.json();
            if (fbJson.status && Array.isArray(fbJson.BK9)) {
                const fbVideos = fbJson.BK9.filter(v => typeof v === 'string' && v.includes('.mp4'));
                if (fbVideos.length > 0) return fbVideos.slice(0, limit);
            }
        }
    }

    return videos.slice(0, limit);
}

module.exports = {
    name: 'pinsvideo',
    alias: ['pv', 'pinvideo'],
    description: 'Busca y envía videos de Pinterest.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;

        if (from.endsWith('@g.us')) {
            global.pvConfigCache = global.pvConfigCache || {};
            if (!global.pvConfigCache[from]) {
                const confDoc = await PvConfigModel.findOne({ groupId: from });
                global.pvConfigCache[from] = confDoc ? { activo: confDoc.activo, limite: confDoc.limite } : { activo: true, limite: 3 };
            }

            if (!global.pvConfigCache[from].activo && !m.text?.startsWith('/setpv')) {
                return sock.sendMessage(from, { text: '⚡ _La búsqueda de videos de Pinterest está desactivada en este grupo._' }, { quoted: m });
            }
        }

        if (m.text?.startsWith('/setpv')) {
            const args = texto ? texto.trim().split(/\s+/) : [];
            const opcion = args[0]?.toLowerCase();

            if (opcion === 'activar' || opcion === 'desactivar') {
                const estado = opcion === 'activar';
                global.pvConfigCache[from].activo = estado;
                await PvConfigModel.findOneAndUpdate({ groupId: from }, { activo: estado }, { upsert: true });
                return sock.sendMessage(from, { text: `✨ *Videos de Pinterest:* ${estado ? 'Activado' : 'Desactivado'}` }, { quoted: m });
            }

            const num = parseInt(opcion);
            if (!isNaN(num) && num >= 1 && num <= 5) {
                global.pvConfigCache[from].limite = num;
                await PvConfigModel.findOneAndUpdate({ groupId: from }, { limite: num }, { upsert: true });
                return sock.sendMessage(from, { text: `✅ *Límite de videos configurado a:* ${num}` }, { quoted: m });
            }
            return sock.sendMessage(from, { text: '⚠️ _Uso: /setpv <activar|desactivar|1-5>_' }, { quoted: m });
        }

        if (!texto) {
            return sock.sendMessage(from, { text: '🌸 *(｡•́︿•̀｡) Escribe qué video quieres buscar.*\n\n> Ejemplo: `/pv edit anime`' }, { quoted: m });
        }

        const partes = texto.trim().split(/\s+/);
        let cantidad = null;
        const ultimo = parseInt(partes[partes.length - 1]);
        if (!isNaN(ultimo) && partes.length > 1) {
            cantidad = ultimo;
            partes.pop();
        }

        const busqueda = partes.join(' ');
        const limiteGrupo = global.pvConfigCache?.[from]?.limite || 3;
        let limiteFinal = cantidad || limiteGrupo;
        if (limiteFinal > 5) limiteFinal = 5;

        try {
            await sock.sendMessage(from, { text: `⏳ _Buscando videos de "${busqueda}"..._` }, { quoted: m });
            const videos = await buscarVideosPinterest(busqueda, limiteFinal);

            if (videos.length === 0) {
                return sock.sendMessage(from, { text: `(*꒦ິ꒳꒦) No se encontraron videos en formato reproducible para "${busqueda}".` }, { quoted: m });
            }

            for (let i = 0; i < videos.length; i++) {
                await sock.sendMessage(from, {
                    video: { url: videos[i] },
                    caption: i === 0 ? `🎥 *PINTEREST VIDEO:* ${busqueda}` : ''
                }, { quoted: m });
            }
        } catch (e) {
            console.error(e);
            await sock.sendMessage(from, { text: '💔 Error al buscar videos en Pinterest.' }, { quoted: m });
        }
    }
};
