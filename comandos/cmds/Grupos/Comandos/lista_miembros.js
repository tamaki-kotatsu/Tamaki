module.exports = {
    name: 'miembros',
    alias: ['lista', 'integrantes'],
    description: 'Muestra los miembros del grupo divididos por creador, administradores y usuarios comunes.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;

        if (!from.endsWith('@g.us')) {
            return sock.sendMessage(from, { text: '🏽 _Este comando solo funciona en grupos._' });
        }

        try {
            const metadata = await sock.groupMetadata(from);
            const participantes = metadata.participants;

            // Arrays para clasificar los miembros
            let creadorId = metadata.owner || '';
            let admins = [];
            let usuariosComunes = [];
            let todosLosJids = [];

            participantes.forEach(p => {
                todosLosJids.push(p.id);
                if (p.id === creadorId || p.admin === 'superadmin') {
                    creadorId = p.id; // Asegurar que tenemos al creador principal
                } else if (p.admin === 'admin') {
                    admins.push(p.id);
                } else {
                    usuariosComunes.push(p.id);
                }
            });

            // Construir el mensaje de forma bonita y ordenada
            let lista = `👥 *Lista de Miembros de: ${metadata.subject}*\n`;
            lista += `Total de integrantes: *${participantes.length}*\n\n`;

            // 1. Categoría: Creador
            lista += `👑 *Creador del Grupo:*\n`;
            if (creadorId) {
                lista += `• @${creadorId.split('@')[0]}\n\n`;
            } else {
                lista += `• No disponible\n\n`;
            }

            // 2. Categoría: Administradores
            lista += `🛡️ *Administradores (${admins.length}):*\n`;
            if (admins.length > 0) {
                admins.forEach(ad => {
                    lista += `• @${ad.split('@')[0]}\n`;
                });
            } else {
                lista += `• No hay otros administradores\n`;
            }
            lista += `\n`;

            // 3. Categoría: Usuarios Comunes
            lista += `👥 *Miembros (${usuariosComunes.length}):*\n`;
            if (usuariosComunes.length > 0) {
                usuariosComunes.forEach(usr => {
                    lista += `• @${usr.split('@')[0]}\n`;
                });
            } else {
                lista += `• El grupo no tiene miembros comunes\n`;
            }

            await sock.sendMessage(from, { 
                text: lista, 
                mentions: todosLosJids 
            }, { quoted: m });

        } catch (e) {
            console.log(e);
            await sock.sendMessage(from, { text: '❌ Ocurrió un error al obtener y organizar los miembros del grupo.' }, { quoted: m });
        }
    }
};
