const mongoose = require('mongoose');

const blacklistSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    usuarios: { type: Array, default: [] }
});

const BlacklistModel = mongoose.models.Blacklist || mongoose.model('Blacklist', blacklistSchema);

module.exports = {
    name: 'banbot',
    alias: ['unbanbot', 'blacklist', 'bl'],
    description: 'Maneja el bloqueo de usuarios en el bot de forma global.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;
        const cmdUsed = m.body.slice(1).trim().split(/\s+/)[0].toLowerCase();

        let doc = await BlacklistModel.findOne({ key: 'global_blacklist' });
        if (!doc) {
            doc = new BlacklistModel({ key: 'global_blacklist', usuarios: [] });
        }

        let list = doc.usuarios;

        if ((cmdUsed === 'blacklist' || cmdUsed === 'bl') && (!texto || texto.trim() === '' || texto.trim() === 'ver')) {
            if (list.length === 0) {
                return sock.sendMessage(from, { text: 'ℹ️ La lista de usuarios baneados en el bot está vacía.' }, { quoted: m });
            }
            let txt = '📝 *LISTA NEGRA DEL BOT*\n\n';
            list.forEach((user, index) => {
                txt += `${index + 1}. @${user.split('@')[0]}\n`;
            });
            return sock.sendMessage(from, { text: txt, mentions: list }, { quoted: m });
        }

        let victim = m.message?.extendedTextMessage?.contextInfo?.participant || 
                     m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

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
            return sock.sendMessage(from, { 
                text: '⚠️ *Uso del comando:*\n\n• Responder al mensaje de alguien con `/banbot` o `/unbanbot`.\n• Mencionar usando `/banbot @user` o `/unbanbot @user`.\n• Usar `/bl` para ver la lista de bloqueados.' 
            }, { quoted: m });
        }

        const esDesbaneo = ['unbanbot', 'unban'].includes(cmdUsed) || (texto && (texto.startsWith('remove') || texto.startsWith('del')));

        if (esDesbaneo) {
            if (!list.includes(victim)) {
                return sock.sendMessage(from, { text: 'ℹ️ Este usuario no se encuentra en la blacklist del bot.' }, { quoted: m });
            }
            doc.usuarios = list.filter(user => user !== victim);
            await doc.save();
            return sock.sendMessage(from, { text: `✅ @${victim.split('@')[0]} ha sido removido de la blacklist.`, mentions: [victim] }, { quoted: m });
        } else {
            if (list.includes(victim)) {
                return sock.sendMessage(from, { text: 'ℹ️ Este usuario ya está en la blacklist del bot.' }, { quoted: m });
            }
            doc.usuarios.push(victim);
            await doc.save();
            return sock.sendMessage(from, { text: `⛔ @${victim.split('@')[0]} ha sido añadido a la lista negra. El bot ignorará todos sus comandos globales.`, mentions: [victim] }, { quoted: m });
        }
    }
};
