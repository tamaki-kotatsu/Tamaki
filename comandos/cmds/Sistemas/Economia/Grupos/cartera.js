const Usuario = require('./usuarios');

module.exports = {
  name: 'cartera',
  alias: ['bal', 'banco', 'billetera', 'financiero'],
  description: 'Muestra tu billetera y gestiona banco, inversiones, criptos y transferencias.',
  run: async (sock, m, texto) => {
    const from = m.key.remoteJid;
    const sender = m.key.participant || m.key.remoteJid;

    let user = await Usuario.findOne({ jid: sender }) || await Usuario.create({ jid: sender });

    const args = texto ? texto.trim().split(' ') : [];
    const subcomando = args[0]?.toLowerCase();

    // -------------------------------------------------------------
    // SUBCOMANDO: Abrir cuenta en el banco
    // -------------------------------------------------------------
    if (subcomando === 'abrir') {
      if (user.banco?.cuentaCreada) {
        return sock.sendMessage(from, { text: '🏦 Ya tienes una cuenta bancaria activa.' }, { quoted: m });
      }
      user.banco = { cuentaCreada: true, ahorros: 0 };
      await user.save();
      return sock.sendMessage(from, { text: '🎉 ¡Felicidades! Has abierto tu cuenta de ahorros en el banco con éxito.' }, { quoted: m });
    }

    // -------------------------------------------------------------
    // SUBCOMANDO: Depositar ahorros con Impuesto (5% de comisión)
    // -------------------------------------------------------------
    if (subcomando === 'depositar') {
      if (!user.banco?.cuentaCreada) {
        return sock.sendMessage(from, { text: '⚠️ Primero debes abrir una cuenta bancaria ejecutando `/cartera abrir`.' }, { quoted: m });
      }

      let monto = parseInt(args[1]);
      if (args[1] === 'all') monto = user.baticoins;

      if (isNaN(monto) || monto <= 0) {
        return sock.sendMessage(from, { text: '⚠️ Especifica una cantidad válida de Baticoins para depositar o usa `all`.' }, { quoted: m });
      }

      if (user.baticoins < monto) {
        return sock.sendMessage(from, { text: '❌ No tienes suficientes Baticoins en la billetera.' }, { quoted: m });
      }

      const impuesto = Math.floor(monto * 0.05); // Impuesto del 5%
      const neto = monto - impuesto;

      user.baticoins -= monto;
      user.banco.ahorros += neto;
      await user.save();

      return sock.sendMessage(from, { 
        text: `🏦 *Depósito Exitoso*\n\n` +
              `💰 *Depositado:* ${monto} 🪙 Baticoins\n` +
              `🏛️ *Impuesto bancario (5%):* ${impuesto} 🪙\n` +
              `📈 *Añadido a tus ahorros:* ${neto} 🪙` 
      }, { quoted: m });
    }

    // -------------------------------------------------------------
    // SUBCOMANDO: Invertir
    // -------------------------------------------------------------
    if (subcomando === 'invertir') {
      const monto = parseInt(args[1]);
      if (isNaN(monto) || monto < 100) {
        return sock.sendMessage(from, { text: '⚠️ Ingresa un monto válido para invertir (Mínimo 100 Baticoins).' }, { quoted: m });
      }

      if (user.baticoins < monto) {
        return sock.sendMessage(from, { text: '❌ No tienes suficientes Baticoins para invertir.' }, { quoted: m });
      }

      // 60% probabilidad de éxito
      const exito = Math.random() < 0.6;
      let resultado = 0;

      if (exito) {
        resultado = Math.floor(monto * 1.5); // 50% de ganancia
        user.baticoins += (resultado - monto);
        await user.save();
        return sock.sendMessage(from, { text: `📈 ¡Tu inversión fue un éxito! Invertiste *${monto}* y recuperaste *${resultado} 🪙 Baticoins*.` }, { quoted: m });
      } else {
        user.baticoins -= monto;
        await user.save();
        return sock.sendMessage(from, { text: `📉 Mercado a la baja. Perdiste tu inversión de *${monto} 🪙 Baticoins*.` }, { quoted: m });
      }
    }

    // -------------------------------------------------------------
    // SUBCOMANDO: Comprar Criptos (1 Batcrypto = 100 Baticoins)
    // -------------------------------------------------------------
    if (subcomando === 'comprarcripto') {
      const cantidad = parseInt(args[1]);
      if (isNaN(cantidad) || cantidad <= 0) {
        return sock.sendMessage(from, { text: '⚠️ Especifica la cantidad de Batcryptos a comprar.' }, { quoted: m });
      }

      const costo = cantidad * 100;
      if (user.baticoins < costo) {
        return sock.sendMessage(from, { text: `❌ Necesitas *${costo} 🪙 Baticoins* para comprar *${cantidad} ⚡ Batcryptos*.` }, { quoted: m });
      }

      user.baticoins -= costo;
      user.batcryptos = (user.batcryptos || 0) + cantidad;
      await user.save();

      return sock.sendMessage(from, { text: `⚡ Has comprado *${cantidad} Batcryptos* por *${costo} 🪙 Baticoins*.` }, { quoted: m });
    }

    // -------------------------------------------------------------
    // SUBCOMANDO: Transferir Baticoins a otro usuario
    // -------------------------------------------------------------
    if (subcomando === 'transferir') {
      const mencionado = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
      const monto = parseInt(args[1]);

      if (!mencionado) {
        return sock.sendMessage(from, { text: '⚠️ Menciona al usuario a quien deseas transferir dinero.\n*Uso:* `/cartera transferir 100 @usuario`' }, { quoted: m });
      }

      if (mencionado === sender) {
        return sock.sendMessage(from, { text: '❌ No te puedes transferir a ti mismo.' }, { quoted: m });
      }

      if (isNaN(monto) || monto <= 0) {
        return sock.sendMessage(from, { text: '⚠️ Ingrese una cantidad válida a transferir.' }, { quoted: m });
      }

      if (user.baticoins < monto) {
        return sock.sendMessage(from, { text: '❌ No tienes suficientes Baticoins para realizar esta transferencia.' }, { quoted: m });
      }

      let receptor = await Usuario.findOne({ jid: mencionado }) || await Usuario.create({ jid: mencionado });

      user.baticoins -= monto;
      receptor.baticoins = (receptor.baticoins || 0) + monto;

      await user.save();
      await receptor.save();

      return sock.sendMessage(from, { 
        text: `💸 Transferiste *${monto} 🪙 Baticoins* exitosamente a @${mencionado.split('@')[0]}.`, 
        mentions: [mencionado] 
      }, { quoted: m });
    }

    // -------------------------------------------------------------
    // VISTA PRINCIPAL DE LA CARTERA / BILLETERA
    // -------------------------------------------------------------
    const estadoBanco = user.banco?.cuentaCreada 
      ? `$${(user.banco.ahorros || 0).toLocaleString()} 🪙 (Ahorros)` 
      : '_Sin cuenta bancaria_ (`/cartera abrir`)';

    const estadoCarcel = user.carcel?.preso 
      ? `🚨 Encarcelado (Fianza: $${user.carcel.fianza} Batilletes)` 
      : '🟢 Libre';

    const menuBilletera = 
      `💼 *ESTADO FINANCIERO PERSONAL* 💼\n\n` +
      `👤 *Usuario:* @${sender.split('@')[0]}\n` +
      `⚖️ *Estado Legal:* ${estadoCarcel}\n\n` +
      `👛 *Billetera:* ${user.baticoins || 0} 🪙 Baticoins\n` +
      `💵 *Efectivo:* ${user.batilletes || 0} 💵 Batilletes\n` +
      `⚡ *Criptos:* ${user.batcryptos || 0} Batcryptos\n` +
      `🏦 *Banco:* ${estadoBanco}\n\n` +
      `📌 *Comandos bancarios y financieros:*\n` +
      `• \`/cartera abrir\` -> Abre tu cuenta de ahorros.\n` +
      `• \`/cartera depositar <monto/all>\` -> Guarda dinero en el banco (Impuesto del 5%).\n` +
      `• \`/cartera invertir <monto>\` -> Arriesga Baticoins en el mercado.\n` +
      `• \`/cartera comprarcripto <cantidad>\` -> Adquiere moneda virtual Batcryptos.\n` +
      `• \`/cartera transferir <monto> @usuario\` -> Transfiere Baticoins a un amigo.`;

    await sock.sendMessage(from, { text: menuBilletera, mentions: [sender] }, { quoted: m });
  }
};
