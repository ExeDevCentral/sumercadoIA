const mongoose = require('mongoose');

const auditSchema = new mongoose.Schema({
  entityType: { 
    type: String, 
    required: true, 
    enum: ['producto', 'stock', 'venta', 'invoice', 'batch', 'supplier'],
    index: true 
  },
  entityId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true,
    index: true
  },
  action: { 
    type: String, 
    required: true,
    enum: [
      'create',
      'update',
      'delete',
      'price_change',
      'stock_entry',
      'stock_removal',
      'stock_adjust',
      'sale',
      'expire',
      'invoice_create'
    ],
    index: true
  },
  changes: [{
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed
  }],
  metadata: {
    origen: { 
      type: String, 
      enum: ['POS', 'admin', 'API'],
      required: true 
    },
    ip: String,
    userAgent: String
  },
  usuario: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Empleado',
    required: true 
  },
  timestamp: { 
    type: Date, 
    default: Date.now,
    index: true
  }
}, {
  // Disable modifications
  capped: { size: 512000000, max: 1000000 }, // 512MB cap, max 1M documents
  strict: true
});

// Ensure audit entries can't be modified
auditSchema.pre('save', function(next) {
  if (!this.isNew) {
    const err = new Error('Audit entries cannot be modified');
    next(err);
  }
  next();
});

// Helper to record an audit entry
auditSchema.statics.record = async function(params) {
  const { 
    entityType, entityId, action, changes, 
    usuario, metadata = {} 
  } = params;

  const entry = new this({
    entityType,
    entityId,
    action,
    changes,
    usuario,
    metadata: {
      origen: metadata.origen || 'API',
      ip: metadata.ip,
      userAgent: metadata.userAgent
    }
  });

  return entry.save();
};

module.exports = mongoose.model('Audit', auditSchema);