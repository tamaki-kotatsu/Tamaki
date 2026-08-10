const { NukeModel } = require('../Esquemas/esquemas');

async function verificarUnionGrupo(sock, update) {
    try {
        const { id, participants, action, author } = update;
        if (action === 'add') {
            for (const participant of participants) {
                const infoNuke = await NukeModel.findOne({ userId: participant });
                if (infoNuke) {
                    await sock.sendMessage(id, {
                        text: `🚨 *¡Intento de Evasión Detectado!* 🚨\n\nEl usuario @${participant.split('@')[0]} se encuentra *NUKEADO GLOBALMENTE*.\n\n🛡️ *Nukeado desde:* ${infoNuke.origenGrupo}\n📝 *Razón:* ${infoNuke.razon}\n📅 *Fecha:* ${infoNuke.fecha}\n\n_Expulsando..._`,
                        mentions: [participant]
                    });
                    try { await sock.groupParticipantsUpdate(id, [participant], 'remove'); } catch (err) {}
                    return;
                }
            }
        }

        const config = global.welcomeCache[id];
        if (!config) return;

        const esBienvenida = action === 'add';
        const esDespedida = action === 'remove';

        if (esBienvenida && !config.welcomeActivo) return;
        if (esDespedida && !config.byeActivo) return;

        const metadata = await sock.groupMetadata(id).catch(() => null);
        if (!metadata) return;

        for (const user of participants) {
            let plantillaTexto = esBienvenida ? config.welcomeTexto : config.byeTexto;
            if (!plantillaTexto) continue;

            let textoMensaje = plantillaTexto
                .replace(/<member>/g, `@${user.split('@')[0]}`)
                .replace(/<name>/g, `@${user.split('@')[0]}`)
                .replace(/<group>/g, metadata.subject)
                .replace(/<desc>/g, metadata.desc?.toString() || 'Sin descripción')
                .replace(/<count>/g, metadata.participants.length)
                .replace(/<adder>/g, author ? `@${author.split('@')[0]}` : 'Enlace / Admin');

            let mentions = [user];
            if (author) mentions.push(author);
            let messageOptions = { text: textoMensaje, mentions: mentions };

            const usarTarjeta = esBienvenida ? config.welcomeCard : config.byeCard;
            if (usarTarjeta && typeof global.generarTarjetaBienvenida === 'function') {
                try {
                    const cardBuffer = await global.generarTarjetaBienvenida(user, metadata, action);
                    if (cardBuffer) {
                        messageOptions = { image: cardBuffer, caption: textoMensaje, mentions: mentions };
                    }
                } catch (err) {
                    console.error('Error generando tarjeta SVG:', err);
                }
            } else {
                const mediaUrl = esBienvenida ? config.welcomeMedia : config.byeMedia;
                if (mediaUrl) {
                    if (mediaUrl.endsWith('.mp4') || mediaUrl.endsWith('.gif')) {
                        messageOptions = { video: { url: mediaUrl }, gifPlayback: true, caption: textoMensaje, mentions: mentions };
                    } else {
                        messageOptions = { image: { url: mediaUrl }, caption: textoMensaje, mentions: mentions };
                    }
                }
            }

            await sock.sendMessage(id, messageOptions);
        }

    } catch (e) {
        console.error('Error en verificarUnionGrupo:', e);
    }
}

module.exports = { verificarUnionGrupo };
