const mongoose = require('mongoose');

const stockEntrySchema = new mongoose.Schema({
  producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true, index: true },
  lote: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  cantidad: { type: Number, required: true },
  tipo: { type: String, enum: ['entrada','salida','ajuste'], required: true },
  referencia: { type: String }, // invoice number, order number, motivo
  factura: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseInvoice' },
  creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Empleado' }
}, { timestamps: true });

module.exports = mongoose.model('StockEntry', stockEntrySchema);
