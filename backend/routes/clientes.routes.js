const express = require('express');
const router = express.Router();
const clientesCtrl = require('../controllers/clientes.controller');
const auth = require('../middleware/auth');
const { requireRole, requireAnyRole } = require('../middleware/roles');
const { validateClienteCreate } = require('../middleware/validators');

router.get('/', auth, requireAnyRole(['gerente', 'supervisor', 'cajero']), clientesCtrl.listar);
router.post('/', auth, requireAnyRole(['gerente', 'supervisor']), validateClienteCreate, clientesCtrl.crear);

module.exports = router;
