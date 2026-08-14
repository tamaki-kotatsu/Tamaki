"use strict";

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { cabeceraDescarga, pieDescarga, getMarca, canal } = require("../../disenos.js");

const API_BASE = (process.env.API_BASE || "https://api-sky.ultraplus.click").replace(/\/+$/, "");
const API_KEY  = process.env.API_KEY  || "Russellxz";
const MAX_TIMEOUT = 60000;

const ACTIVOSS_FILE = path.resolve("./activoss.json");

const fmtSec = (s) => {
  const n = Number(s || 0);
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  const sec = n % 60;
  return (h ? `${h}:` : "") + `${m.toString().padStart(2,"0")}:${sec.toString().padStart(2,"0")}`;
};

const esIphone = (m) => /^3A.{18}$/.test(String(m?.key?.id || ""));

function botonesActivos() {
  const defaultCfg = { botones: true, updatedAt: null, updatedBy: null };
  if (!fs.existsSync(ACTIVOSS_FILE)) {
    try { fs.writeFileSync(ACTIVOSS_FILE, JSON.stringify(defaultCfg, null, 2)); } catch {}
    return true;
  }
  try {
    const cfg = JSON.parse(fs.readFileSync(ACTIVOSS_FILE, "utf-8"));
    return cfg.botones !== false;
  } catch {
    return true;
  }
}

const pendingTT = Object.create(null);

async function getTikTokFromSky(url) {
  const { data: res, status: http } = await axios.post(
    `${API_BASE}/tiktok`,
    { url },
    {
      headers: {
        apikey: API_KEY,
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: MAX_TIMEOUT,
      validateStatus: s => s >= 200 && s < 600
    }
  );

  if (http !== 200) {
    throw new Error(`HTTP ${http}${res?.message ? ` - ${res.message}` : ""}`);
  }

  if (!res || res.status !== true || !res.result?.media?.video) {
    throw new Error(res?.message || "La API no devolvió un video válido.");
  }

  const r = res.result;
  return {
    title: r.title || "TikTok",
    author: r.author || {},
    duration: r.duration || 0,
    likes: r.stats?.likes ?? 0,
    comments: r.stats?.comments ?? 0,
    video: r.media.video,
    audio: r.media.audio || null,
    cover: r.media.cover || null,
  };
}

async function processSend(sock, job, asDocument, triggerMsg) {
  job.isBusy = true;
  const { chatId, url, title, author, durTxt, likes, comments, quotedBase } = job;

  try {
    await sock.sendMessage(chatId, { react: { text: asDocument ? "📁" : "🎬", key: triggerMsg.key } });
    await sock.sendMessage(chatId, {
      contextInfo: canal(),
      text: `⏳ Espere, descargando video${asDocument ? " en documento" : ""}...`
    }, { quoted: quotedBase });

    const finalCaption =
`╭━━━━━━━━━━━━━━━╮
   ⚡ 𝗧𝗜𝗞𝗧𝗢𝗞 — 𝗩𝗜𝗗𝗘𝗢
╰━━━━━━━━━━━━━━━━╯

📝 *Título:* ${title}
👤 *Autor:* ${author}
⏱️ *Duración:* ${durTxt}
📊 *Estadísticas:* 👍 ${likes} · 💬 ${comments}
📦 *Formato:* ${asDocument ? "Documento" : "Video"}

━━━━━━━━━━━━━━━━━━
🤖 *Bot:* ${getMarca(sock)}
🔗 *API:* ${API_BASE}
━━━━━━━━━━━━━━━━━━`;

    if (asDocument) {
      await sock.sendMessage(chatId, {
        document: { url },
        mimetype: "video/mp4",
        fileName: `tiktok-${Date.now()}.mp4`,
        caption: finalCaption
      }, { quoted: quotedBase });
    } else {
      await sock.sendMessage(chatId, {
        contextInfo: canal(),
        video: { url },
        mimetype: "video/mp4",
        caption: finalCaption
      }, { quoted: quotedBase });
    }

    await sock.sendMessage(chatId, { react: { text: "✅", key: triggerMsg.key } });

  } catch (e) {
    console.error("TT send error:", e);
    await sock.sendMessage(chatId, { react: { text: "❌", key: triggerMsg.key } });
  } finally {
    job.isBusy = false;
  }
}

module.exports = {
  name: 'tiktok',
  alias: ['tt'],
  description: 'Descarga vídeos e información de TikTok con opciones de formato.',

  run: async (sock, m, args = []) => {
    const chatId = m.key.remoteJid;
    const text = Array.isArray(args) ? args.join(" ").trim() : String(args || "").trim();
    const pref = (global.prefixes && global.prefixes[0]) || ".";

    if (!text) {
      return sock.sendMessage(chatId, {
        contextInfo: canal(),
        text:
`✳️ 𝙐𝙨𝙖:
${pref}tiktok <enlace>
Ej: ${pref}tiktok https://vm.tiktok.com/xxxxxx/`
      }, { quoted: m });
    }

    const url = text.split(" ")[0];
    if (!/^https?:\/\//i.test(url) || !/tiktok\.com|vt\.tiktok\.com|vm\.tiktok\.com/i.test(url)) {
      return sock.sendMessage(chatId, {
        contextInfo: canal(),
        text: "❌ 𝙀𝙣𝙡𝙖𝙘𝙚 𝙙𝙚 𝙏𝙞𝙠𝙏𝙤𝙠 𝙞𝙣𝙫𝙖́𝙡𝙞𝙙𝙤."
      }, { quoted: m });
    }

    try {
      await sock.sendMessage(chatId, { react: { text: "⏱️", key: m.key } });

      const d = await getTikTokFromSky(url);

      const title   = d.title || "TikTok";
      const author  = (d.author && (d.author.name || d.author.username)) || "—";
      const durTxt  = d.duration ? fmtSec(d.duration) : "—";
      const likes   = d.likes ?? 0;
      const comments= d.comments ?? 0;

      const usarBotones = botonesActivos() && !esIphone(m);

      const caption = usarBotones
        ? `
╭━━━━━━━━━━━━━━━━━╮
   ⚡ 𝗧𝗜𝗞𝗧𝗢𝗞 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗𝗘𝗥
╰━━━━━━━━━━━━━━━━━╯
━━━━━━━━━━━━━━━━━━
 *📥 CÓMO DESCARGAR*
━━━━━━━━━━━━━━━━━━
🟢 *OPCIÓN — Botones*
Toca un botón abajo del mensaje:
   🎬 *Video Normal*
   📁 *Video Documento*
${pieDescarga(sock)}`.trim()
        : `
${cabeceraDescarga(sock, "📥 CÓMO DESCARGAR")}

🟡 *OPCIÓN 1 — Reaccionar*
Reacciona con un emoji:
   👍  →  Video normal
   ❤️  →  Video como documento

🔵 *OPCIÓN 2 — Responder número*
Cita este mensaje y escribe:
   *1*  →  Video normal
   *2*  →  Video como documento

${pieDescarga(sock)}`.trim();

      const nativeFlowButtons = [
        { text: "🎬 Video Normal",    id: `${pref}tt_video` },
        { text: "📁 Video Documento", id: `${pref}tt_videodoc` },
      ];

      let preview;
      if (usarBotones && d.cover) {
        try {
          preview = await sock.sendMessage(chatId, {
            contextInfo: canal(),
            image: { url: d.cover },
            caption,
            footer: `❦ ${getMarca(sock)} — Selecciona una opción ❦`,
            buttons: nativeFlowButtons,
            headerType: 4,
          }, { quoted: m });
        } catch (e) {
          console.log("[tt] botones fallaron, fallback:", e.message);
          preview = await sock.sendMessage(chatId, {
            contextInfo: canal(), image: { url: d.cover }, caption }, { quoted: m });
        }
      } else if (usarBotones) {
        try {
          preview = await sock.sendMessage(chatId, {
            contextInfo: canal(),
            text: caption,
            footer: `❦ ${getMarca(sock)} — Selecciona una opción ❦`,
            buttons: nativeFlowButtons,
          }, { quoted: m });
        } catch (e) {
          console.log("[tt] botones fallaron, fallback:", e.message);
          preview = await sock.sendMessage(chatId, {
            contextInfo: canal(), text: caption }, { quoted: m });
        }
      } else {
        if (d.cover) {
          preview = await sock.sendMessage(chatId, {
            contextInfo: canal(), image: { url: d.cover }, caption }, { quoted: m });
        } else {
          preview = await sock.sendMessage(chatId, {
            contextInfo: canal(), text: caption }, { quoted: m });
        }
      }

      pendingTT[preview.key.id] = {
        chatId,
        url: d.video,
        title,
        author,
        durTxt,
        likes,
        comments,
        quotedBase: m,
        isBusy: false,
        _createdAt: Date.now(),
      };

      setTimeout(() => {
        if (pendingTT[preview.key.id]) delete pendingTT[preview.key.id];
      }, 10 * 60 * 1000);

      await sock.sendMessage(chatId, { react: { text: "✅", key: m.key } });

      if (!sock._ttListener) {
        sock._ttListener = true;

        sock.ev.on("messages.upsert", async ev => {
          for (const msgItem of ev.messages) {
            try {
              // A) REACCIONES
              if (msgItem.message?.reactionMessage) {
                const { key: reactKey, text: emoji } = msgItem.message.reactionMessage;
                const job = pendingTT[reactKey.id];

                if (!job) continue;
                if (job.chatId !== msgItem.key.remoteJid) continue;
                if (emoji !== "👍" && emoji !== "❤️") continue;
                if (job.isBusy) continue;

                const asDoc = emoji === "❤️";
                await processSend(sock, job, asDoc, msgItem);
                continue;
              }

              // B) BOTONES
              const interactiveReply =
                msgItem.message?.interactiveResponseMessage?.nativeFlowResponseMessage ||
                msgItem.message?.buttonsResponseMessage ||
                msgItem.message?.templateButtonReplyMessage ||
                msgItem.message?.listResponseMessage ||
                null;

              if (interactiveReply) {
                let selectedId = "";
                if (msgItem.message?.buttonsResponseMessage?.selectedButtonId) {
                  selectedId = msgItem.message.buttonsResponseMessage.selectedButtonId;
                } else if (msgItem.message?.templateButtonReplyMessage?.selectedId) {
                  selectedId = msgItem.message.templateButtonReplyMessage.selectedId;
                } else if (msgItem.message?.listResponseMessage?.singleSelectReply?.selectedRowId) {
                  selectedId = msgItem.message.listResponseMessage.singleSelectReply.selectedRowId;
                } else if (interactiveReply?.paramsJson) {
                  try {
                    const params = JSON.parse(interactiveReply.paramsJson);
                    selectedId = params.id || "";
                  } catch {}
                } else if (interactiveReply?.body?.text) {
                  selectedId = interactiveReply.body.text;
                }

                if (!selectedId) continue;
                const id = String(selectedId).trim();

                const ctxQuoted =
                  msgItem.message?.buttonsResponseMessage?.contextInfo?.stanzaId ||
                  msgItem.message?.listResponseMessage?.contextInfo?.stanzaId ||
                  msgItem.message?.templateButtonReplyMessage?.contextInfo?.stanzaId ||
                  msgItem.message?.interactiveResponseMessage?.contextInfo?.stanzaId ||
                  msgItem.message?.extendedTextMessage?.contextInfo?.stanzaId;

                let job = null;
                if (ctxQuoted) {
                  job = pendingTT[ctxQuoted];
                  if (!job) continue;
                } else {
                  const jobs = Object.values(pendingTT)
                    .filter(j => j.chatId === msgItem.key.remoteJid)
                    .sort((a, b) => (b._createdAt || 0) - (a._createdAt || 0));
                  if (jobs.length > 0) job = jobs[0];
                }

                if (!job || job.isBusy) continue;

                if (id.endsWith("tt_video")) {
                  await processSend(sock, job, false, msgItem);
                  continue;
                }
                if (id.endsWith("tt_videodoc")) {
                  await processSend(sock, job, true, msgItem);
                  continue;
                }
              }

              // C) RESPUESTAS 1/2
              const ctx = msgItem.message?.extendedTextMessage?.contextInfo;
              const replyTo = ctx?.stanzaId;

              if (replyTo && pendingTT[replyTo]) {
                const job = pendingTT[replyTo];
                if (job.chatId !== msgItem.key.remoteJid) continue;

                const textLow = (msgItem.message?.conversation || msgItem.message?.extendedTextMessage?.text || "").trim().toLowerCase();
                if (textLow !== "1" && textLow !== "2") continue;
                if (job.isBusy) continue;

                const asDoc = textLow === "2";
                await processSend(sock, job, asDoc, msgItem);
              }
            } catch (e) {
              console.error("TT listener error:", e);
            }
          }
        });
      }

    } catch (err) {
      console.error("❌ Error en tt:", err?.message || err);
      await sock.sendMessage(chatId, {
        contextInfo: canal(),
        text: `❌ *Error:* ${err?.message || "Fallo al procesar el TikTok."}`
      }, { quoted: m });
      await sock.sendMessage(chatId, { react: { text: "❌", key: m.key } });
    }
  }
};
