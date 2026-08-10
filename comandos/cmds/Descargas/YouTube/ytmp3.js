const yts = require('yt-search')
const axios = require('axios')
const { CookieJar } = require('tough-cookie')
const { wrapper } = require('axios-cookiejar-support')

async function getVideoInfo(query, videoMatch) {
  const search = await yts(query)
  if (!search.all.length) return null
  const videoInfo = videoMatch ? search.videos.find(v => v.videoId === videoMatch[1]) || search.all[0] : search.all[0]
  return videoInfo || null
}

module.exports = {
  name: 'play',
  alias: ['mp3', 'ytmp3', 'ytaudio', 'playaudio'],
  description: 'Descarga audio/música de YouTube',
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid
    const options = { quoted: m }

    try {
      if (!texto) {
        return sock.sendMessage(from, { text: '《✧》Por favor, menciona el nombre o URL del video que deseas descargar' }, options)
      }

      const videoMatch = texto.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/)
      const query = videoMatch ? 'https://youtu.be/' + videoMatch[1] : texto
      let url = query, title = null

      try {
        const videoInfo = await getVideoInfo(query, videoMatch)
        if (videoInfo) {
          url = videoInfo.url
          title = videoInfo.title
          const vistas = (videoInfo.views || 0).toLocaleString()
          const canal = videoInfo.author?.name || 'Desconocido'
          const infoMessage = `➩ Descargando › ${title}\n\n> ❖ Canal › *${canal}*\n> ⴵ Duración › *${videoInfo.timestamp || 'Desconocido'}*\n> ❀ Vistas › *${vistas}*\n> ✩ Publicado › *${videoInfo.ago || 'Desconocido'}*\n> ❒ Enlace › *${url}*`
          
          await sock.sendMessage(from, { 
            image: { url: videoInfo.image }, 
            caption: infoMessage 
          }, options)
        }
      } catch (err) {}

      await sock.sendMessage(from, { text: '┌⁠(⁠・⁠。⁠・⁠)⁠┘⁠♪ Preparando tu música oniii-sama...' }, options)

      let downloadUrl = null
      try {
        downloadUrl = await getDeliriusAudio(url)
      } catch (e) {}

      if (!downloadUrl) {
        try {
          downloadUrl = await getYtdownAudio(url)
        } catch (e) {}
      }

      if (!downloadUrl) {
        return sock.sendMessage(from, { text: '《✧》 No se pudo descargar el *audio*, intenta más tarde.' }, options)
      }

      const response = await axios({
        method: 'get',
        url: downloadUrl,
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        }
      })

      const audioBuffer = Buffer.from(response.data)

      if (audioBuffer.length < 50000) {
        return sock.sendMessage(from, { text: '《✧》 El servidor entregó un archivo vacío. Intenta con otra canción.' }, options)
      }

      await sock.sendMessage(from, { 
        audio: audioBuffer, 
        fileName: `${title || 'audio'}.mp3`, 
        mimetype: 'audio/mpeg' 
      }, options)

    } catch (e) {
      await sock.sendMessage(from, { text: `> Error inesperado al ejecutar el comando.\n> [Error: *${e.message}*]` }, options)
    }
  }
}

async function getDeliriusAudio(ytUrl) {
  const endpoint = `https://api.delirius.store/download/ytmp3?url=${encodeURIComponent(ytUrl)}`
  const { data } = await axios.get(endpoint, { timeout: 15000 })
  if (data && data.status === true && data.data && data.data.download) {
    return data.data.download
  }
  throw new Error('Error')
}

async function getYtdownAudio(ytUrl) {
  const BASE = 'https://app.ytdown.to'
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  const sleep = ms => new Promise(r => setTimeout(r, ms))
  const HEADERS = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'x-requested-with': 'XMLHttpRequest',
    'Origin': BASE, 
    'Referer': BASE + '/en23/',
  }
  const postProxy = async (clientProxy, urlQuery) => {
    const body = new URLSearchParams({ url: urlQuery }).toString()
    const { data } = await clientProxy.post(BASE + '/proxy.php', body, { headers: HEADERS })
    return (typeof data === 'object' ? data : JSON.parse(data))?.api
  }
  const poll = async (clientProxy, workerUrl) => {
    for (let i = 1; i <= 20; i++) {
      const api = await postProxy(clientProxy, workerUrl)
      if (api?.status === 'completed' && api.fileUrl) return api.fileUrl
      if (api?.status === 'error') throw new Error('Error')
      if (i < 20) await sleep(2500)
    }
    throw new Error('Error')
  }
  const jar = new CookieJar()
  const client = wrapper(axios.create({ jar, withCredentials: true, timeout: 30000, headers: { 'User-Agent': UA } }))
  await client.get(BASE + '/')
  const api = await postProxy(client, ytUrl)
  if (!api || api.status === 'error') throw new Error('Error')
  const opciones = api.mediaItems.filter(m => m.mediaExtension?.toLowerCase() === 'mp3')
  if (!opciones.length) throw new Error('Error')
  const elegido = opciones[0]
  const downloadUrl = await poll(client, elegido.mediaUrl)
  return downloadUrl
                                     }
