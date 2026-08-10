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

module.exports = {
  name: 'playmulti',
  alias: ['ytmulti', 'vmulti', 'play3'],
  description: 'Busca y descarga los primeros 3 vídeos coincidentes de YouTube.',
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid

    if (!texto || !texto.trim()) {
      return sock.sendMessage(from, { text: '⚙️ Ingresa el tema para buscar y descargar varios videos.' }, { quoted: m })
    }

    await sock.sendMessage(from, { react: { text: '⏳', key: m.key } })

    try {
      const search = await yts(texto)
      // Tomamos hasta 3 videos
      const videos = search.videos.slice(0, 3)

      if (!videos || videos.length === 0) {
        await sock.sendMessage(from, { react: { text: '❌', key: m.key } })
        return sock.sendMessage(from, { text: '⚠︎ No se encontraron resultados.' }, { quoted: m })
      }

      let summaryText = `📦 *BÚSQUEDA MÚLTIPLE DE VIDEOS*\n\n`
      videos.forEach((v, idx) => {
        summaryText += `*${idx + 1}.* ${v.title}\n⏱️ Duración: ${v.timestamp}\n\n`
      })
      summaryText += `🚀 *Descargando ${videos.length} videos en secuencia...*`

      await sock.sendMessage(from, { text: summaryText }, { quoted: m })

      const tmpDir = join(process.cwd(), 'tmp')
      if (!fs.existsSync(tmpDir)) await fs.promises.mkdir(tmpDir)

      // Procesamos video por video
      for (let i = 0; i < videos.length; i++) {
        const item = videos[i]
        try {
          const r = await y2mateDirectVideo(item.url)
          if (!r?.status || !r?.url) continue

          const outputFile = join(tmpDir, `multi_${i}_${Date.now()}.mp4`)

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
            fileName: `${item.title}.mp4`,
            caption: `🎬 [${i + 1}/${videos.length}] *${item.title}*`,
            mimetype: 'video/mp4'
          })

          await fs.promises.unlink(outputFile).catch(() => {})
        } catch (err) {
          console.error(`Error al procesar el video ${i + 1}:`, err)
        }
      }

      await sock.sendMessage(from, { react: { text: '✅', key: m.key } })

    } catch (e) {
      console.error(e)
      await sock.sendMessage(from, { react: { text: '❌', key: m.key } })
      return sock.sendMessage(from, { text: '⚠︎ Ocurrió un error al procesar la búsqueda múltiple.' }, { quoted: m })
    }
  }
    }
