const mongoose = require('mongoose');
const withAudit = require('./plugins/audit');

const itemVentaSchema = new mongoose.Schema({
  producto: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Producto',
    required: true
  },
  nombreProducto: String,
  cantidad: {
    type: Number,
    required: true,
    min: 1
  },
  precioUnitario: {
    type: Number,
    required: true,
    min: 0
  },
  subtotal: {
    type: Number,
    required: true
  }
});

const ventaSchema = new mongoose.Schema({
  numeroTicket: {
    type: String,
    required: true,
    unique: true
  },
  items: [itemVentaSchema],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  iva: {
    type: Number,
    required: true,
    default: 21
  },
  impuestos: {
    type: Number,
    required: true
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  metodoPago: {
    type: String,
    required: true,
    enum: ['efectivo', 'tarjeta', 'transferencia', 'mixto']
  },
  detallesPago: {
    efectivo: { type: Number, default: 0 },
    tarjeta: { type: Number, default: 0 },
    transferencia: { type: Number, default: 0 },
    cambio: { type: Number, default: 0 }
  },
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
    default: null
  },
  empleado: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empleado',
    required: true
  },
  estado: {
    type: String,
    enum: ['completada', 'cancelada', 'pendiente', 'devolucion'],
    default: 'completada'
  },
  notas: String
}, {
  timestamps: true
});

// Generar número de ticket automáticamente
ventaSchema.pre('save', async function(next) {
  if (!this.numeroTicket) {
    const fecha = new Date();
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    
    const ultimaVenta = await mongoose.model('Venta').findOne().sort({ createdAt: -1 });
    let numero = 1;
    
    if (ultimaVenta && ultimaVenta.numeroTicket) {
      const ultimoNumero = parseInt(ultimaVenta.numeroTicket.split('-').pop());
      numero = ultimoNumero + 1;
    }
    
    this.numeroTicket = `MCD-${año}${mes}${dia}-${String(numero).padStart(6, '0')}`;
  }
  next();
});

// Índices
ventaSchema.index({ numeroTicket: 1 });
ventaSchema.index({ createdAt: -1 });
ventaSchema.index({ empleado: 1 });
ventaSchema.index({ cliente: 1 });

// Añadir plugin de auditoría
withAudit(ventaSchema);

module.exports = mongoose.model('Venta', ventaSchema);
