const mongoose = require('mongoose');

const wmSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // Puede ser userId o groupId
  type: { type: String, required: true }, // 'user' o 'group'
  packname: { type: String, required: true }
});

module.exports = mongoose.model('WmConfig', wmSchema);
