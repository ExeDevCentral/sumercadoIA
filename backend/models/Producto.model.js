const mongoose = require('mongoose');
const withAudit = require('./plugins/audit');

/**
 * Producto schema extendido para soportar:
 * - tracking por lotes (batch)
 * - expiración por lote
 * - trazabilidad de proveedor e invoice
 * - soft delete
 * - índices de búsqueda en nombre y código/ barcode
 */
const productoSchema = new mongoose.Schema({
  codigo: {
    type: String,
    required: [true, 'El código del producto es obligatorio'],
    unique: true,
    trim: true
  },
  nombre: {
    type: String,
    required: [true, 'El nombre del producto es obligatorio'],
    trim: true
  },
  descripcion: { type: String, trim: true },
  categoria: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', index: true },
  marca: { type: String, trim: true },
  unidadTamano: { type: String, trim: true },

  // Pricing
  precioVenta: { type: Number, required: true, min: 0 },
  precioCompra: { type: Number, required: true, min: 0 },

  // Stock
  stockActual: { type: Number, required: true, min: 0, default: 0 },
  stockMinimo: { type: Number, default: 10, min: 0 },

  // Barcode / identification
  codigoBarras: { type: String, unique: true, sparse: true, trim: true, index: true },

  // Batches (many) — better for expiration tracking
  lotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }],

  // Supplier traceability
  proveedor: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  facturaProveedor: { type: String, trim: true },

  paisOrigen: { type: String, trim: true },
  diaReposicion: { type: String, enum: ['LUNES','MARTES','MIERCOLES','JUEVES','VIERNES','SABADO','DOMINGO'], default: null },
  ultimaReposicion: { type: Date },

  taxCategory: { type: String, trim: true },

  imagen: { type: String, default: 'https://via.placeholder.com/200' },

  // Soft delete
  deleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date },

  // Audit handled by plugin
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals
productoSchema.virtual('margenGanancia').get(function() {
  if (!this.precioCompra) return null;
  return ((this.precioVenta - this.precioCompra) / this.precioCompra * 100).toFixed(2);
});

productoSchema.virtual('estadoStock').get(function() {
  if (this.stockActual === 0) return 'agotado';
  if (this.stockActual <= this.stockMinimo) return 'bajo';
  return 'disponible';
});

// Índices y búsqueda
productoSchema.index({ nombre: 'text', descripcion: 'text', marca: 'text' });
productoSchema.index({ codigo: 1 });
productoSchema.index({ codigoBarras: 1 });

// Soft-delete friendly queries: add helper static
productoSchema.statics.findActive = function(filter = {}) {
  return this.find(Object.assign({}, filter, { deleted: false }));
};

// Añadir plugin de auditoría
withAudit(productoSchema);

module.exports = mongoose.model('Producto', productoSchema);
