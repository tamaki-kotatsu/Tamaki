const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const Group = require('../Modelos/Stickers/sgrupo');
const User = require('../Modelos/Stickers/susers'); // <-- Importado como User tal cual en stickers.js
const { MessageModel, AfkModel } = require('../Esquemas/esquemas');
const { verificarModeracion } = require('../Moderadores/moderador');

let toWebp, writeExifWebp, resolveStickerMetadata;
try {
    const stickerPlugin = require('../../comandos/cmds/Stickers/stickers');
    toWebp = stickerPlugin.toWebp;
    writeExifWebp = stickerPlugin.writeExifWebp;
    resolveStickerMetadata = stickerPlugin.resolveStickerMetadata;
} catch (e) {
    console.log('⚠️ Esperando carga del plugin sticker para funciones auxiliares...');
}

global.historialMensajes = global.historialMensajes || {};
global.plugins = global.plugins || {};
global.prefixes = global.prefixes || ['/'];
global.botNames = global.botNames || [
    'tamaki kotatsu', 'tamaki', 'kotatsu', 'tama', 'kota',
    'Tamaki Kotatsu', 'Tamaki', 'Kotatsu', 'Tama', 'Kota',
    'TAMAKI KOTATSU', 'TAMAKI', 'KOTATSU', 'TAMA', 'KOTA'
];
global.menuPaginadoActivo = global.menuPaginadoActivo || {};

const cargarDirectorioRecursivo = (dir) => {
    if (!fs.existsSync(dir)) return;
    const archivos = fs.readdirSync(dir);
    for (const archivo of archivos) {
        const rutaCompleta = path.join(dir, archivo);
        if (fs.statSync(rutaCompleta).isDirectory()) {
            cargarDirectorioRecursivo(rutaCompleta);
        } else if (archivo.endsWith('.js')) {
            try {
                const rutaAbsoluta = path.resolve(rutaCompleta);
                delete require.cache[require.resolve(rutaAbsoluta)];
                const comand = require(rutaAbsoluta);
                if (comand && comand.name) {
                    global.plugins[comand.name] = comand;
                }
            } catch (err) {
                console.log(`❌ Error cargando comando en ${archivo}:`, err.message);
            }
        }
    }
};

const cargarTodosLosComandos = () => {
    global.plugins = {};
    cargarDirectorioRecursivo(path.join(process.cwd(), 'plugins'));
    cargarDirectorioRecursivo(path.join(process.cwd(), 'Comandos'));
};

cargarTodosLosComandos();

function formatearTiempo(milisegundos) {
    const totalSegundos = Math.floor(milisegundos / 1000);
    const dias = Math.floor(totalSegundos / 86400);
    const horas = Math.floor((totalSegundos % 86400) / 3600);
    const minutes = Math.floor((totalSegundos % 3600) / 60);
    const segundos = totalSegundos % 60;

    let resultado = [];
    if (dias > 0) resultado.push(`${dias}d`);
    if (horas > 0) resultado.push(`${horas}h`);
    if (minutes > 0) resultado.push(`${minutes}m`);
    if (segundos > 0 || resultado.length === 0) resultado.push(`${segundos}s`);
    return resultado.join(' ');
}

function extraerComandoYTexto(cuerpo, sock, desde) {
    const textoLimpio = cuerpo.trim();
    const textoLower = textoLimpio.toLowerCase();
    const configGrupo = global.groupPrefixConfig[desde] || { disableSymbols: false, disableNames: false };

    if (!configGrupo.disableSymbols) {
        const prefijosOrdenados = [...global.prefixes].sort((a, b) => b.length - a.length);
        for (const p of prefijosOrdenados) {
            if (textoLimpio.startsWith(p)) {
                const contenido = textoLimpio.slice(p.length).trim();
                const partes = contenido.split(/ +/);
                return { esComando: true, comandoNombre: partes[0].toLowerCase(), textoArgs: partes.slice(1).join(' ') };
            }
        }
    }

    const miNumero = sock.user.id.split(':')[0];
    const patronTag = new RegExp(`^@${miNumero}\\s*`, 'i');
    if (patronTag.test(textoLimpio)) {
        const contenido = textoLimpio.replace(patronTag, '').trim();
        const partes = contenido.split(/ +/);
        return { esComando: true, comandoNombre: partes[0].toLowerCase(), textoArgs: partes.slice(1).join(' ') };
    }

    if (!configGrupo.disableNames) {
        const nombresOrdenados = [...global.botNames].sort((a, b) => b.length - a.length);
        for (const nombre of nombresOrdenados) {
            const patronNombre = new RegExp(`^${nombre}\\s*`, 'i');
            if (patronNombre.test(textoLower)) {
                const contenido = textoLimpio.replace(patronNombre, '').trim();
                const partes = contenido.split(/ +/);
                if (partes[0]) {
                    return { esComando: true, comandoNombre: partes[0].toLowerCase(), textoArgs: partes.slice(1).join(' ') };
                }
            }
        }
    }

    return { esComando: false, comandoNombre: '', textoArgs: '' };
}

// Función interna idéntica a stickers.js para resolver las marcas con la misma lógica exacta
async function resolverMetadataAutosticker(senderId, groupId) {
    let packname = 'Proyecto1 Bot Pack';
    let author = '@hannerjhossue';

    // 1. Obtener datos del grupo
    const groupData = await Group.findOne({ groupId });
    if (groupData) {
        if (groupData.tempExpire && groupData.tempExpire > new Date()) {
            if (groupData.tempPackname) packname = groupData.tempPackname;
            if (groupData.tempAuthor) author = groupData.tempAuthor;
        } else {
            if (groupData.packname) packname = groupData.packname;
            if (groupData.author) author = groupData.author;
        }
    }

    // 2. Prioridad Personal del Usuario
    const userData = await User.findOne({ userId: senderId });
    if (userData) {
        if (userData.tempExpire && userData.tempExpire > new Date()) {
            if (userData.tempPackname) packname = userData.tempPackname;
            if (userData.tempAuthor) author = userData.tempAuthor;
        } else if (userData.author || userData.packname) {
            if (userData.packname) packname = userData.packname;
            if (userData.author) author = userData.author;
        }
    }

    return { packname, author };
}

async function procesarAutoSticker(sock, m, desde, remitente) {
    if (m.key.fromMe || !desde.endsWith('@g.us')) return;

    const isImage = !!m.message?.imageMessage;
    const isVideo = !!m.message?.videoMessage;
    if (!isImage && !isVideo) return;

    const groupData = await Group.findOne({ groupId: desde });
    if (!groupData || !groupData.autosticker) return;

    try {
        if (!toWebp || !writeExifWebp) {
            const stickerPlugin = require('../../plugins/sticker');
            toWebp = stickerPlugin.toWebp;
            writeExifWebp = stickerPlugin.writeExifWebp;
        }

        // Usamos la función de resolución de marcas idéntica a la del comando /s
        const metadata = resolveStickerMetadata 
            ? await resolveStickerMetadata(remitente, desde, '') 
            : await resolverMetadataAutosticker(remitente, desde);

        const mediaType = isVideo ? 'video' : 'image';
        const imageMsg = isVideo ? m.message.videoMessage : m.message.imageMessage;

        const stream = await downloadContentFromMessage(imageMsg, mediaType);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        const webpBuffer = await toWebp(buffer, mediaType);
        const stickerWithExif = await writeExifWebp(webpBuffer, metadata);

        await sock.sendMessage(desde, { sticker: stickerWithExif }, { quoted: m });
    } catch (err) {
        console.error('Error procesando AutoSticker:', err);
    }
}

async function procesarMensaje(sock, chatUpdate) {
    try {
        const m = chatUpdate.messages[0];
        if (!m || !m.message) return;

        const desde = m.key.remoteJid;
        if (!desde || desde.endsWith('@newsletter')) return;

        const esGrupo = desde.endsWith('@g.us');
        const remitente = m.key.participant || (m.key.fromMe ? sock.user.id.split(':')[0] + '@s.whatsapp.net' : m.key.remoteJid);

        const cuerpoMensaje = m.message?.conversation || 
                             m.message?.extendedTextMessage?.text || 
                             m.message?.imageMessage?.caption || 
                             m.message?.videoMessage?.caption || 
                             '';

        const quotedId = m.message?.extendedTextMessage?.contextInfo?.stanzaId;
        if (quotedId && global.menuPaginadoActivo && global.menuPaginadoActivo[quotedId]) {
            const sesionMenu = global.menuPaginadoActivo[quotedId];
            const opcion = parseInt(cuerpoMensaje.trim());

            if (!isNaN(opcion) && opcion >= 1 && opcion <= sesionMenu.pages.length) {
                const paginaSeleccionada = sesionMenu.pages[opcion - 1];
                const textoNuevo = paginaSeleccionada.text;

                const nuevoMsg = await sock.sendMessage(desde, {
                    text: textoNuevo.trim()
                }, { quoted: m });

                if (nuevoMsg && nuevoMsg.key && nuevoMsg.key.id) {
                    const nuevoId = nuevoMsg.key.id;
                    global.menuPaginadoActivo[nuevoId] = sesionMenu;
                    global.menuPaginadoActivo[sesionMenu.rootId] = sesionMenu;
                }

                return;
            }
        }

        const { esComando, comandoNombre, textoArgs } = extraerComandoYTexto(cuerpoMensaje, sock, desde);

        const esReaccion = !!m.message?.reactionMessage;
        if (!esReaccion && m.key.id) {
            global.historialMensajes[desde] = global.historialMensajes[desde] || [];
            global.historialMensajes[desde].push(m);
            if (global.historialMensajes[desde].length > 100) global.historialMensajes[desde].shift();

            await MessageModel.create({
                remoteJid: desde,
                messageId: m.key.id,
                sender: remitente,
                fromMe: m.key.fromMe || false,
                text: cuerpoMensaje,
                timestamp: new Date()
            }).catch(() => {});
        }

        const continuar = await verificarModeracion(sock, m, desde, esGrupo, remitente, cuerpoMensaje);
        if (!continuar) return;

        if (esGrupo && !esComando) {
            await procesarAutoSticker(sock, m, desde, remitente);
        }

        if (global.plugins) {
            for (const name in global.plugins) {
                const pluginActivo = global.plugins[name];
                if (pluginActivo && typeof pluginActivo.before === 'function') {
                    try {
                        await pluginActivo.before(m, { sock, isGroup: esGrupo, sender: remitente });
                    } catch (e) {
                        console.error(`Error en before plugin [${name}]:`, e);
                    }
                }
            }
        }

        if (esGrupo && remitente) {
            await AfkModel.deleteMany({ userId: remitente, groupId: { $exists: false } });
            const userAfk = await AfkModel.findOne({ userId: remitente, groupId: desde });

            if (userAfk && (!esComando || !['afk', 'ausente', 'unafk', 'noafk'].includes(comandoNombre))) {
                const tiempoAusente = Date.now() - userAfk.tiempo;
                const tiempoFormateated = formatearTiempo(tiempoAusente);
                
                await AfkModel.deleteOne({ userId: remitente, groupId: desde });

                const tag = `@${remitente.split('@')[0]}`;
                await sock.sendMessage(desde, {
                    text: `👋 ¡Bienvenido de vuelta ${tag}! Tu AFK en este grupo ha sido desactivado.\n⏱️ Ausente por: *${tiempoFormateated}*`,
                    mentions: [remitente]
                }, { quoted: m });
            }

            if (!m.key.fromMe) {
                const mencionados = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
                const mensajeRespondido = m.message?.extendedTextMessage?.contextInfo?.participant;
                
                let usuariosInteres = [...mencionados];
                if (mensajeRespondido) usuariosInteres.push(mensajeRespondido);
                usuariosInteres = [...new Set(usuariosInteres)];

                for (let jid of usuariosInteres) {
                    if (jid === remitente) continue;

                    await AfkModel.deleteMany({ userId: jid, groupId: { $exists: false } });
                    const afkTarget = await AfkModel.findOne({ userId: jid, groupId: desde });
                    if (afkTarget) {
                        const tiempoAusente = Date.now() - afkTarget.tiempo;
                        const tiempoFormateated = formatearTiempo(tiempoAusente);
                        const tagAusente = `@${jid.split('@')[0]}`;

                        await sock.sendMessage(desde, {
                            text: `💤 El usuario ${tagAusente} está *AFK* en este grupo.\n\n📝 *Motivo:* ${afkTarget.motivo}\n⏱️ *Tiempo:* ${tiempoFormateated}`,
                        }, { quoted: m });
                    }
                }
            }
        }

        if (!esComando) return;

        if (!global.plugins) {
            console.log('⚠️ ADVERTENCIA: global.plugins no está definido');
            return;
        }

        const plugin = Object.values(global.plugins).find(p =>
            p.name === comandoNombre || (p.alias && p.alias.includes(comandoNombre)) || (p.command && p.command.includes(comandoNombre))
        );

        if (plugin) {
            if (esGrupo) {
                const metadata = await sock.groupMetadata(desde);
                const miIdLimpio = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                
                const botAdmin = metadata.participants.find(p => p.id.split(':')[0] === miIdLimpio.split(':')[0]);
                const userAdmin = metadata.participants.find(p => p.id.split(':')[0] === remitente.split(':')[0]);

                const botEsAdmin = botAdmin && (botAdmin.admin === 'admin' || botAdmin.admin === 'superadmin');
                const usuarioEsAdmin = userAdmin && (userAdmin.admin === 'admin' || userAdmin.admin === 'superadmin');

                if (plugin.soloAdmins && !usuarioEsAdmin) {
                    return await sock.sendMessage(desde, { text: '🚫 Este comando solo puede ser utilizado por administradores.' }, { quoted: m });
                }

                if (plugin.botAdminRequerido && !botEsAdmin) {
                    return await sock.sendMessage(desde, { text: '⚠️ Necesito ser administrador del grupo para ejecutar este comando.' }, { quoted: m });
                }
            }

            if (typeof plugin.run === 'function') {
                await plugin.run(sock, m, textoArgs);
            } else if (typeof plugin.execute === 'function') {
                await plugin.execute(sock, m, textoArgs);
            }
        }
    } catch (err) {
        console.error('Error ejecutando comando:', err);
    }
}

module.exports = { procesarMensaje };
