const mongoose = require('mongoose');
const Supplier = require('../models/Supplier.model');
const Product = require('../models/Producto.model');
const Batch = require('../models/Batch.model');
const PurchaseInvoice = require('../models/PurchaseInvoice.model');
const PurchaseOrder = require('../models/PurchaseOrder.model');
const StockEntry = require('../models/StockEntry.model');
const StockMovement = require('../models/StockMovement.model');

/**
 * Business rules / constants
 */
const PRICE_DECREASE_THRESHOLD = 0.20; // 20% decrease requires approval flag

// Helper: ensure date is future
const ensureFutureDate = (d) => {
  if (!d) return false;
  const dt = new Date(d);
  return dt.getTime() > Date.now();
};

/**
 * Register a supplier invoice, create batches, update product stock and record stock entries
 * Expected payload example:
 * {
 *   "numeroFactura": "F-2025-001",
 *   "proveedorId": "...",
 *   "fecha": "2025-10-30",
 *   "items": [
 *     { "productoId":"...","cantidad":100,"precioUnitario":1.2,"fechaVencimiento":"2026-01-01","codigoLote":"L-1001" }
 *   ],
 *   "notas":"...",
 *   "aprobacionPrecio": false
 * }
 */
exports.registerInvoice = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const payload = req.body || {};
    const { numeroFactura, proveedorId, fecha, items, notas, aprobacionPrecio } = payload;

    if (!numeroFactura || !proveedorId || !Array.isArray(items) || items.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Payload incompleto: numeroFactura, proveedorId e items son obligatorios' });
    }

    const proveedor = await Supplier.findById(proveedorId).session(session);
    if (!proveedor) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Proveedor no encontrado' });
    }

    // Validate duplicate invoice for same supplier
    const existingInvoice = await PurchaseInvoice.findOne({ numeroFactura, proveedor: proveedorId }).session(session);
    if (existingInvoice) {
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({ success: false, message: 'Factura ya registrada para este proveedor' });
    }

    const createdItems = [];

    // Iterate items and create batches, update product stock
    for (const it of items) {
      const { productoId, cantidad, precioUnitario, fechaVencimiento, codigoLote } = it;

      if (!productoId || cantidad == null || cantidad <= 0 || precioUnitario == null || precioUnitario < 0) {
        throw new Error('Item inválido: productoId, cantidad>0 y precioUnitario>=0 son obligatorios');
      }

      // expiration must be future
      if (!ensureFutureDate(fechaVencimiento)) {
        return res.status(400).json({ success: false, message: `fechaVencimiento inválida para lote ${codigoLote || 'sin-codigo'}` });
      }

      const producto = await Product.findById(productoId).session(session);
      if (!producto) {
        throw new Error(`Producto ${productoId} no encontrado`);
      }

      // Price decrease rule
      if (producto.precioCompra != null) {
        const allowedDecrease = producto.precioCompra * (1 - PRICE_DECREASE_THRESHOLD);
        if (precioUnitario < allowedDecrease && !aprobacionPrecio) {
          await session.abortTransaction();
          session.endSession();
          return res.status(403).json({ success: false, message: `Precio unitario para producto ${producto.nombre} (${producto.codigo || producto.codigoBarras}) disminuye más del ${PRICE_DECREASE_THRESHOLD * 100}% y requiere aprobación` });
        }
      }

      // Batch uniqueness per supplier
      if (codigoLote) {
        const existingBatch = await Batch.findOne({ codigoLote, proveedor: proveedorId }).session(session);
        if (existingBatch) {
          await session.abortTransaction();
          session.endSession();
          return res.status(409).json({ success: false, message: `Código de lote ${codigoLote} ya existe para este proveedor` });
        }
      }

      // Create batch
      const batchDoc = new Batch({
        codigoLote: codigoLote || `AUTO-${Date.now()}`,
        producto: productoId,
        proveedor: proveedorId,
        cantidad,
        cantidadDisponible: cantidad,
        fechaFabricacion: it.fechaFabricacion || null,
        fechaVencimiento,
        facturaProveedor: null // will set after creating invoice
      });
      await batchDoc.save({ session });

      // Add batch to product.lotes and update stockActual
      if (!producto.lotes) producto.lotes = [];
      producto.lotes.push(batchDoc._id);
      producto.stockActual = (producto.stockActual || 0) + cantidad;

      // Optionally update last purchase price
      producto.precioCompra = precioUnitario;
      producto.ultimaReposicion = fecha || new Date();

      await producto.save({ session });

      // Create stock movement and stock entry
      const movement = new StockMovement({
        tipo: 'entrada',
        producto: productoId,
        lote: batchDoc._id,
        cantidad,
        fecha: fecha || new Date(),
        referencia: numeroFactura,
        usuario: req.user ? req.user.id : null,
        notas: notas || null
      });
      await movement.save({ session });

      const stockEntry = new StockEntry({
        producto: productoId,
        lote: batchDoc._id,
        cantidad,
        tipo: 'entrada',
        referencia: numeroFactura,
        factura: null,
        creadoPor: req.user ? req.user.id : null
      });
      await stockEntry.save({ session });

      createdItems.push({ producto: productoId, lote: batchDoc._id, cantidad, precioUnitario });
    }

    // Create PurchaseInvoice linking items to batches
    const invoice = new PurchaseInvoice({
      numeroFactura,
      proveedor: proveedorId,
      fecha: fecha || new Date(),
      total: payload.total || createdItems.reduce((s, it) => s + (it.cantidad * (it.precioUnitario || 0)), 0),
      items: createdItems.map(it => ({ producto: it.producto, lote: it.lote, cantidad: it.cantidad, precioUnitario: it.precioUnitario })),
      notas: notas || null
    });

    await invoice.save({ session });

    // Link facturaProveedor and fechaVencimiento in batches we created
    await Promise.all(createdItems.map(async (ci) => {
      await Batch.findByIdAndUpdate(ci.lote, { facturaProveedor: invoice._id }, { session });
    }));

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({ success: true, data: invoice });
  } catch (err) {
    try { await session.abortTransaction(); } catch (e) {}
    session.endSession();
    return next(err);
  }
};

// Create a purchase order (scheduling restock)
exports.createOrder = async (req, res, next) => {
  try {
    const payload = req.body || {};
    if (!payload.proveedor || !Array.isArray(payload.items) || payload.items.length === 0) {
      return res.status(400).json({ success: false, message: 'proveedor y items son obligatorios' });
    }

    const po = new PurchaseOrder({
      numeroOrden: payload.numeroOrden || `PO-${Date.now()}`,
      proveedor: payload.proveedor,
      fechaEntregaEsperada: payload.fechaEntregaEsperada || null,
      items: payload.items,
      notas: payload.notas || null,
      creadoPor: req.user ? req.user.id : null
    });
    await po.save();

    res.status(201).json({ success: true, data: po });
  } catch (err) {
    next(err);
  }
};

// Incoming stock (expected deliveries) - returns pending purchase orders with expected dates
exports.incoming = async (req, res, next) => {
  try {
    const now = new Date();
    const orders = await PurchaseOrder.find({ estado: 'pending', fechaEntregaEsperada: { $gte: now } }).populate('proveedor').sort({ fechaEntregaEsperada: 1 });
    res.json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    next(err);
  }
};

// Simple restock calendar entries (orders + batches arriving soon)
exports.restockCalendar = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const fromDate = from ? new Date(from) : new Date();
    const toDate = to ? new Date(to) : new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

    const orders = await PurchaseOrder.find({ fechaEntregaEsperada: { $gte: fromDate, $lte: toDate } }).populate('proveedor');
    const batches = await Batch.find({ fechaVencimiento: { $gte: fromDate, $lte: toDate } }).populate('producto proveedor');

    res.json({ success: true, period: { from: fromDate, to: toDate }, orders, batches });
  } catch (err) {
    next(err);
  }
};
