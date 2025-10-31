const express = require('express');
const router = express.Router();
const empleadosCtrl = require('../controllers/empleados.controller');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { validateEmpleadoCreate } = require('../middleware/validators');

router.get('/', empleadosCtrl.listar);
router.post('/', auth, requireRole('gerente'), validateEmpleadoCreate, empleadosCtrl.crear);

// ID routes
const { validateIdParam } = require('../middleware/validators');
router.get('/:id', validateIdParam('id'), empleadosCtrl.obtenerEmpleadoPorId);
router.put('/:id', auth, requireRole('gerente'), validateIdParam('id'), empleadosCtrl.actualizarEmpleado);
router.delete('/:id', auth, requireRole('gerente'), validateIdParam('id'), empleadosCtrl.eliminarEmpleado);

module.exports = router;
