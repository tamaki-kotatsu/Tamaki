const mongoose = require('mongoose');

const pinConfigSchema = new mongoose.Schema({
    groupId: { type: String, required: true, unique: true },
    activo: { type: Boolean, default: true },
    limite: { type: Number, default: 5 }
});

const PinConfigModel = mongoose.models.PinConfig || mongoose.model('PinConfig', pinConfigSchema);

global.pinConfigCache = global.pinConfigCache || {};

const cargarCache = async () => {
    try {
        const todos = await PinConfigModel.find({});
        todos.forEach(doc => {
            global.pinConfigCache[doc.groupId] = {
                activo: doc.activo,
                limite: doc.limite
            };
        });
    } catch (e) {
        console.error('Error al cargar caché de PinConfig:', e);
    }
};

cargarCache();

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function pinterestScraper(query, limit = 10) {
    const url = `https://id.pinterest.com/resource/BaseSearchResource/get/?source_url=%2Fsearch%2Fpins%2F%3Fq%3D${encodeURIComponent(query)}%26rs%3Dtyped&data=%7B%22options%22%3A%7B%22query%22%3A%22${encodeURIComponent(query)}%22%2C%22scope%22%3A%22pins%22%2C%22rs%22%3A%22typed%22%7D%2C%22context%22%3A%7B%7D%7D`;

    const headers = {
        'accept': 'application/json, text/javascript, */*; q=0.01',
        'accept-language': 'es-ES,es;q=0.9,en;q=0.8',
        'referer': 'https://id.pinterest.com/',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
        'x-app-version': 'c056fb7',
        'x-pinterest-appstate': 'active',
        'x-pinterest-pws-handler': 'www/index.js',
        'x-pinterest-source-url': '/',
        'x-requested-with': 'XMLHttpRequest'
    };

    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Pinterest HTTP ${res.status}`);

    const json = await res.json();
    if (!json.resource_response?.data?.results) return [];

    return json.resource_response.data.results
        .map(item => {
            if (!item.images) return null;
            return item.images.orig?.url || item.images['600x']?.url || item.images['236x']?.url || null;
        })
        .filter(Boolean)
        .slice(0, limit);
}

// Función nativa para generar el álbum de WhatsApp
async function sendAlbumMessage(sock, jid, urls, caption, quoted) {
    const baileys = require('@whiskeysockets/baileys');

    // 1. Crear y enviar el contenedor del álbum
    const album = baileys.generateWAMessageFromContent(
        jid,
        { 
            messageContextInfo: {}, 
            albumMessage: { expectedImageCount: urls.length } 
        },
        quoted ? { quoted } : {}
    );
    await sock.relayMessage(album.key.remoteJid, album.message, { messageId: album.key.id });

    // 2. Subir y vincular cada imagen al contenedor del álbum
    for (let i = 0; i < urls.length; i++) {
        const img = await baileys.generateWAMessage(
            album.key.remoteJid,
            { image: { url: urls[i] }, ...(i === 0 ? { caption } : {}) },
            { upload: sock.waUploadToServer }
        );

        img.message.messageContextInfo = {
            messageAssociation: { associationType: 1, parentMessageKey: album.key }
        };

        await sock.relayMessage(img.key.remoteJid, img.message, { messageId: img.key.id });
        await delay(300); // Pequeño delay para no colapsar la conexión
    }
}

module.exports = {
    name: 'pinterest',
    alias: ['pin', 'pins', 'setpins', 'setpin', 'pinsconfig', 'pinoff', 'pinon', 'togglepin'],
    description: 'Busca imágenes en Pinterest o gestiona los ajustes del grupo.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;
        const comandoUsado = m.text?.trim().split(/\s+/)[0]?.toLowerCase().slice(1);

        // Inicializar caché si es grupo
        if (from.endsWith('@g.us')) {
            if (!global.pinConfigCache[from]) {
                const confDoc = await PinConfigModel.findOne({ groupId: from });
                global.pinConfigCache[from] = confDoc ? { activo: confDoc.activo, limite: confDoc.limite } : { activo: true, limite: 5 };
            }
        }

        // LÓGICA DIRECTA PINOFF / PINON / TOGGLEPIN
        if (['pinoff', 'pinon', 'togglepin'].includes(comandoUsado)) {
            if (!from.endsWith('@g.us')) {
                return sock.sendMessage(from, { text: '⚠️ _Este comando solo funciona en grupos._' }, { quoted: m });
            }

            let nuevoEstado;
            if (comandoUsado === 'pinoff') {
                nuevoEstado = false;
            } else if (comandoUsado === 'pinon') {
                nuevoEstado = true;
            } else {
                nuevoEstado = !global.pinConfigCache[from].activo;
            }

            global.pinConfigCache[from].activo = nuevoEstado;
            await PinConfigModel.findOneAndUpdate({ groupId: from }, { activo: nuevoEstado }, { upsert: true });

            return sock.sendMessage(from, {
                text: `⚡ *Búsquedas de Pinterest en este grupo:* ${nuevoEstado ? '🟢 *ACTIVADAS*' : '🔴 *DESACTIVADAS*'}`
            }, { quoted: m });
        }

        // LÓGICA DE CONFIGURACIÓN (/setpins, /setpin, /pinsconfig)
        if (['setpins', 'setpin', 'pinsconfig'].includes(comandoUsado)) {
            if (!from.endsWith('@g.us')) {
                return sock.sendMessage(from, { text: '⏳ _Este comando solo se puede usar en grupos._' }, { quoted: m });
            }

            const args = texto ? texto.trim().split(/\s+/) : [];
            const opcion = args[0]?.toLowerCase();

            if (opcion === 'activar') {
                global.pinConfigCache[from].activo = true;
                await PinConfigModel.findOneAndUpdate({ groupId: from }, { activo: true }, { upsert: true, new: true });
                return sock.sendMessage(from, { text: '✨ *Pinterest Activado* en este grupo.' }, { quoted: m });
            }

            if (opcion === 'desactivar') {
                global.pinConfigCache[from].activo = false;
                await PinConfigModel.findOneAndUpdate({ groupId: from }, { activo: false }, { upsert: true, new: true });
                return sock.sendMessage(from, { text: '⚡ *Pinterest Desactivado* en este grupo.' }, { quoted: m });
            }

            const cantidad = parseInt(opcion);
            if (!isNaN(cantidad)) {
                if (cantidad < 1 || cantidad > 15) {
                    return sock.sendMessage(from, { text: '⚠️ _El límite de imágenes debe ser entre 1 y 15._' }, { quoted: m });
                }

                global.pinConfigCache[from].limite = cantidad;
                await PinConfigModel.findOneAndUpdate({ groupId: from }, { limite: cantidad }, { upsert: true, new: true });
                return sock.sendMessage(from, { text: `✅ *Límite por defecto configurado a:* ${cantidad} imágenes.` }, { quoted: m });
            }

            const estadoActual = global.pinConfigCache[from];
            const menu = 
`⚙️ *CONFIGURACIÓN DE PINTEREST*

📌 *Estado actual:* ${estadoActual.activo ? '✅ Activo' : '❌ Inactivo'}
🔢 *Límite predeterminado:* ${estadoActual.limite} imágenes

*Uso de comandos:*
• \`/setpins activar\`
• \`/setpins desactivar\`
• \`/setpins <1-15>\` (Ejemplo: \`/setpins 5\`)
• \`/pinoff\` / \`/pinon\` / \`/togglepin\``;

            return sock.sendMessage(from, { text: menu }, { quoted: m });
        }

        // LÓGICA DE BÚSQUEDA (/pinterest, /pin, /pins)
        if (from.endsWith('@g.us')) {
            if (!global.pinConfigCache[from].activo) {
                return sock.sendMessage(from, { text: '⚡ _El comando de Pinterest está desactivado en este grupo._' }, { quoted: m });
            }
        }

        if (!texto) {
            return sock.sendMessage(from, { 
                text: '🌸 *(｡•́︿•̀｡) Escribe qué quieres buscar y opcionalmente la cantidad.*\n\n> Ejemplos:\n> `/pin Hatsune miku`\n> `/pin Hatsune miku 15`' 
            }, { quoted: m });
        }

        // Extraer término y cantidad
        const partes = texto.trim().split(/\s+/);
        let cantidadSolicitada = null;
        const ultimoElemento = parseInt(partes[partes.length - 1]);

        if (!isNaN(ultimoElemento) && partes.length > 1) {
            cantidadSolicitada = ultimoElemento;
            partes.pop();
        }

        const busqueda = partes.join(' ');
        const limiteGrupo = global.pinConfigCache?.[from]?.limite || 5;
        let limiteFinal = cantidadSolicitada !== null ? cantidadSolicitada : limiteGrupo;

        // Límites estrictos (mínimo 1, máximo 15)
        if (limiteFinal < 1) limiteFinal = 1;
        if (limiteFinal > 15) limiteFinal = 15;

        try {
            const resultados = await pinterestScraper(busqueda, limiteFinal);

            if (resultados.length === 0) {
                return sock.sendMessage(from, { text: `(*꒦ິ꒳꒦ີ) No se encontraron imágenes para "${busqueda}".` }, { quoted: m });
            }

            const infoCaption = 
`╭─⬣「 ✨ *PINTEREST SEARCH* ✨ 」
├ ❀ *Búsqueda:* ${busqueda}
├ ❀ *Imágenes enviadas:* ${resultados.length}
╰━─━─━─≪✿≫─━─━─━╯`;

            // Si se requiere 1 sola imagen, la envía como mensaje simple
            if (resultados.length === 1) {
                return await sock.sendMessage(from, {
                    image: { url: resultados[0] },
                    caption: infoCaption
                }, { quoted: m });
            }

            // Si son 2 o más (hasta máximo 15), se envía como álbum nativo
            await sendAlbumMessage(sock, from, resultados, infoCaption, m);

        } catch (e) {
            console.error(e);
            await sock.sendMessage(from, { text: '💔 Ocurrió un error al realizar la búsqueda en Pinterest.' }, { quoted: m });
        }
    }
};
