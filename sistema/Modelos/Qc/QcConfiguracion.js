const mongoose = require('mongoose');

const QcConfigSchema = new mongoose.Schema({
  groupId: { type: String, required: true, unique: true },
  color: { type: String, default: '#ffffff' },
  theme: { type: String, default: null },
  customBgBase64: { type: String, default: null }
});

module.exports = mongoose.model('QcConfig', QcConfigSchema);
