const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true, index: true },
  contacto: { type: String, trim: true },
  telefono: { type: String, trim: true },
  email: { type: String, trim: true },
  direccion: { type: String, trim: true },
  identificadorFiscal: { type: String, trim: true },
  notas: { type: String },
  activo: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Supplier', supplierSchema);
