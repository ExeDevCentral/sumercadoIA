const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  codigoLote: { type: String, required: true, trim: true, index: true },
  producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true, index: true },
  cantidad: { type: Number, required: true, min: 0 },
  cantidadDisponible: { type: Number, required: true, min: 0 },
  fechaFabricacion: { type: Date },
  fechaVencimiento: { type: Date, index: true },
  facturaProveedor: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseInvoice' },
  proveedor: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  ubicacion: { type: String },
  notas: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Batch', batchSchema);
