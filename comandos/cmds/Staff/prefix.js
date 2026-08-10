const mongoose = require('mongoose');

const prefixSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    prefixes: { type: [String], default: ['/'] }
});

const PrefixModel = mongoose.models.Prefix || mongoose.model('Prefix', prefixSchema);

global.prefixes = global.prefixes || ['/'];

const cargarPrefixes = async () => {
    try {
        const config = await PrefixModel.findOne({ key: 'global_prefix' });
        if (config && Array.isArray(config.prefixes) && config.prefixes.length > 0) {
            global.prefixes = config.prefixes;
        }
    } catch (e) {
        console.error('Error al cargar prefijos:', e);
    }
};

cargarPrefixes();

module.exports = {
    name: 'prefix',
    alias: ['prefijo', 'prefijos', 'setprefix', 'addprefix', 'delprefix'],
    description: 'Gestiona los prefijos globales del bot.',
    soloAdmins: true,
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;
        const args = texto.trim().split(/ +/);
        const accion = args[0] ? args[0].toLowerCase() : '';

        if (!texto) {
            const lista = global.prefixes.map(p => `\`${p}\``).join(', ');
            return sock.sendMessage(from, { 
                text: `💡 *Prefijos actuales:* ${lista}\n\n*Uso:*\n• \`${global.prefixes[0]}prefix add #, $\` (Añadir)\n• \`${global.prefixes[0]}prefix del #, $\` (Eliminar varios)` 
            }, { quoted: m });
        }

        if (accion === 'add' || accion === 'añadir' || accion === 'agregar') {
            const entrada = args.slice(1).join(' ').trim();
            if (!entrada) return sock.sendMessage(from, { text: '⚠️ Especifica los prefijos a añadir.' }, { quoted: m });
            
            const nuevos = entrada.split(/[\s,]+/).map(p => p.trim()).filter(p => p.length > 0 && p.length <= 3);

            let agregados = 0;
            for (const p of nuevos) {
                if (!global.prefixes.includes(p)) {
                    global.prefixes.push(p);
                    agregados++;
                }
            }

            if (agregados === 0) return sock.sendMessage(from, { text: '⚠️ No se añadió ningún prefijo nuevo (ya existían o superaban 3 caracteres).' }, { quoted: m });

            await PrefixModel.findOneAndUpdate(
                { key: 'global_prefix' },
                { key: 'global_prefix', prefixes: global.prefixes },
                { upsert: true, new: true }
            );

            const listaActual = global.prefixes.map(p => `\`${p}\``).join(', ');
            return sock.sendMessage(from, { text: `✅ *Prefijo(s) añadido(s) correctamente.*\n\nLista de prefijos: ${listaActual}` }, { quoted: m });
        }

        if (accion === 'del' || accion === 'delete' || accion === 'quitar' || accion === 'eliminar') {
            const entrada = args.slice(1).join(' ').trim();
            if (!entrada) return sock.sendMessage(from, { text: '⚠️ Especifica los prefijos a eliminar.' }, { quoted: m });

            const aEliminar = entrada.split(/[\s,]+/).map(p => p.trim()).filter(p => p.length > 0);
            
            let eliminados = 0;
            for (const p of aEliminar) {
                if (global.prefixes.length > 1 && global.prefixes.includes(p)) {
                    global.prefixes = global.prefixes.filter(item => item !== p);
                    eliminados++;
                }
            }

            if (eliminados === 0) {
                return sock.sendMessage(from, { text: '⚠️ No se pudo eliminar ningún prefijo (comprueba si existen o si intentas dejar la lista vacía).' }, { quoted: m });
            }

            await PrefixModel.findOneAndUpdate(
                { key: 'global_prefix' },
                { key: 'global_prefix', prefixes: global.prefixes },
                { upsert: true, new: true }
            );

            const listaActual = global.prefixes.map(p => `\`${p}\``).join(', ');
            return sock.sendMessage(from, { text: `🗑️ *Prefijo(s) eliminado(s) correctamente.*\n\nLista de prefijos: ${listaActual}` }, { quoted: m });
        }

        const nuevos = texto.split(/[\s,]+/).map(p => p.trim()).filter(p => p.length > 0 && p.length <= 3);
        let agregados = 0;
        for (const p of nuevos) {
            if (!global.prefixes.includes(p)) {
                global.prefixes.push(p);
                agregados++;
            }
        }

        if (agregados > 0) {
            await PrefixModel.findOneAndUpdate(
                { key: 'global_prefix' },
                { key: 'global_prefix', prefixes: global.prefixes },
                { upsert: true, new: true }
            );
        }

        const listaActual = global.prefixes.map(p => `\`${p}\``).join(', ');
        return sock.sendMessage(from, { text: `✅ *Prefijo(s) configurado(s).*\n\nLista de prefijos: ${listaActual}` }, { quoted: m });
    }
};
