const mongoose = require('mongoose');
const Audit = require('../models/Audit.model');

/**
 * Record a specialized price change audit entry
 */
const recordPriceChange = async (producto, oldPrice, newPrice, userId, metadata = {}) => {
  try {
    await Audit.record({
      entityType: 'producto',
      entityId: producto._id,
      action: 'price_change',
      changes: [{
        field: 'precioVenta',
        oldValue: oldPrice,
        newValue: newPrice
      }],
      usuario: userId,
      metadata
    });
  } catch (err) {
    console.error('Error recording price change audit:', err);
  }
};

/**
 * Record a stock movement audit entry
 */
const recordStockMovement = async (producto, oldStock, newStock, action, userId, metadata = {}) => {
  try {
    await Audit.record({
      entityType: 'producto',
      entityId: producto._id,
      action,
      changes: [{
        field: 'stockActual',
        oldValue: oldStock,
        newValue: newStock
      }],
      usuario: userId,
      metadata
    });
  } catch (err) {
    console.error('Error recording stock movement audit:', err);
  }
};

/**
 * Record expiration removal
 */
const recordExpirationRemoval = async (producto, batch, cantidad, userId, metadata = {}) => {
  try {
    await Audit.record({
      entityType: 'producto',
      entityId: producto._id,
      action: 'expire',
      changes: [{
        field: 'lote',
        oldValue: { id: batch._id, codigo: batch.codigoLote, cantidad },
        newValue: null
      }],
      usuario: userId,
      metadata
    });
  } catch (err) {
    console.error('Error recording expiration removal audit:', err);
  }
};

module.exports = {
  recordPriceChange,
  recordStockMovement,
  recordExpirationRemoval
};