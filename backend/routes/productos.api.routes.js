const express = require('express');
const router = express.Router();
const productosApi = require('../controllers/productos.api.controller');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

// Public listing/search with pagination
router.get('/', productosApi.list);
router.get('/search', productosApi.search);
router.get('/expiring', productosApi.expiring);
router.get('/low-stock', productosApi.lowStock);

// CRUD (protected)
router.post('/', auth, requireRole('gerente'), productosApi.create);
router.get('/:id', productosApi.getById);
router.put('/:id', auth, requireRole('gerente'), productosApi.update);
router.delete('/:id', auth, requireRole('gerente'), productosApi.remove);

module.exports = router;
