module.exports = {
    name: 'sw',
    alias: ['setwatermark', 'setwm'],
    description: 'Define tu texto personalizado para el comando /wm.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;
        const sender = m.key.participant || from; // Soporte para grupos y chats privados

        if (!texto) {
            return sock.sendMessage(from, { text: '⚠️ _Por favor, ingresa el texto que deseas configurar._' });
        }

        try {
            // Asumiendo que usas Mongoose o una conexión directa a MongoDB global
            // global.db.data.users[sender] o tu modelo de MongoDB:
            const userDb = global.db?.data?.users || {}; 
            // Si manejas Mongoose directamente, harías un `await User.findOneAndUpdate(...)`
            
            // Ejemplo adaptado a estructura JSON global típica de bots Baileys con mongo:
            if (!global.db.data.users[sender]) {
                global.db.data.users[sender] = {};
            }
            global.db.data.users[sender].wmText = texto;

            await sock.sendMessage(from, { text: `✅ _Tu texto personalizado ha sido guardado exitosamente:_ \n\n"${texto}"` });
        } catch (e) {
            console.log(e);
            await sock.sendMessage(from, { text: '❌ _Ocurrió un error al guardar tu texto en la base de datos._' });
        }
    }
};
