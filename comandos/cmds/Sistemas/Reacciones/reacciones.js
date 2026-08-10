const fs = require('fs');
const path = require('path');

// Ruta de base de datos para persistencia (en la raíz del proyecto)
const dbPath = path.join(__dirname, '../database.json');

// Función auxiliar para leer la base de datos
function readDB() {
    if (!fs.existsSync(dbPath)) {
        fs.writeFileSync(dbPath, JSON.stringify({ owners: {}, config: {} }, null, 2));
    }
    return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
}

// Función auxiliar para guardar en la base de datos
function writeDB(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// Expresión regular para validar si el texto ingresado es REALMENTE un emoji
const emojiRegex = /[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E6}-\u{1F1FF}\u{1F191}-\u{1F251}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F171}\u{1F17E}-\u{1F17F}\u{1F18E}\u{3030}\u{2B50}\u{2B55}\u{2934}-\u{2935}\u{2B05}-\u{2B07}\u{3297}\u{3299}\u{303D}\u{00A9}\u{00AE}\u{2122}\u{23F3}\u{24C2}\u{23E9}-\u{23EF}\u{25B6}\u{23F8}-\u{23FA}]/u;

module.exports = {
    name: 'reacciones',
    alias: ['reac', 'setreac', 'autoreac', 'reacoff'],
    description: 'Gestiona la reacción persistente para cualquier usuario.',
    
    // 1. Ejecución automática para TODOS los mensajes (incluyendo fotos de una sola vez)
    before: async (m, { sock, sender }) => {
        // Obtenemos el mensaje real, incluso si es un mensaje de "una sola vez" (viewOnce)
        const msg = m.message?.viewOnceMessageV2?.message || 
                    m.message?.viewOnceMessageV2Extension?.message || 
                    m.message;

        if (!msg) return;
        
        const from = m.key.remoteJid;
        if (!from || from.endsWith('@newsletter')) return;

        const db = readDB();
        if (!db.owners) db.owners = {};

        const userConfig = db.owners[sender];

        // Si el usuario tiene una reacción guardada y activa, el bot reacciona
        if (userConfig && userConfig.emoji && userConfig.activo) {
            try {
                await sock.sendMessage(from, {
                    react: {
                        text: userConfig.emoji,
                        key: m.key
                    }
                });
            } catch (e) {
                console.error('❌ Error al intentar reaccionar:', e);
            }
        }
    },

    // 2. Comando de configuración
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;
        const sender = m.key.participant || m.key.remoteJid;
        
        const body = m.message?.conversation || 
                     m.message?.extendedTextMessage?.text || 
                     '';
        
        const db = readDB();
        if (!db.owners) db.owners = {};

        // Comando para apagar la reacción (/reacoff o /setreacoff)
        if (body.startsWith('/reacoff') || body.startsWith('/setreacoff')) {
            if (db.owners[sender]) {
                db.owners[sender].activo = false;
                writeDB(db);
                return sock.sendMessage(from, { text: '📴 Reacción automática desactivada correctamente.' }, { quoted: m });
            } else {
                return sock.sendMessage(from, { text: '⚠️ No tienes ninguna reacción configurada para desactivar.' }, { quoted: m });
            }
        }

        // Comando para encender/cambiar la reacción (/setreac <emoji>)
        if (!texto) {
            return sock.sendMessage(from, { text: '💡 Uso: `/setreac <emoji>` (Ejemplo: `/setreac 🦇`)' }, { quoted: m });
        }

        const input = texto.trim();

        // Validar si el texto contiene un emoji válido
        if (!emojiRegex.test(input)) {
            return sock.sendMessage(from, { text: '❌ *Error:* Por favor ingresa un emoji real. Las palabras o textos comunes no son válidos para reacciones.' }, { quoted: m });
        }

        // Extraer únicamente el emoji por si pusieron texto extra
        const emojiCmd = input.match(emojiRegex)[0];

        // Guardamos la configuración asociada a la persona que envió el comando
        db.owners[sender] = {
            emoji: emojiCmd,
            activo: true
        };
        writeDB(db);

        return sock.sendMessage(from, { text: `✅ ¡Configurado! A partir de ahora reaccionaré a todos tus mensajes (incluyendo fotos de una sola vez 👁️) con: ${emojiCmd}` }, { quoted: m });
    }
};
