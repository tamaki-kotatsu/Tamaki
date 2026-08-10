const axios = require('axios');
const cheerio = require('cheerio');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function cleanText(x) {
    return String(x || '').replace(/\s+/g, ' ').trim();
}

function normalizeUrl(u) {
    const s = cleanText(u);
    if (!s) return null;
    if (/^https?:\/\//i.test(s)) return s;
    if (s.startsWith('//')) return 'https:' + s;
    if (s.startsWith('/')) return 'https://www.mediafire.com' + s;
    return s;
}

function pickFilename($) {
    let filename = cleanText($('.intro .filename').text());
    if (!filename) filename = cleanText($('meta[property="og:title"]').attr('content'));
    if (!filename) filename = cleanText($('title').text());
    return filename || null;
}

function pickDetails($) {
    let size = null;
    let uploaded = null;

    $('ul.details li').each((_, el) => {
        const text = cleanText($(el).text());
        if (!size && /File size:/i.test(text)) size = cleanText($(el).find('span').text()) || null;
        if (!uploaded && /Uploaded:/i.test(text)) uploaded = cleanText($(el).find('span').text()) || null;
    });

    return { size, uploaded };
}

async function mediafireDl(url, timeout = 45000) {
    const mediafireUrl = cleanText(url);
    if (!mediafireUrl) throw new Error('URL requerida');

    const res = await axios.get(mediafireUrl, {
        timeout,
        maxRedirects: 5,
        headers: {
            'User-Agent': UA,
            'Accept-Language': 'en-US,en;q=0.9',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        validateStatus: () => true
    });

    if (res.status < 200 || res.status >= 400) {
        throw new Error(`MediaFire HTTP ${res.status}`);
    }

    const $ = cheerio.load(String(res.data || ''));

    const downloadLinkRaw = $('#downloadButton').attr('href') || $('a#downloadButton').attr('href') || null;
    const downloadLink = normalizeUrl(downloadLinkRaw);

    if (!downloadLink) {
        throw new Error('No se encontró el botón de descarga.');
    }

    const filename = pickFilename($);
    const { size, uploaded } = pickDetails($);

    return { downloadLink, filename, size, uploaded };
}

module.exports = {
    name: 'mediafire',
    alias: ['mf', 'mfdl'],
    description: 'Descarga archivos directamente de Mediafire.',
    run: async (sock, m, texto) => {
        const from = m.key.remoteJid;

        if (!texto) {
            return sock.sendMessage(from, { text: 'Uso: /mediafire <enlace_de_mediafire>' }, { quoted: m });
        }

        if (!/^https?:\/\/(www\.)?mediafire\.com\/.+/i.test(texto)) {
            return sock.sendMessage(from, { text: 'Proporciona un enlace válido de Mediafire.' }, { quoted: m });
        }

        let msgEspera;
        try {
            msgEspera = await sock.sendMessage(from, { text: '⏳ Obteniendo archivo de Mediafire...' }, { quoted: m });

            const scraped = await mediafireDl(texto);
            const title = (scraped.filename || 'archivo').trim();

            let info = `☑️ *Mediafire Downloader*\n\n` +
                       `*Nombre:* ${title}\n`;
            if (scraped.size) info += `*Peso:* ${scraped.size}\n`;
            if (scraped.uploaded) info += `*Subido:* ${scraped.uploaded}\n`;

            await sock.sendMessage(from, {
                text: info,
                edit: msgEspera.key
            });

            await sock.sendMessage(from, {
                document: { url: scraped.downloadLink },
                mimetype: 'application/octet-stream',
                fileName: title
            });

        } catch (e) {
            console.error(e);
            if (msgEspera) {
                await sock.sendMessage(from, {
                    text: `Error: ${e.message}`,
                    edit: msgEspera.key
                });
            } else {
                await sock.sendMessage(from, { text: `Error: ${e.message}` }, { quoted: m });
            }
        }
    }
};
