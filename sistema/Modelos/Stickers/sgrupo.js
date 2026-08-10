const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
  groupId: { type: String, required: true, unique: true },
  
  // Modos del grupo
  autosticker: { type: Boolean, default: false },
  antisticker: { type: Boolean, default: false },

  // --- MARCA PARA STICKERS INDIVIDUALES (/s) ---
  packname: { type: String, default: 'Proyecto1 Bot Pack' },
  author: { type: String, default: '@hannerjhossue' },
  tempPackname: { type: String, default: null },
  tempAuthor: { type: String, default: null },
  tempExpire: { type: Date, default: null },

  // --- MARCA PARA PAQUETES DE STICKERS (/pack /spack) ---
  packNamePack: { type: String, default: 'Proyecto1 Package' },
  authorPack: { type: String, default: '@hannerjhossue' },
  tempPackNamePack: { type: String, default: null },
  tempAuthorPack: { type: String, default: null },
  tempExpirePack: { type: Date, default: null }
});

module.exports = mongoose.model('Group', GroupSchema);
