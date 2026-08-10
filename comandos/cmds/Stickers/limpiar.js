module.exports = {
    name: 'clearstickers',
    alias: ['delstickers', 'limpiarstickers', 'clearsticker'],
    description: 'Elimina una cantidad específica de stickers del historial del chat.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;

        const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (quoted && quoted.stickerMessage) {
            try {
                const quotedKey = m.message?.extendedTextMessage?.contextInfo?.stanzaId;
                const participant = m.message?.extendedTextMessage?.contextInfo?.participant;

                await sock.sendMessage(from, { react: { text: '⏳', key: m.key } });
                await sock.sendMessage(from, {
                    delete: { remoteJid: from, fromMe: participant === sock.user.id, id: quotedKey, participant: participant }
                });
                await sock.sendMessage(from, { react: { text: '✅', key: m.key } });
                await sock.sendMessage(from, { delete: m.key });
                return;
            } catch (e) {
                console.log(e);
                return;
            }
        }

        const cantidad = parseInt(texto);
        if (!isNaN(cantidad) && cantidad > 0) {
            try {
                await sock.sendMessage(from, { react: { text: '⏳', key: m.key } });
                const limite = Math.min(cantidad, 20);
                const statusMsg = await sock.sendMessage(from, { text: `🧹 Buscando los últimos ${limite} stickers en el chat...` });

                const mensajesGuardados = global.historialMensajes?.[from] || [];
                
                const stickersAEliminar = mensajesGuardados.filter(msg => {
                    if (msg.key.id === m.key.id) return false;
                    const esSticker = msg.message?.stickerMessage || 
                                      msg.message?.documentWithCaptionMessage?.message?.stickerMessage || 
                                      msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage;
                    return !!esSticker;
                }).slice(-limite);

                if (stickersAEliminar.length === 0) {
                    await sock.sendMessage(from, { text: '⚠️ No se encontraron stickers recientes en la memoria del bot.', edit: statusMsg.key });
                    await sock.sendMessage(from, { react: { text: '❌', key: m.key } });
                    return;
                }

                for (const msg of stickersAEliminar) {
                    try {
                        await sock.sendMessage(from, {
                            delete: {
                                remoteJid: from,
                                fromMe: msg.key.fromMe,
                                id: msg.key.id,
                                participant: msg.key.participant || msg.key.remoteJid
                            }
                        });
                        await new Promise(resolve => setTimeout(resolve, 300));
                    } catch (err) {}
                }

                await sock.sendMessage(from, { text: `✨ Se eliminaron los stickers encontrados con éxito.`, edit: statusMsg.key });
                await sock.sendMessage(from, { react: { text: '✅', key: m.key } });

                await new Promise(resolve => setTimeout(resolve, 2500));
                await sock.sendMessage(from, { delete: statusMsg.key });
                await sock.sendMessage(from, { delete: m.key });
                return;
            } catch (e) {
                console.log(e);
                return;
            }
        }

        return sock.sendMessage(from, { text: '🤖 *Uso:* Usa `/clearstickers 5` o responde a un sticker con el comando.' });
    }
};
