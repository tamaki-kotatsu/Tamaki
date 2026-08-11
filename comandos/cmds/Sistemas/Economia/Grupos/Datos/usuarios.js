const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
  jid: { type: String, required: true, unique: true },
  baticoins: { type: Number, default: 0 },
  batilletes: { type: Number, default: 0 },
  batcryptos: { type: Number, default: 0 },
  banco: {
    cuentaCreada: { type: Boolean, default: false },
    ahorros: { type: Number, default: 0 }
  },
  inversiones: {
    monto: { type: Number, default: 0 },
    fecha: { type: Date, default: null }
  },
  carcel: {
    preso: { type: Boolean, default: false },
    tiempoFin: { type: Date, default: null },
    fianza: { type: Number, default: 0 },
    motivo: { type: String, default: '' }
  },
  cooldowns: {
    work: { type: Date, default: 0 },
    robar: { type: Date, default: 0 }
  }
});

module.exports = mongoose.models.Usuario || mongoose.model('Usuario', usuarioSchema);
