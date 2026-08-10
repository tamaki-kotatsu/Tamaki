const Usuario = require('./usuarios');

module.exports = {
  name: 'pagarfianza',
  alias: ['fianza', 'bail'],
  description: 'Paga tu fianza o la de un amigo usando Batilletes.',
  run: async (sock, m) => {
    const from = m.key.remoteJid;
    const pagadorJid = m.key.participant || m.key.remoteJid;

    const mencionado = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const objetivoJid = mencionado || pagadorJid;

    let pagador = await Usuario.findOne({ jid: pagadorJid }) || await Usuario.create({ jid: pagadorJid });
    let objetivo = await Usuario.findOne({ jid: objetivoJid }) || await Usuario.create({ jid: objetivoJid });

    if (!objetivo.carcel?.preso) {
      return sock.sendMessage(from, { 
        text: mencionado ? '⚠️ Ese usuario no está en la cárcel.' : '⚠️ No estás en la cárcel.' 
      }, { quoted: m });
    }

    const fianza = objetivo.carcel.fianza || 0;

    if ((pagador.batilletes || 0) < fianza) {
      return sock.sendMessage(from, { 
        text: `❌ No hay suficientes Batilletes.\n*Fianza requerida:* $${fianza} 💵 Batilletes.\n*Tienes:* $${pagador.batilletes || 0} 💵 Batilletes.` 
      }, { quoted: m });
    }

    pagador.batilletes -= fianza;
    objetivo.carcel = { preso: false, tiempoFin: null, fianza: 0, motivo: '' };

    await pagador.save();
    if (pagadorJid !== objetivoJid) await objetivo.save();

    const mensaje = pagadorJid === objetivoJid
      ? `🔓 Pagaste tu fianza de *$${fianza} 💵 Batilletes* y quedaste en libertad.`
      : `🤝 Pagaste la fianza de *$${fianza} 💵 Batilletes* para liberar a @${objetivoJid.split('@')[0]}.`;

    await sock.sendMessage(from, { text: mensaje, mentions: [objetivoJid] }, { quoted: m });
  }
};
