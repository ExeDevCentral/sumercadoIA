const mongoose = require('mongoose');
const Producto = require('../models/Producto.model');
const Batch = require('../models/Batch.model');

// Helper: parse pagination params
const parsePagination = (query) => {
  const page = Math.max(parseInt(query.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || '20', 10), 1), 200);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

// POST /api/products
exports.create = async (req, res, next) => {
  try {
    const payload = req.body || {};

    // Basic validation
    if (!payload.codigo || !payload.nombre) {
      return res.status(400).json({ success: false, message: 'codigo y nombre son obligatorios' });
    }
    if (payload.precioVenta == null || payload.precioVenta < 0) {
      return res.status(400).json({ success: false, message: 'precioVenta inválido' });
    }
    if (payload.precioCompra == null || payload.precioCompra < 0) {
      return res.status(400).json({ success: false, message: 'precioCompra inválido' });
    }

    // Prevent duplicate codigo
    const exists = await Producto.findOne({ codigo: payload.codigo });
    if (exists) return res.status(409).json({ success: false, message: 'codigo ya existe' });

    const producto = new Producto(Object.assign({}, payload, { stockActual: payload.stockActual || 0 }));
    await producto.save();

    res.status(201).json({ success: true, data: producto });
  } catch (err) {
    next(err);
  }
};

// GET /api/products
exports.list = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { q, categoria } = req.query;

    const filter = { deleted: false };
    if (categoria) filter.categoria = mongoose.Types.ObjectId.isValid(categoria) ? categoria : categoria;
    if (q) {
      // prefer text search if possible
      filter.$text = { $search: q };
    }

    const [items, total] = await Promise.all([
      Producto.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Producto.countDocuments(filter)
    ]);

    res.json({ success: true, page, limit, total, pages: Math.ceil(total / limit), data: items });
  } catch (err) {
    next(err);
  }
};

// GET /api/products/:id
exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'id no válido' });

    const producto = await Producto.findById(id).where({ deleted: false }).populate('lotes').populate('proveedor').populate('categoria');
    if (!producto) return res.status(404).json({ success: false, message: 'Producto no encontrado' });

    res.json({ success: true, data: producto });
  } catch (err) {
    next(err);
  }
};

// PUT /api/products/:id
exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'id no válido' });

    const payload = req.body || {};
    if (payload.precioVenta != null && payload.precioVenta < 0) return res.status(400).json({ success: false, message: 'precioVenta inválido' });
    if (payload.precioCompra != null && payload.precioCompra < 0) return res.status(400).json({ success: false, message: 'precioCompra inválido' });
    if (payload.stockActual != null && payload.stockActual < 0) return res.status(400).json({ success: false, message: 'stockActual inválido' });

    const producto = await Producto.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
    if (!producto) return res.status(404).json({ success: false, message: 'Producto no encontrado' });

    res.json({ success: true, data: producto });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/products/:id -> soft delete
exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'id no válido' });

    const producto = await Producto.findById(id);
    if (!producto) return res.status(404).json({ success: false, message: 'Producto no encontrado' });

    producto.deleted = true;
    producto.deletedAt = new Date();
    await producto.save();

    res.json({ success: true, message: 'Producto eliminado (soft delete)' });
  } catch (err) {
    next(err);
  }
};

// GET /api/products/search?q=
exports.search = async (req, res, next) => {
  try {
    const q = req.query.q || '';
    const { page, limit, skip } = parsePagination(req.query);

    if (!q) return exports.list(req, res, next);

    // Prefer text search; fallback to regex
    const textFilter = { deleted: false, $text: { $search: q } };
    let items = await Producto.find(textFilter).skip(skip).limit(limit);
    let total = await Producto.countDocuments(textFilter);

    if (!items.length) {
      const regex = new RegExp(q, 'i');
      const fallbackFilter = { deleted: false, $or: [{ nombre: regex }, { codigo: regex }, { codigoBarras: regex }] };
      items = await Producto.find(fallbackFilter).skip(skip).limit(limit);
      total = await Producto.countDocuments(fallbackFilter);
    }

    res.json({ success: true, page, limit, total, pages: Math.ceil(total / limit), data: items });
  } catch (err) {
    next(err);
  }
};

// GET /api/products/expiring?days=30
exports.expiring = async (req, res, next) => {
  try {
    const days = Math.max(parseInt(req.query.days || '30', 10), 1);
    const until = new Date();
    until.setDate(until.getDate() + days);

    // find batches expiring until that date
    const batches = await Batch.find({ fechaVencimiento: { $lte: until } }).populate('producto proveedor');

    res.json({ success: true, days, count: batches.length, data: batches });
  } catch (err) {
    next(err);
  }
};

// GET /api/products/low-stock
exports.lowStock = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { deleted: false, $expr: { $lte: ['$stockActual', '$stockMinimo'] } };

    const [items, total] = await Promise.all([
      Producto.find(filter).skip(skip).limit(limit).sort({ stockActual: 1 }),
      Producto.countDocuments(filter)
    ]);

    res.json({ success: true, page, limit, total, pages: Math.ceil(total / limit), data: items });
  } catch (err) {
    next(err);
  }
};
