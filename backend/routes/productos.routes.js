const express = require('express');
const router = express.Router();
const productosCtrl = require('../controllers/productos.controller');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { validateProductoCreate } = require('../middleware/validators');

// Rutas públicas mínimas para productos
router.get('/', productosCtrl.listar);
router.post('/', auth, requireRole('gerente'), validateProductoCreate, productosCtrl.crear);

// Operaciones por ID
const { validateIdParam } = require('../middleware/validators');
router.get('/:id', validateIdParam('id'), productosCtrl.obtenerProductoPorId);
router.put('/:id', auth, requireRole('gerente'), validateIdParam('id'), validateProductoCreate, productosCtrl.actualizarProducto);
router.delete('/:id', auth, requireRole('gerente'), validateIdParam('id'), productosCtrl.eliminarProducto);
router.patch('/:id/stock', auth, requireRole('gerente'), validateIdParam('id'), productosCtrl.actualizarStock);

module.exports = router;
