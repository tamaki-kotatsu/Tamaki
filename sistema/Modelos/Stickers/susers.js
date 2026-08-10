const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true }, // WhatsApp ID del usuario (ej: 123456789@s.whatsapp.net)

  // --- MARCA PERSONAL PARA STICKERS INDIVIDUALES (/s) ---
  packname: { type: String, default: 'Mi Bot Pack' },
  author: { type: String, default: 'Mi Sticker' },
  tempPackname: { type: String, default: null },
  tempAuthor: { type: String, default: null },
  tempExpire: { type: Date, default: null },

  // --- MARCA PERSONAL PARA PAQUETES (/pack) ---
  packNamePack: { type: String, default: 'Mi Paquete de Stickers' },
  authorPack: { type: String, default: 'Mi Autor' },
  tempPackNamePack: { type: String, default: null },
  tempAuthorPack: { type: String, default: null },
  tempExpirePack: { type: Date, default: null }
});

module.exports = mongoose.model('User', UserSchema);
