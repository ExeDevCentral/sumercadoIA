const mongoose = require('mongoose');

const expirationAlertSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', index: true },
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', index: true },
  batchCode: { type: String, trim: true, index: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', index: true },
  expirationDate: { type: Date, index: true },
  daysLeft: { type: Number, index: true },
  alertLevel: { type: String, enum: ['critical','warning','info','none'], default: 'none', index: true },
  quantityRemaining: { type: Number, default: 0 },
  location: { type: String, enum: ['shelf','backroom'] },
  acknowledged: { type: Boolean, default: false },
  metadata: { type: mongoose.Schema.Types.Mixed }
}, {
  timestamps: true
});

expirationAlertSchema.index({ alertLevel: 1, daysLeft: 1 });

module.exports = mongoose.model('ExpirationAlert', expirationAlertSchema);
