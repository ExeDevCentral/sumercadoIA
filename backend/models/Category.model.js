const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true, unique: true },
  descripcion: { type: String },
  activo: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
