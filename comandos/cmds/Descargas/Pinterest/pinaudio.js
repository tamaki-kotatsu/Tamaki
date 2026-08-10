const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const PaConfigModel = mongoose.models.PaConfig || mongoose.model('PaConfig', new mongoose.Schema({
    groupId: { type: String, required: true, unique: true },
    activo: { type: Boolean, default: true },
    limite: { type: Number, default: 2 }
}));

const convertVideoToAudio = (videoUrl, outputPath) => {
    return new Promise((resolve, reject) => {
        const command = `ffmpeg -i "${videoUrl}" -vn -acodec libmp3lame -q:a 2 "${outputPath}"`;
        exec(command, (err) => {
            if (err) reject(err);
            else resolve(outputPath);
        });
    });
};

async function obtenerVideosParaAudio(query, limit = 2) {
    const url = `https://id.pinterest.com/resource/BaseSearchResource/get/?source_url=%2Fsearch%2Fpins%2F%3Fq%3D${encodeURIComponent(query)}&data=%7B%22options%22%3A%7B%22query%22%3A%22${encodeURIComponent(query)}%22%2C%22scope%22%3A%22pins%22%7D%2C%22context%22%3A%7B%7D%7D`;
    
    const headers = {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    const res = await fetch(url, { headers });
    if (!res.ok) return [];
    const json = await res.json();
    
    const results = json.resource_response?.data?.results || [];
    const videos = [];

    for (const item of results) {
        if (videos.length >= limit) break;
        if (item.videos?.video_list) {
            const videoObj = item.videos.video_list;
            const videoUrl = videoObj.V_720P?.url || videoObj.V_EXP7?.[0]?.url || Object.values(videoObj)[0]?.url;
            if (videoUrl) videos.push(videoUrl);
        }
    }
    return videos;
}

module.exports = {
    name: 'pinaudio',
    alias: ['pa', 'pinaudio'],
    description: 'Busca o convierte videos de Pinterest a audios MP3.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;

        if (from.endsWith('@g.us')) {
            global.paConfigCache = global.paConfigCache || {};
            if (!global.paConfigCache[from]) {
                const confDoc = await PaConfigModel.findOne({ groupId: from });
                global.paConfigCache[from] = confDoc ? { activo: confDoc.activo, limite: confDoc.limite } : { activo: true, limite: 2 };
            }

            if (!global.paConfigCache[from].activo && !m.text?.startsWith('/setpa')) {
                return sock.sendMessage(from, { text: '⚡ _Los audios de Pinterest están desactivados en este grupo._' }, { quoted: m });
            }
        }

        if (m.text?.startsWith('/setpa')) {
            const args = texto ? texto.trim().split(/\s+/) : [];
            const opcion = args[0]?.toLowerCase();

            if (opcion === 'activar' || opcion === 'desactivar') {
                const estado = opcion === 'activar';
                global.paConfigCache[from].activo = estado;
                await PaConfigModel.findOneAndUpdate({ groupId: from }, { activo: estado }, { upsert: true });
                return sock.sendMessage(from, { text: `✨ *Audios de Pinterest:* ${estado ? 'Activado' : 'Desactivado'}` }, { quoted: m });
            }

            const num = parseInt(opcion);
            if (!isNaN(num) && num >= 1 && num <= 3) {
                global.paConfigCache[from].limite = num;
                await PaConfigModel.findOneAndUpdate({ groupId: from }, { limite: num }, { upsert: true });
                return sock.sendMessage(from, { text: `✅ *Límite de audios configurado a:* ${num}` }, { quoted: m });
            }
            return sock.sendMessage(from, { text: '⚠️ _Uso: /setpa <activar|desactivar|1-3>_' }, { quoted: m });
        }

        if (!texto) {
            return sock.sendMessage(from, { text: '🎵 *(｡•́︿•̀｡) Escribe un término de búsqueda o pon un link de Pinterest.*' }, { quoted: m });
        }

        try {
            await sock.sendMessage(from, { text: '🎧 _Procesando audio..._' }, { quoted: m });

            let videoUrls = [];

            if (texto.includes('pinterest.com') || texto.includes('pin.it')) {
                const res = await fetch(`https://api.vreden.web.id/api/pinterestdl?url=${encodeURIComponent(texto.trim())}`);
                const json = await res.json();
                const mediaUrl = json.result?.url || json.result;
                if (typeof mediaUrl === 'string' && mediaUrl.includes('.mp4')) {
                    videoUrls.push(mediaUrl);
                }
            } else {
                const limiteGrupo = global.paConfigCache?.[from]?.limite || 2;
                videoUrls = await obtenerVideosParaAudio(texto.trim(), limiteGrupo);
            }

            if (videoUrls.length === 0) {
                return sock.sendMessage(from, { text: '❌ No se encontraron videos con audio para esta búsqueda/link.' }, { quoted: m });
            }

            for (let i = 0; i < videoUrls.length; i++) {
                const tempAudioPath = path.join(__dirname, `../../temp_${Date.now()}_${i}.mp3`);
                await convertVideoToAudio(videoUrls[i], tempAudioPath);

                await sock.sendMessage(from, {
                    audio: fs.readFileSync(tempAudioPath),
                    mimetype: 'audio/mp4',
                    ptt: false
                }, { quoted: m });

                if (fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);
            }

        } catch (e) {
            console.error(e);
            await sock.sendMessage(from, { text: '💔 Error al procesar/extraer el audio de Pinterest.' }, { quoted: m });
        }
    }
};
