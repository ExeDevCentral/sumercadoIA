const express = require('express');
const router = express.Router();
const purchases = require('../controllers/purchases.controller');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

// Create purchase order (store expected delivery)
router.post('/orders', auth, requireRole('gerente'), purchases.createOrder);

// Register supplier invoice (creates batches, updates stock)
router.post('/invoice', auth, requireRole('gerente'), purchases.registerInvoice);

// Incoming expected deliveries / dashboard
router.get('/incoming', auth, requireRole('gerente'), purchases.incoming);

// Restock calendar (orders + batches)
router.get('/restock-calendar', auth, requireRole('gerente'), purchases.restockCalendar);

module.exports = router;
