const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true }, // WhatsApp ID del usuario

  // --- MARCA PERSONAL PARA STICKERS INDIVIDUALES (/s) ---
  packname: { type: String, default: '🪐 🜲 𝙼𝚢𝚛𝚊𝚒 🜲 🪐\n\n⤷ https://tamaki-kotatsu.github.io/.xyz/' },
  author: { type: String, default: '🚩 Info del Sticker 🚩\n\n👥 Grupo: @grupo\n👤 User: @usuario\n🤖 Bot: Mambo 🤎' },
  tempPackname: { type: String, default: null },
  tempAuthor: { type: String, default: null },
  tempExpire: { type: Date, default: null },

  // --- MARCA PERSONAL PARA PAQUETES (/pack) ---
  packNamePack: { type: String, default: '🪐 🜲 𝙼𝚢𝚛𝚊𝚒 🜲 🪐\n\n⤷ https://tamaki-kotatsu.github.io/.xyz/' },
  authorPack: { type: String, default: '🚩 Info del Sticker 🚩\n\n👥 Grupo: @grupo\n👤 User: @usuario\n🤖 Bot: Mambo 🤎' },
  tempPackNamePack: { type: String, default: null },
  tempAuthorPack: { type: String, default: null },
  tempExpirePack: { type: Date, default: null }
});

module.exports = mongoose.model('User', UserSchema);
