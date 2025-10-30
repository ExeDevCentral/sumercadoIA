const express = require('express');
const router = express.Router();
const productosCtrl = require('../controllers/productos.controller');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

// Rutas públicas mínimas para productos
router.get('/', productosCtrl.listar);
router.post('/', auth, requireRole('gerente'), productosCtrl.crear);

module.exports = router;
