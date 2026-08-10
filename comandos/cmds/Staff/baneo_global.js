const mongoose = require('mongoose');

const nukeSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    razon: { type: String, default: 'Graves faltas al reglamento.' },
    origenGrupo: { type: String, default: 'Grupo Desconocido' },
    fecha: { type: String, default: () => new Date().toLocaleDateString() }
});

const NukeModel = mongoose.models.Nuke || mongoose.model('Nuke', nukeSchema);

module.exports = {
    name: 'nuke',
    alias: ['globalban', 'nukear'],
    description: 'Nukea a un usuario de todos los grupos globalmente de forma retroactiva.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;

        if (!from.endsWith('@g.us')) {
            return sock.sendMessage(from, { text: '❌ _Este comando solo se puede usar en grupos._' });
        }

        let targetJid = null;
        const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid;

        if (mentioned && mentioned.length > 0) {
            targetJid = mentioned[0];
        } else if (m.message?.extendedTextMessage?.contextInfo?.participant) {
            targetJid = m.message.extendedTextMessage.contextInfo.participant;
        }

        if (!targetJid && texto) {
            const numero = texto.split('|')[0].trim().replace(/[^0-9]/g, '');
            if (numero.length >= 10) {
                targetJid = `${numero}@s.whatsapp.net`;
            }
        }

        if (!targetJid) {
            return sock.sendMessage(from, { 
                text: '⚠️ *Uso correcto del comando:*\n\n1. Respondiendo al mensaje de alguien:\n`/nuke | Razón`\n\n2. Etiquetando al usuario:\n`/nuke @user | Razón`\n\n3. Usando el número directamente:\n`/nuke 5730000000 | Razón`' 
            }, { quoted: m });
        }

        let razon = 'Graves faltas al reglamento.';
        if (texto && texto.includes('|')) {
            razon = texto.split('|')[1].trim();
        } else if (texto && !texto.includes('|') && !texto.includes(targetJid.split('@')[0])) {
            razon = texto.trim();
        }

        let grupoNombre = 'Grupo Desconocido';
        try {
            const metadata = await sock.groupMetadata(from);
            grupoNombre = metadata.subject;
        } catch (e) {
            console.log('No se pudo obtener la información de este grupo.');
        }

        await NukeModel.findOneAndUpdate(
            { userId: targetJid },
            {
                userId: targetJid,
                razon: razon,
                origenGrupo: grupoNombre,
                fecha: new Date().toLocaleDateString()
            },
            { upsert: true, new: true }
        );

        await sock.sendMessage(from, {
            text: `☣️ *¡BARRIDO GLOBAL DE NUKE INICIADO!* ☣️\n\n👤 *Objetivo:* @${targetJid.split('@')[0]}\n🏫 *Lugar de origen:* ${grupoNombre}\n📝 *Razón:* ${razon}\n\n_Buscando al usuario en todas las bases del bot para proceder con el nuke masivo..._`,
            mentions: [targetJid]
        }, { quoted: m });

        let gruposAfectadosCount = 0;
        try {
            const queryGrupos = await sock.groupFetchAllParticipating();
            const grupos = Object.values(queryGrupos);
            
            for (const grupo of grupos) {
                const participantes = grupo.participants || [];
                const estaElUsuario = participantes.some(p => p.id === targetJid);
                
                if (estaElUsuario) {
                    const miIdLimpio = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                    const botParticipant = participantes.find(p => p.id.split(':')[0] === miIdLimpio.split(':')[0]);
                    const botEsAdmin = botParticipant && (botParticipant.admin === 'admin' || botParticipant.admin === 'superadmin');

                    if (botEsAdmin) {
                        await sock.groupParticipantsUpdate(grupo.id, [targetJid], 'remove');
                        gruposAfectadosCount++;
                    }
                }
            }
        } catch (err) {
            console.log('Error barriendo los grupos para el nuke:', err);
        }

        await sock.sendMessage(from, {
            text: `✅ *Barrido completado exitosamente.*\n\n💥 El usuario ha sido expulsado de *${gruposAfectadosCount}* grupos donde el bot era administrador.`
        }, { quoted: m });
    }
};
