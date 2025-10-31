const mongoose = require('mongoose');

const purchaseOrderSchema = new mongoose.Schema({
  numeroOrden: { type: String, required: true, trim: true, index: true },
  proveedor: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  fechaCreacion: { type: Date, default: Date.now },
  fechaEntregaEsperada: { type: Date },
  estado: { type: String, enum: ['pending','received','cancelled'], default: 'pending' },
  items: [{
    producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true },
    cantidad: { type: Number, required: true, min: 0 },
    nota: { type: String }
  }],
  notas: { type: String },
  creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Empleado' }
}, { timestamps: true });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
