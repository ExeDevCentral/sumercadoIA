const mongoose = require('mongoose');

// Schema base con campos de auditoría
const auditSchema = {
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empleado',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empleado',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
};

// Middleware pre-save para actualizar updatedAt
const auditHooks = (schema) => {
  schema.pre('save', function(next) {
    if (this.isModified() && !this.isNew) {
      this.updatedAt = new Date();
    }
    next();
  });
};

// Plugin para añadir campos y hooks de auditoría
const withAudit = (schema) => {
  // Añadir campos de auditoría
  schema.add(auditSchema);
  
  // Añadir hooks
  auditHooks(schema);
  
  // Configurar virtuals
  schema.set('toJSON', { virtuals: true });
  schema.set('toObject', { virtuals: true });
};

module.exports = withAudit;