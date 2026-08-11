const mongoose = require('mongoose');

const ActividadSchema = new mongoose.Schema({
    groupId: { type: String, required: true },
    userId: { type: String, required: true },
    ultimaVezActivo: { type: Date, default: Date.now }
});

ActividadSchema.index({ groupId: 1, userId: 1 }, { unique: true });

// CORRECCIÓN: Si el modelo ya existe en Mongoose, lo usa; si no, lo crea.
module.exports = mongoose.models.Actividad || mongoose.model('Actividad', ActividadSchema);
