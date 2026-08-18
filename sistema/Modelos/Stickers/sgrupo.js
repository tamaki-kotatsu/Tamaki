const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
  groupId: { type: String, required: true, unique: true },
  
  // Modos del grupo
  autosticker: { type: Boolean, default: false },
  antisticker: { type: Boolean, default: false },

  // --- MARCA PARA STICKERS INDIVIDUALES (/s) ---
  packname: { type: String, default: '🪐 🜲 𝙼𝚢𝚛𝚊𝚒 🜲 🪐\n\n⤷ https://tamaki-kotatsu.github.io/.xyz/' },
  author: { type: String, default: '⋮ ᯓ★ Info del Sticker: \n\n⋮⤷𐙚 Grupo: @grupo\n⋮⤷👤 User: @usuario\n⋮⤷🤖 Bot: Mambo 🤎' },
  tempPackname: { type: String, default: null },
  tempAuthor: { type: String, default: null },
  tempExpire: { type: Date, default: null },

  // --- MARCA PARA PAQUETES DE STICKERS (/pack /spack) ---
  packNamePack: { type: String, default: '🪐 🜲 𝙼𝚢𝚛𝚊𝚒 🜲 🪐\n\n⤷ https://tamaki-kotatsu.github.io/.xyz/' },
  authorPack: { type: String, default: '🚩 Info del Sticker 🚩\n\n👥 Grupo: @grupo\n👤 User: @usuario\n🤖 Bot: Mambo 🤎' },
  tempPackNamePack: { type: String, default: null },
  tempAuthorPack: { type: String, default: null },
  tempExpirePack: { type: Date, default: null }
});

module.exports = mongoose.model('Group', GroupSchema);
