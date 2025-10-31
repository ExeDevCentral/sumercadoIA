const express = require('express');
const router = express.Router();
const ventasCtrl = require('../controllers/ventas.controller');
const auth = require('../middleware/auth');
const { requireRole, requireAnyRole } = require('../middleware/roles');
const { validarPago } = require('../middleware/payment');
const { validateVentaCreate } = require('../middleware/validators');

router.get('/', auth, requireAnyRole(['gerente', 'supervisor', 'cajero']), ventasCtrl.listar);
router.post('/', auth, requireAnyRole(['gerente', 'supervisor', 'cajero']), validateVentaCreate, validarPago, ventasCtrl.crear);

module.exports = router;
