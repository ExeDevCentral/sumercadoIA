const mongoose = require('mongoose');

const movementSchema = new mongoose.Schema({
  tipo: { type: String, enum: ['entrada','salida','ajuste','transferencia'], required: true },
  producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true, index: true },
  lote: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  cantidad: { type: Number, required: true },
  fecha: { type: Date, default: Date.now },
  referencia: { type: String }, // e.g., invoice number, motivo
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Empleado' },
  notas: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('StockMovement', movementSchema);
