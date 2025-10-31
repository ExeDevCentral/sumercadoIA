const express = require('express');
const router = express.Router();
const Audit = require('../models/Audit.model');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

// Parse pagination params
const parsePagination = (query) => {
  const page = Math.max(parseInt(query.page || '1'), 1);
  const limit = Math.min(parseInt(query.limit || '50'), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

/**
 * Get audit trail with filtering
 * GET /api/audit?
 *   entityType=producto&
 *   action=price_change&
 *   from=2025-01-01&
 *   to=2025-12-31&
 *   usuario=123
 */
router.get('/', auth, requireRole('gerente'), async (req, res) => {
  try {
    const { entityType, action, from, to, usuario } = req.query;
    const { page, limit, skip } = parsePagination(req.query);

    // Build filter
    const filter = {};
    if (entityType) filter.entityType = entityType;
    if (action) filter.action = action;
    if (usuario) filter.usuario = usuario;
    
    // Date range
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }

    const [entries, total] = await Promise.all([
      Audit.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate('usuario', 'nombre email rol'),
      Audit.countDocuments(filter)
    ]);

    res.json({
      success: true,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      data: entries
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving audit trail',
      error: err.message
    });
  }
});

/**
 * Get audit trail for specific entity
 * GET /api/audit/entity/:type/:id
 */
router.get('/entity/:type/:id', auth, requireRole('gerente'), async (req, res) => {
  try {
    const { type, id } = req.params;
    const { page, limit, skip } = parsePagination(req.query);

    const [entries, total] = await Promise.all([
      Audit.find({ entityType: type, entityId: id })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate('usuario', 'nombre email rol'),
      Audit.countDocuments({ entityType: type, entityId: id })
    ]);

    res.json({
      success: true,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      data: entries
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving entity audit trail',
      error: err.message
    });
  }
});

/**
 * Get price change history for a product
 * GET /api/audit/product/:id/prices
 */
router.get('/product/:id/prices', auth, requireRole('gerente'), async (req, res) => {
  try {
    const { id } = req.params;
    const { page, limit, skip } = parsePagination(req.query);

    const [entries, total] = await Promise.all([
      Audit.find({
        entityType: 'producto',
        entityId: id,
        action: 'price_change'
      })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate('usuario', 'nombre email rol'),
      Audit.countDocuments({
        entityType: 'producto',
        entityId: id,
        action: 'price_change'
      })
    ]);

    res.json({
      success: true,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      data: entries
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving price history',
      error: err.message
    });
  }
});

/**
 * Get stock movement history for a product
 * GET /api/audit/product/:id/stock
 */
router.get('/product/:id/stock', auth, requireRole('gerente'), async (req, res) => {
  try {
    const { id } = req.params;
    const { page, limit, skip } = parsePagination(req.query);

    const [entries, total] = await Promise.all([
      Audit.find({
        entityType: 'producto',
        entityId: id,
        action: { $in: ['stock_entry', 'stock_removal', 'stock_adjust'] }
      })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate('usuario', 'nombre email rol'),
      Audit.countDocuments({
        entityType: 'producto',
        entityId: id,
        action: { $in: ['stock_entry', 'stock_removal', 'stock_adjust'] }
      })
    ]);

    res.json({
      success: true,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      data: entries
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving stock history',
      error: err.message
    });
  }
});

module.exports = router;