const Batch = require('../models/Batch.model');
const ExpirationAlert = require('../models/ExpirationAlert.model');
const Producto = require('../models/Producto.model');

// Buckets and alert level rules
const BUCKETS = [1,3,7,14,30];

function computeAlertLevel(daysLeft) {
  if (daysLeft <= 3) return 'critical';
  if (daysLeft >=4 && daysLeft <= 14) return 'warning';
  if (daysLeft >=15 && daysLeft <= 30) return 'info';
  return 'none';
}

// GET /api/expirations?alertLevel=&supplierId=&categoryId=&bucket=&page=&limit=
async function listExpirations(req, res, next) {
  try {
    const { alertLevel, supplierId, categoryId, bucket, page = 1, limit = 25 } = req.query;
    const now = new Date();
    const maxDays = 30;
    const endDate = new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000);

    const filter = {
      expirationDate: { $gte: now, $lte: endDate },
      quantityRemaining: { $gt: 0 }
    };

    if (supplierId) filter.supplier = supplierId;

    // If categoryId provided filter by product category
    if (categoryId) {
      const prods = await Producto.find({ categoria: categoryId }).select('_id').lean();
      filter.productId = { $in: prods.map(p => p._id) };
    }

    // Optionally filter by bucket
    if (bucket) {
      const days = parseInt(bucket, 10);
      if (!isNaN(days)) {
        const from = new Date(now.getTime());
        const to = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        filter.expirationDate = { $gte: from, $lte: to };
      }
    }

    // Pagination
    const skip = (parseInt(page,10)-1) * parseInt(limit,10);
    const batches = await Batch.find(filter)
      .sort({ expirationDate: 1 })
      .skip(skip)
      .limit(parseInt(limit,10))
      .populate('productId', 'nombre codigo')
      .populate('supplier', 'nombre');

    // Attach computed fields
    const results = batches.map(b => {
      const daysLeft = b.daysLeft;
      return {
        _id: b._id,
        product: b.productId,
        batchCode: b.batchCode,
        expirationDate: b.expirationDate,
        daysLeft,
        alertLevel: computeAlertLevel(daysLeft),
        quantityRemaining: b.quantityRemaining,
        location: b.location,
        supplier: b.supplier
      };
    });

    // If alertLevel filter applied
    const filtered = alertLevel ? results.filter(r => r.alertLevel === alertLevel) : results;

    res.json({ success: true, data: filtered });
  } catch (err) {
    next(err);
  }
}

// POST /api/expirations/scan  -> trigger immediate scan (protected endpoint in production)
async function scanExpirations(req, res, next) {
  try {
    const now = new Date();
    const maxDays = 30;
    const endDate = new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000);

    const batches = await Batch.find({ expirationDate: { $gte: now, $lte: endDate }, quantityRemaining: { $gt: 0 } })
      .populate('productId', 'nombre codigo categoria')
      .populate('supplier', 'nombre')
      .lean();

    const ops = [];

    for (const b of batches) {
      const daysLeft = Math.ceil((new Date(b.expirationDate).getTime() - now.getTime()) / (1000*60*60*24));
      const level = computeAlertLevel(daysLeft);

      // Upsert into ExpirationAlert
      ops.push(ExpirationAlert.findOneAndUpdate(
        { batchId: b._id },
        {
          productId: b.productId?._id || b.productId,
          batchId: b._id,
          batchCode: b.batchCode,
          supplier: b.supplier?._id || b.supplier,
          expirationDate: b.expirationDate,
          daysLeft,
          alertLevel: level,
          quantityRemaining: b.quantityRemaining,
          location: b.location,
          metadata: { scannedAt: now }
        },
        { upsert: true, new: true }
      ));
    }

    await Promise.all(ops);

    res.json({ success: true, message: `Scanned ${batches.length} batches`, count: batches.length });
  } catch (err) {
    next(err);
  }
}

// GET /api/expirations/alerts
async function listAlerts(req, res, next) {
  try {
    const { alertLevel, acknowledged = false, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (alertLevel) filter.alertLevel = alertLevel;
    if (acknowledged !== undefined) filter.acknowledged = acknowledged === 'true' || acknowledged === true;

    const skip = (parseInt(page,10)-1) * parseInt(limit,10);
    const alerts = await ExpirationAlert.find(filter).sort({ alertLevel: 1, daysLeft: 1 }).skip(skip).limit(parseInt(limit,10)).lean();
    res.json({ success: true, data: alerts });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listExpirations,
  scanExpirations,
  listAlerts
};
