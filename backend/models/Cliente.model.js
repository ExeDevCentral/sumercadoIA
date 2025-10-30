const mongoose = require('mongoose');

const clienteSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true
  },
  apellidos: {
    type: String,
    required: [true, 'Los apellidos son obligatorios'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'El email es obligatorio'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
  },
  telefono: {
    type: String,
    required: [true, 'El teléfono es obligatorio'],
    trim: true
  },
  dni: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  direccion: {
    calle: String,
    ciudad: String,
    codigoPostal: String,
    provincia: String,
    pais: { type: String, default: 'España' }
  },
  fechaNacimiento: Date,
  puntos: {
    type: Number,
    default: 0,
    min: 0
  },
  nivel: {
    type: String,
    enum: ['bronce', 'plata', 'oro', 'platino'],
    default: 'bronce'
  },
  descuentoPersonalizado: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  preferencias: {
    categoriasFavoritas: [String],
    notificaciones: { type: Boolean, default: true },
    newsletter: { type: Boolean, default: false }
  },
  historialCompras: [{
    venta: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venta'
    },
    fecha: Date,
    total: Number
  }],
  activo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual para nombre completo
clienteSchema.virtual('nombreCompleto').get(function() {
  return `${this.nombre} ${this.apellidos}`;
});

// Virtual para total gastado
clienteSchema.virtual('totalGastado').get(function() {
  return this.historialCompras.reduce((total, compra) => total + compra.total, 0);
});

// Calcular nivel según puntos
clienteSchema.methods.actualizarNivel = function() {
  if (this.puntos >= 5000) {
    this.nivel = 'platino';
  } else if (this.puntos >= 2000) {
    this.nivel = 'oro';
  } else if (this.puntos >= 500) {
    this.nivel = 'plata';
  } else {
    this.nivel = 'bronce';
  }
};

// Índices
clienteSchema.index({ email: 1 });
clienteSchema.index({ dni: 1 });
clienteSchema.index({ nombre: 'text', apellidos: 'text' });

module.exports = mongoose.model('Cliente', clienteSchema);
