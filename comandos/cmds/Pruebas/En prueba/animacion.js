const sharp = require('sharp');
const GIFEncoder = require('gifencoder');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const fs = require('fs');
const path = require('path');
const os = require('os');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

module.exports = {
    name: 'animar',
    alias: ['giftest', 'cardgif'],
    description: 'Genera una tarjeta animada con degradado rotatorio continuo.',

    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;
        if (!from) return;

        const sender = m.key.participant || (m.key.fromMe ? sock.user.id.split(':')[0] + '@s.whatsapp.net' : m.key.remoteJid);
        const nombre = m.pushName || sender.split('@')[0];

        // 1. Obtener Avatar
        let avatarBuffer;
        try {
            const url = await sock.profilePictureUrl(sender, 'image');
            avatarBuffer = Buffer.from(await (await fetch(url)).arrayBuffer());
        } catch {
            avatarBuffer = await sharp({ create: { width: 100, height: 100, channels: 4, background: { r: 50, g: 50, b: 50, alpha: 1 } } }).png().toBuffer();
        }

        const avatarResized = await sharp(avatarBuffer).resize(100, 100, { fit: 'cover' }).png().toBuffer();

        // 2. Configurar GIFEncoder
        const width = 500;
        const height = 200;
        const encoder = new GIFEncoder(width, height);

        const streamPromise = new Promise((resolve, reject) => {
            const chunks = [];
            const stream = encoder.createReadStream();
            stream.on('data', (chunk) => chunks.push(chunk));
            stream.on('end', () => resolve(Buffer.concat(chunks)));
            stream.on('error', (err) => reject(err));
        });

        encoder.start();
        encoder.setRepeat(0);   
        encoder.setDelay(60); 
        encoder.setQuality(10); 

        // 3. Colores fijos para el degradado
        const color1 = '#FF007F'; // Rosa
        const color2 = '#7B2CBF'; // Morado

        const totalFrames = 16; 

        for (let i = 0; i < totalFrames; i++) {
            const angle = (i / totalFrames) * 2 * Math.PI;

            const x1 = Math.round(50 + 50 * Math.cos(angle));
            const y1 = Math.round(50 + 50 * Math.sin(angle));
            const x2 = Math.round(50 + 50 * Math.cos(angle + Math.PI));
            const y2 = Math.round(50 + 50 * Math.sin(angle + Math.PI));

            const svgFrame = `
            <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="neonRotativo" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
                        <stop offset="0%" stop-color="${color1}" />
                        <stop offset="100%" stop-color="${color2}" />
                    </linearGradient>
                </defs>

                <!-- Fondo -->
                <rect width="${width}" height="${height}" rx="15" fill="#0F172A" />
                
                <!-- Borde rotatorio -->
                <rect x="10" y="10" width="${width - 20}" height="${height - 20}" rx="12" 
                      fill="none" stroke="url(#neonRotativo)" stroke-width="5" />

                <!-- Textos -->
                <text x="140" y="85" fill="${color1}" font-size="22" font-family="sans-serif" font-weight="bold">¡HOLA MUNDO ANIMADO!</text>
                <text x="140" y="125" fill="#FFFFFF" font-size="18" font-family="sans-serif">Usuario: ${nombre}</text>
            </svg>`;

            const frameBuffer = await sharp(Buffer.from(svgFrame))
                .composite([{ input: avatarResized, top: 50, left: 25 }])
                .ensureAlpha()
                .raw()
                .toBuffer();

            encoder.addFrame(frameBuffer);
        }

        encoder.finish();
        const gifFinalBuffer = await streamPromise;

        // 4. Conversión temporal a MP4
        const tempGifPath = path.join(os.tmpdir(), `temp_${Date.now()}.gif`);
        const tempMp4Path = path.join(os.tmpdir(), `temp_${Date.now()}.mp4`);

        try {
            await fs.promises.writeFile(tempGifPath, gifFinalBuffer);

            await new Promise((resolve, reject) => {
                ffmpeg(tempGifPath)
                    .outputOptions([
                        '-pix_fmt yuv420p',
                        '-c:v libx264',
                        '-movflags +faststart',
                        '-vf scale=trunc(iw/2)*2:trunc(ih/2)*2'
                    ])
                    .toFormat('mp4')
                    .save(tempMp4Path)
                    .on('end', resolve)
                    .on('error', reject);
            });

            const mp4Buffer = await fs.promises.readFile(tempMp4Path);

            // 5. Enviar a WhatsApp
            await sock.sendMessage(from, {
                video: mp4Buffer,
                gifPlayback: true,
                caption: `✨ ¡Tarjeta con borde neón giratorio!`
            }, { quoted: m });

        } finally {
            if (fs.existsSync(tempGifPath)) await fs.promises.unlink(tempGifPath).catch(() => {});
            if (fs.existsSync(tempMp4Path)) await fs.promises.unlink(tempMp4Path).catch(() => {});
        }
    }
};
