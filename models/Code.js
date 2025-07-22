// models/Code.js
const mongoose = require('mongoose');

const codeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  active: {
    type: Boolean,
    default: true
  },
  isPaid: {
    type: Boolean,
    default: true
  }
});

const Code = mongoose.model('Code', codeSchema);

module.exports = Code;
