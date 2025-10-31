const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const withAudit = require('./plugins/audit');

const turnoSchema = new mongoose.Schema({
  fecha: {
    type: Date,
    required: true
  },
  horaEntrada: {
    type: String,
    required: true
  },
  horaSalida: {
    type: String,
    required: true
  },
  horasReales: {
    entrada: Date,
    salida: Date
  },
  tipo: {
    type: String,
    enum: ['mañana', 'tarde', 'noche', 'completo'],
    default: 'mañana'
  }
});

const empleadoSchema = new mongoose.Schema({
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
    trim: true
  },
  password: {
    type: String,
    required: [true, 'La contraseña es obligatoria'],
    minlength: 6,
    select: false
  },
  dni: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  telefono: {
    type: String,
    required: true
  },
  direccion: {
    calle: String,
    ciudad: String,
    codigoPostal: String,
    provincia: String
  },
  rol: {
    type: String,
    required: true,
    enum: ['gerente', 'cajero', 'reponedor', 'supervisor', 'limpieza', 'carnicero', 'panadero'],
    default: 'cajero'
  },
  permisos: {
    type: [String],
    default: function() {
      return this.rol === 'gerente' 
        ? ['all'] 
        : this.rol === 'supervisor'
        ? ['ventas', 'productos', 'reportes']
        : ['ventas'];
    }
  },
  salario: {
    type: Number,
    required: true,
    min: 0
  },
  fechaContratacion: {
    type: Date,
    default: Date.now
  },
  turnos: [turnoSchema],
  rendimiento: {
    ventasRealizadas: { type: Number, default: 0 },
    totalVendido: { type: Number, default: 0 },
    promedioVentaDiaria: { type: Number, default: 0 }
  },
  activo: {
    type: Boolean,
    default: true
  },
  foto: {
    type: String,
    default: 'https://via.placeholder.com/150'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual para nombre completo
empleadoSchema.virtual('nombreCompleto').get(function() {
  return `${this.nombre} ${this.apellidos}`;
});

// Encriptar contraseña antes de guardar
empleadoSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Método para comparar contraseñas
empleadoSchema.methods.compararPassword = async function(passwordIngresada) {
  return await bcrypt.compare(passwordIngresada, this.password);
};

// Índices
empleadoSchema.index({ email: 1 });
empleadoSchema.index({ dni: 1 });
empleadoSchema.index({ rol: 1 });

// Añadir plugin de auditoría
withAudit(empleadoSchema);

module.exports = mongoose.model('Empleado', empleadoSchema);
