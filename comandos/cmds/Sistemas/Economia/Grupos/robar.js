const Usuario = require('./usuarios');

module.exports = {
  name: 'robar',
  alias: ['rob'],
  description: 'Intenta robar Baticoins a otro usuario.',
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid;
    const sender = m.key.participant || m.key.remoteJid;

    const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (!mentioned) {
      return sock.sendMessage(from, { text: '⚠️ Menciona al usuario a quien quieres robar.' }, { quoted: m });
    }

    if (mentioned === sender) {
      return sock.sendMessage(from, { text: '❌ No te puedes robar a ti mismo.' }, { quoted: m });
    }

    let ladron = await Usuario.findOne({ jid: sender }) || await Usuario.create({ jid: sender });
    let victima = await Usuario.findOne({ jid: mentioned }) || await Usuario.create({ jid: mentioned });

    if (ladron.carcel?.preso) {
      return sock.sendMessage(from, { text: '🚔 No puedes robar desde la cárcel.' }, { quoted: m });
    }

    if ((victima.baticoins || 0) < 50) {
      return sock.sendMessage(from, { text: '💸 La víctima es demasiado pobre para robarle.' }, { quoted: m });
    }

    const cooldown = 10 * 60 * 1000;
    if (Date.now() - new Date(ladron.cooldowns?.robar || 0).getTime() < cooldown) {
      return sock.sendMessage(from, { text: '⏳ La policía te está buscando, espera un rato antes de volver a robar.' }, { quoted: m });
    }

    if (!ladron.cooldowns) ladron.cooldowns = {};
    ladron.cooldowns.robar = new Date();

    const exito = Math.random() < 0.5;

    if (exito) {
      const robado = Math.floor(Math.random() * (victima.baticoins * 0.4)) + 10;
      victima.baticoins -= robado;
      ladron.baticoins = (ladron.baticoins || 0) + robado;

      await victima.save();
      await ladron.save();

      await sock.sendMessage(from, { 
        text: `🥷 ¡Robo exitoso! Le quitaste *${robado} 🪙 Baticoins* a @${mentioned.split('@')[0]}.`, 
        mentions: [mentioned] 
      }, { quoted: m });

    } else {
      const fianzaCalculada = 500;
      ladron.carcel = {
        preso: true,
        tiempoFin: new Date(Date.now() + 10 * 60 * 1000),
        fianza: fianzaCalculada,
        motivo: 'Intento de robo'
      };

      await ladron.save();

      await sock.sendMessage(from, { 
        text: `🚨 ¡TE CAPTURÓ LA POLICÍA! 🚨\n\nFuiste enviado a la cárcel por 10 minutos.\n*Fianza:* ${fianzaCalculada} 💵 Batilletes.` 
      }, { quoted: m });
    }
  }
};
