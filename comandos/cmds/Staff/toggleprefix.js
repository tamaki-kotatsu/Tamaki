const mongoose = require('mongoose');

const groupPrefixConfigSchema = new mongoose.Schema({
    groupId: { type: String, required: true, unique: true },
    disableSymbols: { type: Boolean, default: false },
    disableNames: { type: Boolean, default: false }
});

const GroupPrefixConfigModel = mongoose.models.GroupPrefixConfig || mongoose.model('GroupPrefixConfig', groupPrefixConfigSchema);

global.groupPrefixConfig = global.groupPrefixConfig || {};

const cargarConfigs = async () => {
    try {
        const registros = await GroupPrefixConfigModel.find({});
        registros.forEach(doc => {
            global.groupPrefixConfig[doc.groupId] = {
                disableSymbols: doc.disableSymbols,
                disableNames: doc.disableNames
            };
        });
    } catch (e) {
        console.error('Error al cargar configuración de prefijos por grupo:', e);
    }
};
cargarConfigs();

module.exports = {
    name: 'toggleprefix',
    alias: ['noprefix', 'botname', 'simbolos'],
    description: 'Activa o desactiva los prefijos de símbolos o por nombre del bot en el grupo.',
    soloAdmins: true,
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;
        const esGrupo = from.endsWith('@g.us');

        if (!esGrupo) {
            return sock.sendMessage(from, { text: '⚠️ Este comando solo se puede usar en grupos.' }, { quoted: m });
        }

        const args = texto.trim().split(/ +/);
        const opcion = args[0] ? args[0].toLowerCase() : '';

        const configActual = global.groupPrefixConfig[from] || { disableSymbols: false, disableNames: false };

        if (opcion === 'nombre' || opcion === 'miku' || opcion === 'nombres') {
            const nuevoEstado = !configActual.disableNames;
            
            global.groupPrefixConfig[from] = {
                ...configActual,
                disableNames: nuevoEstado
            };

            await GroupPrefixConfigModel.findOneAndUpdate(
                { groupId: from },
                { groupId: from, disableNames: nuevoEstado },
                { upsert: true, new: true }
            );

            const msg = nuevoEstado 
                ? '🚫 *Nombres del bot desactivados:* El bot ya no responderá a `Miku`, `Hatsune`, etc. en este grupo.' 
                : '✅ *Nombres del bot activados:* El bot volverá a responder cuando lo llamen por su nombre.';

            return sock.sendMessage(from, { text: msg }, { quoted: m });
        }

        if (opcion === 'simbolos' || opcion === 'simbolo' || opcion === 'prefijo' || opcion === 'prefijos') {
            const nuevoEstado = !configActual.disableSymbols;

            global.groupPrefixConfig[from] = {
                ...configActual,
                disableSymbols: nuevoEstado
            };

            await GroupPrefixConfigModel.findOneAndUpdate(
                { groupId: from },
                { groupId: from, disableSymbols: nuevoEstado },
                { upsert: true, new: true }
            );

            const msg = nuevoEstado 
                ? '🚫 *Prefijos de símbolos desactivados:* El bot ya no responderá a `/`, `$`, `?`, etc. en este grupo.' 
                : '✅ *Prefijos de símbolos activados:* El bot responderá a los símbolos configurados.';

            return sock.sendMessage(from, { text: msg }, { quoted: m });
        }

        const estadoNombre = configActual.disableNames ? '❌ Desactivado' : '✅ Activado';
        const estadoSimbolos = configActual.disableSymbols ? '❌ Desactivado' : '✅ Activado';

        return sock.sendMessage(from, { 
            text: `⚙️ *Configuración de Prefijos en este grupo:*\n\n• *Nombres (Miku, Hatsune...):* ${estadoNombre}\n• *Símbolos (/, $, ?...):* ${estadoSimbolos}\n\n*Uso:*\n• \`${global.prefixes[0]}toggleprefix nombre\` (Activar/Desactivar respuesta por nombre)\n• \`${global.prefixes[0]}toggleprefix simbolos\` (Activar/Desactivar prefijos de símbolos)` 
        }, { quoted: m });
    }
};
