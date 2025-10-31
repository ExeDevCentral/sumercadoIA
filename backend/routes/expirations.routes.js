const express = require('express');
const router = express.Router();
const controller = require('../controllers/expirations.controller');
const auth = require('../middleware/auth');
const { requireRole, requireAnyRole } = require('../middleware/roles');

// Public listing endpoints
router.get('/', controller.listExpirations);
router.get('/alerts', controller.listAlerts);

// Scan endpoint: only for authorized staff (gerente or supervisor)
router.post('/scan', auth, requireAnyRole(['gerente','supervisor']), controller.scanExpirations);

module.exports = router;
