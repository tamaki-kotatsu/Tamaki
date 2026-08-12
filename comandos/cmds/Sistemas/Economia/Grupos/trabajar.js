const Usuario = require('./Datos/usuarios');

module.exports = {
  name: 'trabajar',
  alias: ['chambear', 'work'],
  description: 'Trabaja para ganar Baticoins.',
  run: async (sock, m) => {
    const from = m.key.remoteJid;
    const sender = m.key.participant || m.key.remoteJid;

    let user = await Usuario.findOne({ jid: sender });
    if (!user) user = await Usuario.create({ jid: sender });

    if (user.carcel?.preso) {
      if (new Date() < new Date(user.carcel.tiempoFin)) {
        return sock.sendMessage(from, { text: `🚔 *¡Estás en la cárcel!* No puedes trabajar.\n*Fianza:* $${user.carcel.fianza} Batilletes.` }, { quoted: m });
      }
      user.carcel.preso = false;
    }

    const cooldown = 5 * 60 * 1000;
    const tiempoRestante = cooldown - (Date.now() - new Date(user.cooldowns?.work || 0).getTime());
    if (tiempoRestante > 0) {
      const segs = Math.ceil(tiempoRestante / 1000);
      return sock.sendMessage(from, { text: `⏳ Espera *${segs} segundos* para volver a trabajar.` }, { quoted: m });
    }

    const ganancia = Math.floor(Math.random() * 300) + 100;
    user.baticoins = (user.baticoins || 0) + ganancia;
    if (!user.cooldowns) user.cooldowns = {};
    user.cooldowns.work = new Date();
    await user.save();

    await sock.sendMessage(from, { text: `🛠️ Trabajaste duro y ganaste *${ganancia} 🪙 Baticoins*.` }, { quoted: m });
  }
};
