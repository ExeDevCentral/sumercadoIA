const mongoose = require('mongoose');
const withAudit = require('./plugins/audit');

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
  descripcion: {
    type: String,
    trim: true
  },
  categoria: {
    type: String,
    required: [true, 'La categoría es obligatoria'],
    enum: ['alimentos', 'bebidas', 'limpieza', 'higiene', 'panaderia', 'carniceria', 'pescaderia', 'fruteria', 'congelados', 'otros']
  },
  precio: {
    type: Number,
    required: [true, 'El precio es obligatorio'],
    min: 0
  },
  precioCompra: {
    type: Number,
    required: true,
    min: 0
  },
  stock: {
    type: Number,
    required: [true, 'El stock es obligatorio'],
    min: 0,
    default: 0
  },
  stockMinimo: {
    type: Number,
    default: 10,
    min: 0
  },
  proveedor: {
    nombre: String,
    contacto: String,
    telefono: String
  },
  imagen: {
    type: String,
    default: 'https://via.placeholder.com/200'
  },
  activo: {
    type: Boolean,
    default: true
  },
  unidadMedida: {
    type: String,
    enum: ['unidad', 'kg', 'litro', 'gramo', 'ml'],
    default: 'unidad'
  },
  codigoBarras: {
    type: String,
    unique: true,
    sparse: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual para margen de ganancia
productoSchema.virtual('margenGanancia').get(function() {
  return ((this.precio - this.precioCompra) / this.precioCompra * 100).toFixed(2);
});

// Virtual para estado de stock
productoSchema.virtual('estadoStock').get(function() {
  if (this.stock === 0) return 'agotado';
  if (this.stock <= this.stockMinimo) return 'bajo';
  return 'disponible';
});

// Índices para búsquedas rápidas
productoSchema.index({ nombre: 'text', descripcion: 'text' });
productoSchema.index({ categoria: 1 });
productoSchema.index({ codigo: 1 });

module.exports = mongoose.model('Producto', productoSchema);
