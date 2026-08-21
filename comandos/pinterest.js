const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { pipeline } = require('stream');
const streamPipe = promisify(pipeline);

// ==== CONFIG API ====
const API_BASE = (process.env.API_BASE || "https://api-sky.ultraplus.click").replace(/\/+$/, "");
const API_KEY  = "sk_7f41a58b-bd6f-4df1-be6c-ea4d64913247";

const MAX_MB = 500;
const TMP_DIR = path.join(__dirname, "../tmp");
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

function isPinterestUrl(u = "") {
  return /^https?:\/\//i.test(u) && /(pinterest\.[a-z.]+|pin\.it)/i.test(u);
}

function safeName(name = "pinterest") {
  return String(name)
    .slice(0, 80)
    .replace(/[^\w.\- ]+/g, "_")
    .replace(/\s+/g, " ")
    .trim() || "pinterest";
}

function toAbsUrl(u) {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("/")) return API_BASE + u;
  return API_BASE + "/" + u;
}

async function callPinterestApi(pinUrl) {
  const endpoint = `${API_BASE}/pinterest`;

  const r = await axios.post(
    endpoint,
    { url: pinUrl },
    {
      timeout: 60000,
      headers: {
        "Content-Type": "application/json",
        apikey: API_KEY,
        Accept: "application/json, */*",
      },
      validateStatus: () => true,
    }
  );

  const data = typeof r.data === "object" ? r.data : null;
  const ok = data && (data.status === true || data.status === "true" || data.ok === true || data.success === true);
  if (!ok) throw new Error(data?.message || data?.error || "Error en la API");

  return data.result || data.data || data;
}

async function downloadToFile(url, outPath) {
  const res = await axios.get(url, {
    responseType: "stream",
    timeout: 120000,
    maxRedirects: 5,
    headers: {
      apikey: API_KEY,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      Accept: "*/*",
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    validateStatus: () => true,
  });

  if (res.status >= 400) throw new Error(`Upstream HTTP ${res.status}`);

  const cl = Number(res.headers["content-length"] || 0);
  const mb = cl ? cl / (1024 * 1024) : 0;
  if (mb && mb > MAX_MB) {
    try { res.data.destroy(); } catch {}
    throw new Error(`El archivo pesa ${mb.toFixed(2)}MB (>${MAX_MB}MB)`);
  }

  await streamPipe(res.data, fs.createWriteStream(outPath));
  return outPath;
}

module.exports = {
  name: 'pinterestvideo',
  alias: ['pinvideo', 'pinterest'],
  description: 'Descarga videos de Pinterest mediante un enlace.',
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid;
    const url = String(texto || "").trim();

    if (!url) {
      return sock.sendMessage(
        from,
        { text: `📌 Usa:\n/pinterestvideo <link>\nEj: /pinterestvideo https://pin.it/xxxxx` },
        { quoted: m }
      );
    }

    if (!isPinterestUrl(url)) {
      return sock.sendMessage(from, { text: "❌ Eso no parece un link de Pinterest." }, { quoted: m });
    }

    await sock.sendMessage(from, { react: { text: "⏳", key: m.key } });

    try {
      const result = await callPinterestApi(url);
      const title = result.title || "Pinterest";
      const base = safeName(title);

      const mp4 =
        toAbsUrl(result?.downloads?.video) ||
        toAbsUrl(result?.downloads?.video_inline) ||
        toAbsUrl(result?.media?.mp4) ||
        "";

      if (!mp4) {
        await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
        return sock.sendMessage(from, { text: "❌ No encontré MP4 para este pin." }, { quoted: m });
      }

      await sock.sendMessage(from, { react: { text: "📌", key: m.key } });

      const outFile = path.join(TMP_DIR, `${Date.now()}_${base}.mp4`);
      await downloadToFile(mp4, outFile);

      const sizeMB = fs.statSync(outFile).size / (1024 * 1024);
      if (sizeMB > MAX_MB) {
        try { fs.unlinkSync(outFile); } catch {}
        await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
        return sock.sendMessage(from, { text: `❌ El video pesa ${sizeMB.toFixed(2)}MB (>${MAX_MB}MB).` }, { quoted: m });
      }

      const caption =
        `📌 Pinterest Video\n` +
        `• Título: ${title}\n` +
        (result?.creator?.username ? `• Autor: @${result.creator.username}\n` : "") +
        `• Tamaño: ${sizeMB.toFixed(2)}MB`;

      await sock.sendMessage(
        from,
        {
          video: fs.readFileSync(outFile),
          mimetype: "video/mp4",
          fileName: `${base}.mp4`,
          caption,
        },
        { quoted: m }
      );

      try { fs.unlinkSync(outFile); } catch {}
      await sock.sendMessage(from, { react: { text: "✅", key: m.key } });

    } catch (e) {
      await sock.sendMessage(from, { react: { text: "❌", key: m.key } });
      await sock.sendMessage(from, { text: `❌ Error: ${e?.message || "unknown"}` }, { quoted: m });
    }
  }
};
