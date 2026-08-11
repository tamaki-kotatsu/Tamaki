const mongoose = require('mongoose');

const WelcomeModel = mongoose.models.Welcome || mongoose.model('Welcome');

module.exports = {
    name: 'bienvenida',
    alias: ['welcome', 'setwelcome', 'despedida', 'setdespedida', 'setbye'],
    description: 'Configura las bienvenidas y despedidas del grupo.',
    soloAdmins: true,
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;

        if (!from.endsWith('@g.us')) {
            return sock.sendMessage(from, { text: '❌ _Este comando solo se puede usar en grupos._' }, { quoted: m });
        }

        global.welcomeCache = global.welcomeCache || {};
        let config = global.welcomeCache[from];

        if (!config) {
            let doc = await WelcomeModel.findOne({ groupId: from });
            if (!doc) {
                doc = await WelcomeModel.create({ groupId: from });
            }
            config = doc.toObject();
            global.welcomeCache[from] = config;
        }

        const args = texto ? texto.trim().split(' ') : [];
        const subComando = args[0]?.toLowerCase();
        const valor = args.slice(1).join(' ');

        switch (subComando) {
            case 'on':
            case 'activar':
                await WelcomeModel.findOneAndUpdate({ groupId: from }, { welcomeActivo: true, byeActivo: true }, { upsert: true });
                global.welcomeCache[from].welcomeActivo = true;
                global.welcomeCache[from].byeActivo = true;
                return sock.sendMessage(from, { text: '✅ *Bienvenidas y Despedidas activadas en este grupo.*' }, { quoted: m });

            case 'off':
            case 'desactivar':
                await WelcomeModel.findOneAndUpdate({ groupId: from }, { welcomeActivo: false, byeActivo: false }, { upsert: true });
                global.welcomeCache[from].welcomeActivo = false;
                global.welcomeCache[from].byeActivo = false;
                return sock.sendMessage(from, { text: '🚫 *Bienvenidas y Despedidas desactivadas en este grupo.*' }, { quoted: m });

            case 'setbienvenida':
            case 'setwelcome':
                if (!valor) return sock.sendMessage(from, { text: '⚠️ *Ingresa el mensaje de bienvenida.*\n\nEjemplo:\n`/bienvenida setbienvenida Hola <member> bienvenido a <group>`' }, { quoted: m });
                await WelcomeModel.findOneAndUpdate({ groupId: from }, { welcomeTexto: valor }, { upsert: true });
                global.welcomeCache[from].welcomeTexto = valor;
                return sock.sendMessage(from, { text: '✅ *Mensaje de bienvenida guardado correctamente.*' }, { quoted: m });

            case 'setdespedida':
            case 'setbye':
                if (!valor) return sock.sendMessage(from, { text: '⚠️ *Ingresa el mensaje de despedida.*' }, { quoted: m });
                await WelcomeModel.findOneAndUpdate({ groupId: from }, { byeTexto: valor }, { upsert: true });
                global.welcomeCache[from].byeTexto = valor;
                return sock.sendMessage(from, { text: '✅ *Mensaje de despedida guardado correctamente.*' }, { quoted: m });

            case 'media':
                if (!valor.startsWith('http')) return sock.sendMessage(from, { text: '⚠️ _Escribe un enlace directo válido a una imagen o video GIF._' }, { quoted: m });
                await WelcomeModel.findOneAndUpdate({ groupId: from }, { welcomeMedia: valor }, { upsert: true });
                global.welcomeCache[from].welcomeMedia = valor;
                return sock.sendMessage(from, { text: '🖼️ *Imagen/GIF de bienvenida guardado.*' }, { quoted: m });

            case 'tarjeta':
            case 'card':
                const nuevoEstado = !global.welcomeCache[from].welcomeCard;
                await WelcomeModel.findOneAndUpdate({ groupId: from }, { welcomeCard: nuevoEstado, byeCard: nuevoEstado }, { upsert: true });
                global.welcomeCache[from].welcomeCard = nuevoEstado;
                global.welcomeCache[from].byeCard = nuevoEstado;
                return sock.sendMessage(from, { text: `🎨 *Tarjeta SVG/Animación:* ${nuevoEstado ? 'ACTIVADA' : 'DESACTIVADA'}` }, { quoted: m });

            default:
                const menu = 
`⚙️ *CONFIGURACIÓN DE BIENVENIDAS Y DESPEDIDAS*

• */bienvenida activar* | *desactivar*
• */bienvenida setbienvenida <texto>*
• */bienvenida setdespedida <texto>*
• */bienvenida media <URL de foto o gif>*
• */bienvenida tarjeta* (Activa/Desactiva tu tarjeta SVG/Sharp)

📌 *Variables disponibles:*
• \`<member>\` : Menciona al usuario que entra/sale
• \`<name>\` : Nombre/Número del usuario
• \`<group>\` : Nombre del grupo
• \`<desc>\` : Descripción del grupo
• \`<count>\` : Total de miembros
• \`<adder>\` : Usuario que lo invitó o aceptó el link
• \`@grupo\` : Menciona a todos en el grupo`;

                return sock.sendMessage(from, { text: menu }, { quoted: m });
        }
    }
};
