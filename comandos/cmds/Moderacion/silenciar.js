const fs = require('fs');
const path = require('path');
const mutesPath = path.join(__dirname, '../mutes.json');

function obtenerMutes() {
    if (!fs.existsSync(mutesPath)) {
        fs.writeFileSync(mutesPath, JSON.stringify({}, null, 2));
    }
    try {
        return JSON.parse(fs.readFileSync(mutesPath, 'utf-8'));
    } catch (e) {
        return {};
    }
}

function guardarMutes(mutes) {
    fs.writeFileSync(mutesPath, JSON.stringify(mutes, null, 2));
}

module.exports = {
    name: 'mute',
    alias: ['silenciar', 'unmute', 'desmutear'],
    description: 'Mutea o desmutea a un usuario en el grupo actual.',
    
    before: async (m, { sock, isGroup, sender }) => {
        if (!isGroup || !sender) return;

        const from = m.key.remoteJid;
        const mutes = obtenerMutes();

        if (mutes[from] && mutes[from].includes(sender)) {
            try {
                await sock.sendMessage(from, {
                    delete: {
                        remoteJid: from,
                        fromMe: m.key.fromMe,
                        id: m.key.id,
                        participant: sender
                    }
                });
            } catch (e) {
                console.log(`[MUTE] Error al borrar:`, e.message);
            }
        }
    },

    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;

        if (!from.endsWith('@g.us')) {
            return sock.sendMessage(from, { text: '⚠️ _Este comando solo se puede usar en grupos._' }, { quoted: m });
        }

        // Obtener JID por respuesta a mensaje o mención
        let victim = m.message?.extendedTextMessage?.contextInfo?.participant || 
                     m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

        // Si no hay respuesta ni mención mapeada en contextInfo, la extraemos del texto o las menciones globales
        if (!victim && texto) {
            const mentionedJids = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            if (mentionedJids.length > 0) {
                victim = mentionedJids[0];
            } else {
                const numero = texto.replace(/[^0-9]/g, '');
                if (numero.length >= 8) {
                    victim = `${numero}@s.whatsapp.net`;
                }
            }
        }

        if (!victim) {
            return sock.sendMessage(from, { text: '⚠️ _Debes responder al mensaje de alguien o mencionarlo para silenciarlo/desmutearlo._' }, { quoted: m });
        }

        let mutes = obtenerMutes();
        const cmdUsed = m.body.slice(1).trim().split(/\s+/)[0].toLowerCase();

        // Si usó un alias para quitar el silencio
        if (['unmute', 'desmutear'].includes(cmdUsed)) {
            if (!mutes[from] || !mutes[from].includes(victim)) {
                return sock.sendMessage(from, { text: 'ℹ️ Este usuario no está silenciado en este grupo.' }, { quoted: m });
            }
            mutes[from] = mutes[from].filter(user => user !== victim);
            guardarMutes(mutes);
            return sock.sendMessage(from, { text: `🔊 @${victim.split('@')[0]} ha sido desmuteado.`, mentions: [victim] }, { quoted: m });
        }

        // De lo contrario, silenciar
        if (!mutes[from]) {
            mutes[from] = [];
        }

        if (mutes[from].includes(victim)) {
            return sock.sendMessage(from, { text: 'ℹ️ Este usuario ya está silenciado.' }, { quoted: m });
        }

        mutes[from].push(victim);
        guardarMutes(mutes);
        return sock.sendMessage(from, { text: `🔇 @${victim.split('@')[0]} ha sido silenciado. Intentaré borrar sus mensajes si el bot es admin.`, mentions: [victim] }, { quoted: m });
    }
};
