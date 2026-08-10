const mongoose = require('mongoose');
const sharp = require('sharp');

// --- ESQUEMAS MONGOOSE ---
const afkSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    groupId: { type: String, required: true },
    motivo: { type: String, default: 'Sin motivo especificado' },
    tiempo: { type: Number, default: Date.now }
}, { strict: false });

const userFraseSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    frase: { type: String, default: "¡Hola! Soy Hatsune Miku 🩵, una bot en desarrollo" }
});

const groupAfkConfigSchema = new mongoose.Schema({
    groupId: { type: String, required: true, unique: true },
    bgBuffer: { type: Buffer, default: null },
    borderColor: { type: String, default: '#38BDF8' },
    bgColor: { type: String, default: '#0F172A' },
    presetId: { type: Number, default: 1 }
});

if (mongoose.models.Afk) delete mongoose.models.Afk;
const AfkModel = mongoose.model('Afk', afkSchema);
const UserFraseModel = mongoose.models.UserFrase || mongoose.model('UserFrase', userFraseSchema);
const GroupAfkConfigModel = mongoose.models.GroupAfkConfig || mongoose.model('GroupAfkConfig', groupAfkConfigSchema);

// --- RECREACIÓN SVG VECTORIAL DE LAS 10 IMÁGENES DE LA GALERÍA ---
function obtenerSvgPreset(id, width = 800, height = 300) {
    const presets = {
        // 1. Espacio Rosa/Morado con Planetas
        1: `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#2E1065"/><stop offset="100%" stop-color="#0F0728"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g1)"/><circle cx="100" cy="80" r="45" fill="#EC4899" fill-opacity="0.8"/><circle cx="700" cy="220" r="55" fill="#DB2777" fill-opacity="0.8"/><ellipse cx="400" cy="280" rx="250" ry="60" fill="#7E22CE" fill-opacity="0.7"/><circle cx="250" cy="180" r="20" fill="#F43F5E"/><ellipse cx="250" cy="180" rx="35" ry="8" fill="none" stroke="#FDE047" stroke-width="3"/></svg>`,
        
        // 2. Cielo Azul con Avión de Papel
        2: `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g2" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#38BDF8"/><stop offset="100%" stop-color="#7DD3FC"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g2)"/><path d="M 50 100 Q 120 70 200 100 T 350 100" fill="none" stroke="#FFFFFF" stroke-width="20" stroke-linecap="round" opacity="0.4"/><polygon points="650,80 720,110 670,120 660,140" fill="#FFFFFF"/><polygon points="650,80 670,120 640,110" fill="#E2E8F0"/></svg>`,
        
        // 3. Spider-Man Neón en Sombras
        3: `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#050505"/><path d="M 0 300 Q 150 150 250 300 Z" fill="#991B1B"/><ellipse cx="180" cy="220" rx="25" ry="12" fill="#FFFFFF" transform="rotate(-15 180 220)" stroke="#000" stroke-width="3"/><ellipse cx="220" cy="220" rx="25" ry="12" fill="#FFFFFF" transform="rotate(15 220 220)" stroke="#000" stroke-width="3"/><path d="M 200 300 L 400 240 L 450 270" fill="none" stroke="#DC2626" stroke-width="25" stroke-linecap="round"/></svg>`,
        
        // 4. Cielo Noche Garabateado (Doodle Stars)
        4: `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g4" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#1E1B4B"/><stop offset="100%" stop-color="#312E81"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g4)"/><path d="M 0 240 Q 200 180 400 240 T 800 220 L 800 300 L 0 300 Z" fill="#0F172A"/><path d="M 100 80 L 110 100 L 130 105 L 115 120 L 120 140 L 100 128 L 80 140 L 85 120 L 70 105 L 90 100 Z" fill="none" stroke="#FFFFFF" stroke-width="2"/><ellipse cx="600" cy="90" rx="30" ry="15" fill="none" stroke="#FFFFFF" stroke-width="2"/></svg>`,
        
        // 5. The Neighbourhood / Palmera Silueta
        5: `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#000000"/><circle cx="400" cy="150" r="90" fill="#FFFFFF"/><path d="M 330 190 Q 350 150 360 210 Q 380 160 390 210" stroke="#000000" stroke-width="6" fill="none"/><path d="M 330 190 Q 310 170 300 185" stroke="#000000" stroke-width="5" fill="none"/></svg>`,
        
        // 6. Nubes Pixel Art Nocturnas
        6: `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0A0A0C"/><path d="M 400 50 L 405 130 L 400 210 M 320 130 L 400 130 L 480 130" stroke="#FFFFFF" stroke-width="3"/><rect x="50" y="180" width="180" height="80" fill="#3F3F46" rx="10"/><rect x="570" y="160" width="190" height="90" fill="#3F3F46" rx="10"/></svg>`,
        
        // 7. GitHub Space Octocat
        7: `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#18181B"/><circle cx="400" cy="150" r="75" fill="#3F3F46"/><path d="M 360 120 Q 370 90 385 115 Q 400 90 415 115 Q 430 90 440 120 C 450 160 430 190 400 190 C 370 190 350 160 360 120 Z" fill="#09090B"/><circle cx="150" cy="90" r="15" fill="none" stroke="#4ADE80" stroke-width="3"/><circle cx="680" cy="220" r="18" fill="none" stroke="#F43F5E" stroke-width="3"/></svg>`,
        
        // 8. Conejitos Pixel en la Playa
        8: `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g8" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#1E293B"/><stop offset="100%" stop-color="#0F172A"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g8)"/><rect x="0" y="200" width="800" height="100" fill="#334155"/><rect x="330" y="150" width="35" height="50" fill="#000000" rx="5"/><rect x="430" y="130" width="35" height="70" fill="#818CF8" rx="5"/></svg>`,
        
        // 9. Minecraft Fogata Nocturna
        9: `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#052E16"/><rect x="0" y="220" width="800" height="80" fill="#14532D"/><rect x="360" y="200" width="80" height="30" fill="#78350F"/><polygon points="400,140 370,200 430,200" fill="#F97316"/><rect x="200" y="150" width="50" height="80" fill="#15803D"/></svg>`,
        
        // 10. Undertale Frisk & Flores Doradas
        10: `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0A0A0A"/><ellipse cx="400" cy="240" rx="280" ry="40" fill="#EAB308"/><circle cx="400" cy="150" r="45" fill="#FFFFFF"/><circle cx="280" cy="170" r="35" fill="#A855F7"/><circle cx="520" cy="180" r="30" fill="#EAB308"/></svg>`
    };
    return presets[id] || presets[1];
}

const NOMBRES_GALERIA = [
    "1. Espacio Cósmico", "2. Cielo & Avión", "3. Spider Neón", 
    "4. Noche Garabato", "5. Palmera Minimal", "6. Nubes Pixel", 
    "7. GitHub Space", "8. Playa Pixel", "9. Minecraft Camp", "10. Undertale Gold"
];

// --- FUNCIONES AUXILIARES ---
function limpiarTexto(str, maxLen = 40) {
    if (!str) return '';
    let limpio = str
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\x20-\x7E]/g, '')
        .trim();
    
    if (!limpio) limpio = "Usuario";
    if (limpio.length > maxLen) {
        limpio = limpio.substring(0, maxLen - 3) + '...';
    }
    return limpio;
}

function escapeXml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function formatoTiempo(ms) {
    let segundos = Math.floor((ms / 1000) % 60);
    let minutos = Math.floor((ms / (1000 * 60)) % 60);
    let horas = Math.floor((ms / (1000 * 60 * 60)) % 24);
    let dias = Math.floor(ms / (1000 * 60 * 60 * 24));

    let res = [];
    if (dias > 0) res.push(`${dias}d`);
    if (horas > 0) res.push(`${horas}h`);
    if (minutos > 0) res.push(`${minutos}m`);
    res.push(`${segundos}s`);
    return res.join(' ');
}

async function obtenerFondoBuffer(config) {
    if (config.bgBuffer) return config.bgBuffer;

    if (config.bgColor && config.bgColor.toUpperCase() !== '#0F172A') {
        const customBgSvg = `<svg width="800" height="300" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="300" fill="${config.bgColor}"/></svg>`;
        return await sharp(Buffer.from(customBgSvg)).png().toBuffer();
    }

    const presetSvg = obtenerSvgPreset(config.presetId || 1, 800, 300);
    return await sharp(Buffer.from(presetSvg)).png().toBuffer();
}

// --- GENERADORES DE TARJETAS ---
async function crearTarjetaAfk(avatarBuffer, nombre, motivo, estado, config) {
    const ancho = 800;
    const alto = 300;
    const avatarTamano = 180;
    const borderColor = config.borderColor || '#38BDF8';

    const nombreClean = escapeXml(limpiarTexto(nombre, 22));
    const motivoClean = escapeXml(limpiarTexto(motivo, 35));
    const estadoClean = escapeXml(limpiarTexto(estado, 42));

    let avatarProcesado;
    try {
        avatarProcesado = await sharp(avatarBuffer).resize(avatarTamano, avatarTamano, { fit: 'cover' }).png().toBuffer();
    } catch {
        avatarProcesado = await sharp({ create: { width: avatarTamano, height: avatarTamano, channels: 4, background: { r: 40, g: 40, b: 40, alpha: 1 } } }).png().toBuffer();
    }

    const fondoBaseRaw = await obtenerFondoBuffer(config);
    const fondoBase = await sharp(fondoBaseRaw).resize(ancho, alto, { fit: 'cover' }).png().toBuffer();

    const svgOverlay = `
    <svg width="${ancho}" height="${alto}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${ancho}" height="${alto}" rx="20" fill="#000000" fill-opacity="0.55" />
        <rect x="15" y="15" width="${ancho - 30}" height="${alto - 30}" rx="15" fill="none" stroke="${borderColor}" stroke-width="3" />

        <rect x="40" y="35" width="220" height="42" rx="10" fill="#000000" fill-opacity="0.65" stroke="${borderColor}" stroke-width="1.5" />
        <text x="55" y="65" fill="${borderColor}" font-size="24" font-family="sans-serif" font-weight="bold">ESTADO AFK</text>

        <rect x="40" y="90" width="480" height="45" rx="10" fill="#000000" fill-opacity="0.6" stroke="${borderColor}" stroke-width="1" />
        <text x="55" y="122" fill="#FFFFFF" font-size="26" font-family="sans-serif" font-weight="bold">${nombreClean}</text>

        <rect x="40" y="148" width="480" height="60" rx="10" fill="#000000" fill-opacity="0.6" stroke="${borderColor}" stroke-width="1" />
        <text x="55" y="172" fill="${borderColor}" font-size="15" font-family="sans-serif" font-weight="bold">MOTIVO:</text>
        <text x="55" y="196" fill="#E2E8F0" font-size="18" font-family="sans-serif">${motivoClean}</text>

        <rect x="40" y="220" width="480" height="42" rx="10" fill="#000000" fill-opacity="0.6" stroke="${borderColor}" stroke-width="1" />
        <text x="55" y="247" fill="#94A3B8" font-size="16" font-family="sans-serif" font-style="italic">"${estadoClean}"</text>

        <rect x="568" y="58" width="${avatarTamano + 6}" height="${avatarTamano + 6}" rx="14" fill="none" stroke="${borderColor}" stroke-width="4" />
    </svg>`;

    const xAvatar = ancho - avatarTamano - 50; 
    const yAvatar = Math.floor((alto - avatarTamano) / 2);

    return await sharp(fondoBase)
        .composite([
            { input: Buffer.from(svgOverlay), top: 0, left: 0 },
            { input: avatarProcesado, top: yAvatar, left: xAvatar }
        ])
        .png()
        .toBuffer();
    }async function crearTarjetaCentrada(avatarBuffer, titulo, sub1, sub2, config) {
    const ancho = 800;
    const alto = 350;
    const avatarTamano = 130;
    const borderColor = config.borderColor || '#38BDF8';

    const tituloClean = escapeXml(limpiarTexto(titulo, 25));
    const sub1Clean = escapeXml(limpiarTexto(sub1, 45));
    const sub2Clean = escapeXml(limpiarTexto(sub2, 50));

    const circleSvg = Buffer.from(`<svg width="${avatarTamano}" height="${avatarTamano}"><circle cx="${avatarTamano/2}" cy="${avatarTamano/2}" r="${avatarTamano/2}" fill="#fff"/></svg>`);
    let avatarRedondo;
    try {
        const rawAvatar = await sharp(avatarBuffer).resize(avatarTamano, avatarTamano, { fit: 'cover' }).png().toBuffer();
        avatarRedondo = await sharp(rawAvatar).composite([{ input: circleSvg, blend: 'dest-in' }]).png().toBuffer();
    } catch {
        avatarRedondo = await sharp({ create: { width: avatarTamano, height: avatarTamano, channels: 4, background: { r: 50, g: 50, b: 50, alpha: 1 } } }).png().toBuffer();
    }

    const fondoBaseRaw = await obtenerFondoBuffer(config);
    const fondoBase = await sharp(fondoBaseRaw).resize(ancho, alto, { fit: 'cover' }).png().toBuffer();

    const xAvatar = Math.floor((ancho - avatarTamano) / 2);

    const svgOverlay = `
    <svg width="${ancho}" height="${alto}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${ancho}" height="${alto}" rx="20" fill="#000000" fill-opacity="0.6" />
        <rect x="15" y="15" width="${ancho - 30}" height="${alto - 30}" rx="15" fill="none" stroke="${borderColor}" stroke-width="3" />

        <circle cx="${ancho/2}" cy="95" r="${(avatarTamano/2) + 4}" fill="none" stroke="${borderColor}" stroke-width="4" />

        <rect x="150" y="175" width="500" height="42" rx="10" fill="#000000" fill-opacity="0.7" stroke="${borderColor}" stroke-width="1.5" />
        <text x="400" y="203" fill="#FFFFFF" font-size="22" font-family="sans-serif" font-weight="bold" text-anchor="middle">${tituloClean}</text>

        <rect x="100" y="228" width="600" height="42" rx="10" fill="#000000" fill-opacity="0.65" stroke="${borderColor}" stroke-width="1" />
        <text x="400" y="255" fill="${borderColor}" font-size="18" font-family="sans-serif" font-weight="bold" text-anchor="middle">${sub1Clean}</text>

        <rect x="120" y="280" width="560" height="38" rx="10" fill="#000000" fill-opacity="0.6" stroke="${borderColor}" stroke-width="1" />
        <text x="400" y="305" fill="#E2E8F0" font-size="16" font-family="sans-serif" font-style="italic" text-anchor="middle">"${sub2Clean}"</text>
    </svg>`;

    return await sharp(fondoBase)
        .composite([
            { input: Buffer.from(svgOverlay), top: 0, left: 0 },
            { input: avatarRedondo, top: 30, left: xAvatar }
        ])
        .png()
        .toBuffer();
}

async function generarImagenGalería() {
    const ancho = 1000;
    const alto = 1200;
    
    let composites = [];
    
    const bgSvg = `<svg width="${ancho}" height="${alto}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${ancho}" height="${alto}" fill="#0F172A"/>
        <text x="500" y="60" fill="#38BDF8" font-size="36" font-family="sans-serif" font-weight="bold" text-anchor="middle">🎨 GALERÍA DE FONDOS AFK</text>
        <text x="500" y="95" fill="#94A3B8" font-size="20" font-family="sans-serif" text-anchor="middle">Usa: .set fondo afk &lt;número&gt; para aplicar</text>
    </svg>`;

    composites.push({ input: Buffer.from(bgSvg), top: 0, left: 0 });

    for (let i = 1; i <= 10; i++) {
        const col = (i - 1) % 2; 
        const row = Math.floor((i - 1) / 2);

        const x = col === 0 ? 50 : 520;
        const y = 130 + (row * 200);

        try {
            const presetSvg = obtenerSvgPreset(i, 430, 150);
            const thumb = await sharp(Buffer.from(presetSvg)).png().toBuffer();

            const cardOverlay = `<svg width="430" height="150" xmlns="http://www.w3.org/2000/svg">
                <rect width="430" height="150" rx="12" fill="none" stroke="#38BDF8" stroke-width="3"/>
                <rect x="10" y="10" width="40" height="40" rx="8" fill="#000000" fill-opacity="0.8"/>
                <text x="30" y="37" fill="#38BDF8" font-size="22" font-family="sans-serif" font-weight="bold" text-anchor="middle">${i}</text>
                <rect x="10" y="105" width="410" height="35" rx="8" fill="#000000" fill-opacity="0.75"/>
                <text x="20" y="128" fill="#FFFFFF" font-size="16" font-family="sans-serif" font-weight="bold">${escapeXml(NOMBRES_GALERIA[i-1])}</text>
            </svg>`;

            const finalThumb = await sharp(thumb).composite([{ input: Buffer.from(cardOverlay) }]).png().toBuffer();
            composites.push({ input: finalThumb, top: y, left: x });
        } catch (e) {
            console.error(`Error procesando miniatura ${i}:`, e);
        }
    }

    return await sharp({
        create: { width: ancho, height: alto, channels: 4, background: { r: 15, g: 23, b: 42, alpha: 1 } }
    }).composite(composites).png().toBuffer();
}

// --- MÓDULO PRINCIPAL ---
module.exports = {
    name: 'afk',
    alias: ['ausente', 'unafk', 'noafk', 'set', 'fondos'],
    description: 'Sistema AFK completo con tarjetas dinámicas.',

    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;
        if (!from || !from.endsWith('@g.us')) return;

        const sender = m.key.participant || (m.key.fromMe ? sock.user.id.split(':')[0] + '@s.whatsapp.net' : m.key.remoteJid);
        const body = (m.message?.conversation || m.message?.extendedTextMessage?.text || m.message?.imageMessage?.caption || '').trim();
        const args = body.split(/ +/);
        const cmd = args[0].toLowerCase().replace(/^[\/!.]/, '');

        let groupConfig = await GroupAfkConfigModel.findOne({ groupId: from }) || await GroupAfkConfigModel.create({ groupId: from });

        // 1. DESACTIVAR AFK AL ESCRIBIR CUALQUIER MENSAJE
        const afkPropio = await AfkModel.findOne({ userId: sender, groupId: from });
        if (afkPropio && cmd !== 'afk' && cmd !== 'ausente') {
            let tiempoInactivo = formatoTiempo(Date.now() - afkPropio.tiempo);
            await AfkModel.deleteOne({ userId: sender, groupId: from });

            let avatarBuf;
            try {
                const url = await sock.profilePictureUrl(sender, 'image');
                avatarBuf = Buffer.from(await (await fetch(url)).arrayBuffer());
            } catch {
                avatarBuf = await sharp({ create: { width: 150, height: 150, channels: 4, background: { r: 60, g: 60, b: 60, alpha: 1 } } }).png().toBuffer();
            }

            const nombreReal = m.pushName || sender.split('@')[0];
            const cardUnAFK = await crearTarjetaCentrada(
                avatarBuf,
                `¡Bienvenido ${nombreReal}!`,
                `Estado AFK desactivado`,
                `Tiempo ausente: ${tiempoInactivo}`,
                groupConfig
            );

            return await sock.sendMessage(from, {
                image: cardUnAFK,
                caption: `👋 *@${sender.split('@')[0]}* ya no está ausente.`,
                mentions: [sender]
            });
        }

        // 2. MENCIONES O RESPUESTAS A USUARIOS AFK
        let targetJidsToNotice = new Set();
        const mentionedJids = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        mentionedJids.forEach(j => targetJidsToNotice.add(j));

        const quotedParticipant = m.message?.extendedTextMessage?.contextInfo?.participant;
        if (quotedParticipant) targetJidsToNotice.add(quotedParticipant);

        if (targetJidsToNotice.size > 0 && cmd !== 'unafk' && cmd !== 'noafk' && cmd !== 'afk') {
            for (let targetJid of targetJidsToNotice) {
                if (targetJid === sender) continue;

                const targetAfk = await AfkModel.findOne({ userId: targetJid, groupId: from });
                if (targetAfk) {
                    let userFraseDoc = await UserFraseModel.findOne({ userId: targetJid });
                    let frase = userFraseDoc ? userFraseDoc.frase : "¡Hola! Soy Hatsune Miku 🩵, una bot en desarrollo";
                    
                    let avatarBuf;
                    try {
                        const url = await sock.profilePictureUrl(targetJid, 'image');
                        avatarBuf = Buffer.from(await (await fetch(url)).arrayBuffer());
                    } catch {
                        avatarBuf = await sharp({ create: { width: 150, height: 150, channels: 4, background: { r: 60, g: 60, b: 60, alpha: 1 } } }).png().toBuffer();
                    }

                    const nombreTarget = targetJid.split('@')[0];
                    const cardMention = await crearTarjetaCentrada(
                        avatarBuf,
                        `@${nombreTarget} está AFK`,
                        `Motivo: ${targetAfk.motivo}`,
                        frase,
                        groupConfig
                    );

                    await sock.sendMessage(from, {
                        image: cardMention,
                        caption: `⚠️ *@${nombreTarget}* está actualmente ausente.`,
                        mentions: [targetJid]
                    });
                }
            }
        }

        // COMANDO .fondos afk
        if (cmd === 'fondos' || body.toLowerCase().includes('fondos afk')) {
            try {
                const imgGaleria = await generarImagenGalería();
                return await sock.sendMessage(from, { image: imgGaleria, caption: '🖼️ *Galería de Fondos AFK disponibles*\n\nAplica uno escribiendo: `.set fondo afk <número>`' });
            } catch (e) {
                console.error(e);
                return await sock.sendMessage(from, { text: '❌ Ocurrió un error al generar la galería.' });
            }
        }

        // COMANDOS SET
        if (body.toLowerCase().startsWith('.set') || body.toLowerCase().startsWith('/set')) {
            const subCmd = body.toLowerCase();

            if (subCmd.includes('contorno afk')) {
                const hex = args[3];
                if (!hex || !/^#([A-Fa-f0-9]{6})$/i.test(hex)) {
                    return await sock.sendMessage(from, { text: '❌ Indica un código HEX válido (Ejemplo: `.set contorno afk #38BDF8`)' });
                }
                groupConfig.borderColor = hex.toUpperCase();
                await groupConfig.save();
                return await sock.sendMessage(from, { text: `✅ Color del contorno guardado: *${hex.toUpperCase()}*` });
            }

            if (subCmd.includes('imagen afk') || subCmd.includes('fondo afk')) {
                const param = args[3];

                if (param && !isNaN(param)) {
                    const presetId = parseInt(param);
                    if (presetId < 1 || presetId > 10) {
                        return await sock.sendMessage(from, { text: '❌ Selecciona un número del 1 al 10. Usa `.fondos afk` para ver la galería.' });
                    }
                    groupConfig.presetId = presetId;
                    groupConfig.bgBuffer = null;
                    groupConfig.bgColor = '#0F172A';
                    await groupConfig.save();
                    return await sock.sendMessage(from, { text: `✅ Fondo del grupo actualizado al preset *#${presetId}*` });
                }

                if (param && /^#([A-Fa-f0-9]{6})$/i.test(param)) {
                    groupConfig.bgColor = param.toUpperCase();
                    groupConfig.bgBuffer = null;
                    await groupConfig.save();
                    return await sock.sendMessage(from, { text: `✅ Color de fondo del grupo guardado: *${param.toUpperCase()}*` });
                }

                const isQuotedImage = m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
                const isDirectImage = m.message?.imageMessage;
                const targetMessage = isDirectImage ? m : (isQuotedImage ? { message: m.message.extendedTextMessage.contextInfo.quotedMessage } : null);

                if (targetMessage) {
                    try {
                        const { downloadMediaMessage } = require('@whiskeysockets/baileys');
                        groupConfig.bgBuffer = await downloadMediaMessage(targetMessage, 'buffer', {});
                        await groupConfig.save();
                        return await sock.sendMessage(from, { text: '✅ Imagen personalizada de fondo guardada para este grupo.' });
                    } catch (e) {
                        return await sock.sendMessage(from, { text: '❌ Error guardando la imagen.' });
                    }
                }
            }
        }

        // CONFIGURAR FRASE PERMANENTE
        if (texto && texto.toLowerCase().startsWith('frase ')) {
            const nuevaFrase = texto.slice(6).trim();
            await UserFraseModel.findOneAndUpdate({ userId: sender }, { frase: nuevaFrase }, { upsert: true, new: true });
            return await sock.sendMessage(from, { text: `✅ Tu frase permanente ha sido actualizada: "${nuevaFrase}"` });
        }

        // DESACTIVAR MANUALMENTE (UNAFK / NOAFK)
        if (cmd === 'unafk' || cmd === 'noafk') {
            const afkExistente = await AfkModel.findOne({ userId: sender, groupId: from });
            if (afkExistente) {
                let tiempoInactivo = formatoTiempo(Date.now() - afkExistente.tiempo);
                await AfkModel.deleteOne({ userId: sender, groupId: from });

                let avatarBuf;
                try {
                    const url = await sock.profilePictureUrl(sender, 'image');
                    avatarBuf = Buffer.from(await (await fetch(url)).arrayBuffer());
                } catch {
                    avatarBuf = await sharp({ create: { width: 150, height: 150, channels: 4, background: { r: 60, g: 60, b: 60, alpha: 1 } } }).png().toBuffer();
                }

                const nombreReal = m.pushName || sender.split('@')[0];
                const cardUnAFK = await crearTarjetaCentrada(
                    avatarBuf,
                    `¡Bienvenido ${nombreReal}!`,
                    `Estado AFK desactivado`,
                    `Tiempo ausente: ${tiempoInactivo}`,
                    groupConfig
                );

                return await sock.sendMessage(from, {
                    image: cardUnAFK,
                    caption: `👋 *@${sender.split('@')[0]}* ya no está ausente.`,
                    mentions: [sender]
                });
            } else {
                return await sock.sendMessage(from, { text: '❌ No estabas AFK en este grupo.' });
            }
        }

        // ACTIVAR / ACTUALIZAR AFK (.afk)
        if (cmd === 'afk' || cmd === 'ausente') {
            let afkExistente = await AfkModel.findOne({ userId: sender, groupId: from });
            let motivo = texto ? texto.trim() : 'Sin motivo especificado';

            let userFraseDoc = await UserFraseModel.findOne({ userId: sender });
            let frasePersonalizada = userFraseDoc ? userFraseDoc.frase : "¡Hola! Soy Hatsune Miku 🩵, una bot en desarrollo";

            if (afkExistente) {
                afkExistente.motivo = motivo;
                afkExistente.tiempo = Date.now();
                await afkExistente.save();
            } else {
                await AfkModel.create({ userId: sender, groupId: from, motivo: motivo, tiempo: Date.now() });
            }

            const nombreReal = m.pushName || sender.split('@')[0];
            let avatarBuffer;
            try {
                const avatarUrl = await sock.profilePictureUrl(sender, 'image');
                avatarBuffer = Buffer.from(await (await fetch(avatarUrl)).arrayBuffer());
            } catch {
                avatarBuffer = await sharp({ create: { width: 180, height: 180, channels: 4, background: { r: 100, g: 100, b: 100, alpha: 1 } } }).png().toBuffer();
            }

            const tarjetaBuffer = await crearTarjetaAfk(avatarBuffer, nombreReal, motivo, frasePersonalizada, groupConfig);

            await sock.sendMessage(from, {
                image: tarjetaBuffer,
                caption: `💤 *@${sender.split('@')[0]}* ha entrado en estado AFK.`,
                mentions: [sender]
            });
        }
    }
};
