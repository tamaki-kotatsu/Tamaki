const { AdvModel, BlacklistModel, NukeModel, AntiStickerModel } = require('../Esquemas/esquemas');
const Group = require('../Modelos/Stickers/sgrupo');

async function verificarModeracion(sock, m, desde, esGrupo, remitente, textoCuerpo) {
    const advDoc = await AdvModel.findOne({ key: 'global_adv' });
    if (advDoc) {
        if (advDoc.baneados && advDoc.baneados.includes(remitente)) {
            if (global.prefixes.some(p => textoCuerpo.trim().startsWith(p))) return false;
        }

        if (esGrupo && advDoc.muteadas) {
            const listaMuteados = advDoc.muteadas.get(desde) || [];
            if (listaMuteados.includes(remitente)) {
                try {
                    const metadata = await sock.groupMetadata(desde);
                    const miIdLimpio = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                    const botAdmin = metadata.participants.find(p => p.id.split(':')[0] === miIdLimpio.split(':')[0]);
                    const botEsAdmin = botAdmin && (botAdmin.admin === 'admin' || botAdmin.admin === 'superadmin');

                    if (botEsAdmin) {
                        await sock.sendMessage(desde, { delete: { remoteJid: desde, fromMe: m.key.fromMe, id: m.key.id, participant: remitente } });
                        return false;
                    }
                } catch (e) {
                    console.log('Error al borrar mensaje de usuario silenciado:', e);
                }
            }
        }
    }

    if (remitente) {
        const blDoc = await BlacklistModel.findOne({ key: 'global_blacklist' });
        if (blDoc && blDoc.usuarios.includes(remitente)) return false;
    }

    if (esGrupo && remitente) {
        const infoNuke = await NukeModel.findOne({ userId: remitente });
        if (infoNuke) {
            await sock.sendMessage(desde, {
                text: `⚠️ *Usuario Nukeado Detectado* ⚠️\n\nEl usuario @${remitente.split('@')[0]} está nukeado globalmente.\n\n🛡️ *Nukeado desde:* ${infoNuke.origenGrupo}\n📝 *Razón:* ${infoNuke.razon}\n📅 *Fecha:* ${infoNuke.fecha}\n\n_Procediendo con la expulsión automática..._`,
                mentions: [remitente]
            });
            try { await sock.groupParticipantsUpdate(desde, [remitente], 'remove'); } catch (err) {}
            return false;
        }
    }

    if (esGrupo) {
        let antistickerActivo = global.antistickerStatus[desde];
        if (antistickerActivo === undefined) {
            const gData = await Group.findOne({ groupId: desde });
            antistickerActivo = gData ? gData.antisticker : false;
            global.antistickerStatus[desde] = antistickerActivo;
        }

        if (antistickerActivo === true) {
            const esSticker = m.message?.stickerMessage || 
                              m.message?.documentWithCaptionMessage?.message?.stickerMessage || 
                              m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage;
            
            if (esSticker) {
                try {
                    const metadata = await sock.groupMetadata(desde);
                    const miIdLimpio = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                    const botAdmin = metadata.participants.find(p => p.id.split(':')[0] === miIdLimpio.split(':')[0]);
                    const botEsAdmin = botAdmin && (botAdmin.admin === 'admin' || botAdmin.admin === 'superadmin');

                    if (botEsAdmin) {
                        await sock.sendMessage(desde, { delete: { remoteJid: desde, fromMe: m.key.fromMe, id: m.key.id, participant: m.key.participant || m.key.remoteJid } });
                        return false;
                    }
                } catch (e) {}
            }
        }
    }

    return true;
}

module.exports = { verificarModeracion };
