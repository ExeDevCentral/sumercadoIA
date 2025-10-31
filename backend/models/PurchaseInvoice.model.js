const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  numeroFactura: { type: String, required: true, trim: true, index: true },
  proveedor: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  fecha: { type: Date, required: true, default: Date.now },
  total: { type: Number, required: true, min: 0 },
  items: [{
    producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto' },
    lote: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
    cantidad: { type: Number, min: 0 },
    precioUnitario: { type: Number, min: 0 }
  }],
  notas: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('PurchaseInvoice', invoiceSchema);
