const axios = require('axios')
const yts = require('yt-search')
const fs = require('fs')
const { join } = require('path')
const { execFile: execFileCb } = require('child_process')

// --- SCRAPER CNV.CX INTEGRADO ---
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

function pickQuality(quality) {
  const q = Number(quality)
  const allowed = new Set([144, 240, 360, 480, 720, 1080, 1440, 2160])
  return allowed.has(q) ? q : 360
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
  try {
    const res = await axios.get("https://cnv.cx/v2/sanity/key", {
      timeout,
      headers: { ...baseHeaders(ref), "Content-Type": "application/json" },
      validateStatus: () => true
    })
    if (res.status !== 200) throw new Error(`SANITY_KEY_HTTP_${res.status}`)
    const key = res?.data?.key
    if (!key) throw new Error("SANITY_KEY_MISSING")
    return { key, ref }
  } catch (e) {
    throw e
  }
}

function toForm(data) {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(data)) p.set(k, String(v))
  return p
}

function normalizeObj(data) {
  if (data && typeof data === "object") return data
  if (typeof data === "string") {
    try { return JSON.parse(data) } catch (e) { return null }
  }
  return null
}

async function y2mateDirectVideo(url, opts = {}) {
  const videoId = extractYouTubeId(url)
  if (!videoId) return { status: false, error: "INVALID_YOUTUBE_URL" }
  const quality = pickQuality(opts.quality)
  const timeout = Number(opts.timeout || 45000)
  try {
    const { key, ref } = await getSanityKey(Math.min(timeout, 20000))
    const payload = {
      link: `https://youtu.be/${videoId}`,
      format: "mp4",
      audioBitrate: 128,
      videoQuality: quality,
      filenameStyle: "pretty",
      vCodec: "h264"
    }
    const res = await axios.post("https://cnv.cx/v2/converter", toForm(payload), {
      timeout,
      headers: {
        ...baseHeaders(ref),
        Accept: "*/*",
        "Content-Type": "application/x-www-form-urlencoded",
        key
      },
      validateStatus: () => true
    })
    if (res.status !== 200) return { status: false, error: `CONVERTER_HTTP_${res.status}` }
    const obj = normalizeObj(res.data)
    const direct = obj?.url
    if (!direct) return { status: false, error: "NO_URL_IN_RESPONSE", raw: obj ?? res.data }
    return { status: true, videoId, url: direct }
  } catch (error) {
    return { status: false, error: error.message }
  }
}

// --- AUXILIARES ---
function execFile(command, args) {
  return new Promise((resolve, reject) => {
    execFileCb(command, args, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

async function pathExists(file) {
  try {
    await fs.promises.access(file)
    return true
  } catch {
    return false
  }
}

function formatViews(views) {
  if (!views) return 'No disponible'
  if (views >= 1000000000) return `${(views / 1000000000).toFixed(1)}B`
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`
  if (views >= 1000) return `${(views / 1000).toFixed(1)}k`
  return views.toString()
}

async function fetchBuffer(url) {
  const res = await axios.get(url, { responseType: 'arraybuffer' })
  return Buffer.from(res.data)
}

const youtubeRegexID = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/

// --- COMANDO EXCLUSIVO DE VIDEO ---
module.exports = {
  name: 'play2',
  alias: ['ytv', 'ytmp4', 'mp4', 'play2doc'],
  description: 'Descarga videos de YouTube por búsqueda o enlace.',
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid

    if (!texto || !texto.trim()) {
      return sock.sendMessage(from, { 
        text: '⚙️ Debes ingresar el nombre o enlace del video.' 
      }, { quoted: m })
    }

    const body = m.message?.conversation || m.message?.extendedTextMessage?.text || ''
    const command = body.trim().split(/\s+/)[0].replace(/^[./#!%]/, '').toLowerCase() || 'play2'

    await sock.sendMessage(from, { react: { text: '⏳', key: m.key } })

    try {
      let searchResult = null
      const match = texto.match(youtubeRegexID)

      if (match) {
        try {
          searchResult = await yts({ videoId: match[1] })
        } catch (e) {
          const s = await yts(texto)
          searchResult = s.all[0]
        }
      } else {
        const s = await yts(texto)
        searchResult = s.all.find(v => v.type === 'video') || s.all[0]
      }

      if (!searchResult) {
        await sock.sendMessage(from, { react: { text: '❌', key: m.key } })
        return sock.sendMessage(from, { text: '⚠︎ No se encontraron resultados.' }, { quoted: m })
      }

      const { title, thumbnail, timestamp, views, ago, url, author } = searchResult
      const vistas = formatViews(views)
      const canal = author?.name || 'Desconocido'

      const infoMessage = `📌 *YOUTUBE DOWNLOADER*

► *Título:* ${title}
► *Canal:* ${canal}
► *Duración:* ${timestamp}
► *Vistas:* ${vistas}
► *Publicado:* ${ago}

🚀 *Procesando envío...*`.trim()

      let thumbnailBuffer = null
      try {
        thumbnailBuffer = await fetchBuffer(thumbnail)
      } catch (e) {
        console.log('Error al obtener la miniatura:', e.message)
      }

      // Mensaje con miniatura e información
      await sock.sendMessage(from, {
        image: thumbnailBuffer || { url: thumbnail },
        caption: infoMessage
      }, { quoted: m })

      // Petición al conversor para obtener la URL del video
      const r = await y2mateDirectVideo(url, { quality: 360 })
      if (!r?.status || !r?.url) throw new Error(r?.error || 'Link no disponible')

      // Crear directorio temporal para procesar con FFmpeg
      const tmpDir = join(process.cwd(), 'tmp')
      if (!await pathExists(tmpDir)) await fs.promises.mkdir(tmpDir)

      const outputFilePath = join(tmpDir, `${Date.now()}.mp4`)

      // Transcodificación asegurando H.264 + AAC + faststart para compatibilidad total con WhatsApp
      await execFile('ffmpeg', [
        '-i', r.url,
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '28',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        '-y',
        outputFilePath
      ])

      if (!await pathExists(outputFilePath)) throw new Error('Error al generar el archivo con FFmpeg')

      const videoBuffer = await fs.promises.readFile(outputFilePath)

      if (command === 'play2doc') {
        await sock.sendMessage(from, {
          document: videoBuffer,
          fileName: `${title}.mp4`,
          mimetype: 'video/mp4'
        })
      } else {
        await sock.sendMessage(from, {
          video: videoBuffer,
          fileName: `${title}.mp4`,
          caption: `🎬 *${title}*`,
          mimetype: 'video/mp4'
        })
      }

      // Limpieza del archivo temporal generado
      await fs.promises.unlink(outputFilePath).catch(() => {})

      await sock.sendMessage(from, { react: { text: '✅', key: m.key } })

    } catch (error) {
      console.error('Error al descargar video:', error)
      await sock.sendMessage(from, { react: { text: '❌', key: m.key } })
      return sock.sendMessage(from, { text: '⚠︎ No se pudo procesar el video.' }, { quoted: m })
    }
  }
        }
