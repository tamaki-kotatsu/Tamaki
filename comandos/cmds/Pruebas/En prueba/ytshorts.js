const axios = require('axios')
const yts = require('yt-search')
const fs = require('fs')
const { join } = require('path')
const { execFile: execFileCb } = require('child_process')

// --- SCRAPER CNV.CX ---
const UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36"

function extractYouTubeId(input) {
  const s = String(input || "").trim()
  if (!s) return null
  const m1 = s.match(/(?:v=|\/shorts\/|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  if (m1?.[1]) return m1[1]
  const m2 = s.match(/^[A-Za-z0-9_-]{11}$/)
  if (m2?.[0]) return m2[0]
  return null
}

function baseHeaders(ref) {
  return {
    "User-Agent": UA,
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "es-US,es-419;q=0.9,es;q=0.8",
    Origin: ref,
    Referer: `${ref}/`,
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "cross-site",
    "sec-ch-ua": '"Chromium";v="123", "Not(A:Brand";v="24", "Google Chrome";v="123"',
    "sec-ch-ua-mobile": "?1",
    "sec-ch-ua-platform": '"Android"'
  }
}

async function getSanityKey(timeout = 20000) {
  const ref = "https://frame.y2meta-uk.com"
  const res = await axios.get("https://cnv.cx/v2/sanity/key", {
    timeout,
    headers: { ...baseHeaders(ref), "Content-Type": "application/json" },
    validateStatus: () => true
  })
  if (res.status !== 200) throw new Error(`SANITY_KEY_HTTP_${res.status}`)
  const key = res?.data?.key
  if (!key) throw new Error("SANITY_KEY_MISSING")
  return { key, ref }
}

function toForm(data) {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(data)) p.set(k, String(v))
  return p
}

async function y2mateDirectVideo(url) {
  const videoId = extractYouTubeId(url)
  if (!videoId) return { status: false, error: "INVALID_YOUTUBE_URL" }
  const { key, ref } = await getSanityKey()
  const payload = {
    link: `https://youtu.be/${videoId}`,
    format: "mp4",
    audioBitrate: 128,
    videoQuality: 360,
    filenameStyle: "pretty",
    vCodec: "h264"
  }
  const res = await axios.post("https://cnv.cx/v2/converter", toForm(payload), {
    timeout: 45000,
    headers: {
      ...baseHeaders(ref),
      Accept: "*/*",
      "Content-Type": "application/x-www-form-urlencoded",
      key
    },
    validateStatus: () => true
  })
  if (res.status !== 200) return { status: false, error: `CONVERTER_HTTP_${res.status}` }
  const obj = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
  return { status: true, url: obj?.url }
}

function execFile(command, args) {
  return new Promise((resolve, reject) => {
    execFileCb(command, args, (err) => err ? reject(err) : resolve())
  })
}

async function fetchBuffer(url) {
  const res = await axios.get(url, { responseType: 'arraybuffer' })
  return Buffer.from(res.data)
}

module.exports = {
  name: 'short',
  alias: ['ytshort', 'ytshorts', 'shorts'],
  description: 'Búsqueda y descarga de YouTube Shorts.',
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid

    if (!texto || !texto.trim()) {
      return sock.sendMessage(from, { text: '⚙️ Ingresa el nombre o término para buscar un Short.' }, { quoted: m })
    }

    await sock.sendMessage(from, { react: { text: '⏳', key: m.key } })

    try {
      // Si el usuario pasa un link directo de Short o búsqueda
      let searchUrl = texto.trim()
      let shortData = null

      if (!searchUrl.includes('youtube.com') && !searchUrl.includes('youtu.be')) {
        const search = await yts(`${texto} short`)
        // Filtrar videos de corta duración (menos de 60 segundos)
        shortData = search.videos.find(v => v.seconds <= 60) || search.videos[0]
        if (!shortData) throw new Error('No se encontró ningún short.')
        searchUrl = shortData.url
      } else {
        const match = searchUrl.match(/(?:v=|\/shorts\/|youtu\.be\/)([A-Za-z0-9_-]{11})/)
        if (match) shortData = await yts({ videoId: match[1] })
      }

      const title = shortData?.title || 'YouTube Short'
      const thumbnail = shortData?.thumbnail || ''

      const infoMessage = `⚡ *YOUTUBE SHORTS*

► *Título:* ${title}
► *Canal:* ${shortData?.author?.name || 'Desconocido'}
► *Duración:* ${shortData?.timestamp || '0:60'}

🚀 *Procesando video...*`.trim()

      if (thumbnail) {
        const thumbBuf = await fetchBuffer(thumbnail).catch(() => null)
        await sock.sendMessage(from, { image: thumbBuf || { url: thumbnail }, caption: infoMessage }, { quoted: m })
      }

      const r = await y2mateDirectVideo(searchUrl)
      if (!r?.status || !r?.url) throw new Error('Error al extraer el enlace del Short.')

      const tmpDir = join(process.cwd(), 'tmp')
      if (!fs.existsSync(tmpDir)) await fs.promises.mkdir(tmpDir)

      const outputFile = join(tmpDir, `short_${Date.now()}.mp4`)

      await execFile('ffmpeg', [
        '-i', r.url,
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '28',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        '-y',
        outputFile
      ])

      const videoBuffer = await fs.promises.readFile(outputFile)

      await sock.sendMessage(from, {
        video: videoBuffer,
        fileName: `${title}.mp4`,
        caption: `🎬 *${title}*`,
        mimetype: 'video/mp4'
      })

      await fs.promises.unlink(outputFile).catch(() => {})
      await sock.sendMessage(from, { react: { text: '✅', key: m.key } })

    } catch (e) {
      console.error(e)
      await sock.sendMessage(from, { react: { text: '❌', key: m.key } })
      return sock.sendMessage(from, { text: '⚠︎ No se pudo procesar el YouTube Short.' }, { quoted: m })
    }
  }
}
