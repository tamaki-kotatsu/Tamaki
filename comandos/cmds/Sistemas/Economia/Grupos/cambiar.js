const Usuario = require('./Datos//usuarios');

module.exports = {
  name: 'cambiar',
  alias: ['convertir'],
  description: 'Convierte Baticoins a Batilletes (10 Baticoins = 1 Batillete).',
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid;
    const sender = m.key.participant || m.key.remoteJid;

    const cantidadCoins = parseInt(texto?.trim());
    if (isNaN(cantidadCoins) || cantidadCoins < 10) {
      return sock.sendMessage(from, { text: '⚠️ Ingresa una cantidad válida de Baticoins (mínimo 10).' }, { quoted: m });
    }

    let user = await Usuario.findOne({ jid: sender }) || await Usuario.create({ jid: sender });

    if ((user.baticoins || 0) < cantidadCoins) {
      return sock.sendMessage(from, { text: '❌ No tienes suficientes Baticoins.' }, { quoted: m });
    }

    const batilletesObtenidos = Math.floor(cantidadCoins / 10);
    const coinsUsadas = batilletesObtenidos * 10;

    user.baticoins -= coinsUsadas;
    user.batilletes = (user.batilletes || 0) + batilletesObtenidos;
    await user.save();

    await sock.sendMessage(from, { 
      text: `💱 Convertiste *${coinsUsadas} 🪙 Baticoins* en *$${batilletesObtenidos} 💵 Batilletes*.` 
    }, { quoted: m });
  }
};
