const { body, param, check, validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Middleware to return validation errors
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

// Common validators
const isMongoId = (value) => mongoose.Types.ObjectId.isValid(value);

// Auth validators
const validateLogin = [
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  handleValidation
];

// Employee validators
const validateEmpleadoCreate = [
  body('nombre').trim().notEmpty().withMessage('Nombre obligatorio').escape(),
  body('apellidos').trim().notEmpty().withMessage('Apellidos obligatorios').escape(),
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('dni').trim().notEmpty().withMessage('DNI obligatorio').escape(),
  body('telefono').trim().notEmpty().withMessage('Teléfono obligatorio').escape(),
  body('salario').isFloat({ min: 0 }).withMessage('Salario debe ser un número >= 0'),
  body('rol').isIn(['gerente','cajero','reponedor','supervisor','limpieza','carnicero','panadero']).withMessage('Rol inválido'),
  handleValidation
];

// Cliente validators
const validateClienteCreate = [
  body('nombre').trim().notEmpty().withMessage('Nombre obligatorio').escape(),
  body('apellidos').trim().notEmpty().withMessage('Apellidos obligatorios').escape(),
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
  body('telefono').trim().notEmpty().withMessage('Teléfono obligatorio').escape(),
  body('dni').optional().trim().escape(),
  handleValidation
];

// Producto validators
const validateProductoCreate = [
  body('codigo').trim().notEmpty().withMessage('Código obligatorio').escape(),
  body('nombre').trim().notEmpty().withMessage('Nombre obligatorio').escape(),
  body('categoria').isIn(['alimentos','bebidas','limpieza','higiene','panaderia','carniceria','pescaderia','fruteria','congelados','otros']).withMessage('Categoría inválida'),
  body('precio').isFloat({ gt: 0 }).withMessage('Precio debe ser mayor que 0'),
  body('precioCompra').isFloat({ gt: 0 }).withMessage('Precio de compra debe ser mayor que 0'),
  body('stock').isInt({ min: 0 }).withMessage('Stock debe ser entero >= 0'),
  handleValidation
];

// Venta (caja) validators
const validateVentaCreate = [
  body('items').isArray({ min: 1 }).withMessage('La venta debe incluir al menos un item'),
  body('items.*.producto').custom((value) => {
    if (!isMongoId(value)) throw new Error('Producto ID inválido');
    return true;
  }),
  body('items.*.cantidad').isInt({ gt: 0 }).withMessage('Cantidad debe ser entero > 0'),
  body('items.*.precioUnitario').isFloat({ gt: 0 }).withMessage('Precio unitario debe ser > 0'),
  body('subtotal').isFloat({ gt: -1 }).withMessage('Subtotal inválido'),
  body('total').isFloat({ gt: 0 }).withMessage('Total debe ser mayor que 0'),
  body('metodoPago').isIn(['efectivo','tarjeta','transferencia','mixto']).withMessage('Método de pago inválido'),
  // Consistencia: los subtotales de items deben sumar el subtotal y total debe coincidir considerando impuestos/iva
  body().custom((value, { req }) => {
    try {
      const items = req.body.items || [];
      const providedSubtotal = Number(req.body.subtotal || 0);
      const providedImpuestos = req.body.impuestos != null ? Number(req.body.impuestos) : (req.body.iva != null ? (providedSubtotal * (Number(req.body.iva) / 100)) : 0);
      const providedTotal = Number(req.body.total || 0);

      // Calcular subtotal a partir de items
      const computedSubtotal = items.reduce((acc, it) => {
        const cantidad = Number(it.cantidad || 0);
        const precio = Number(it.precioUnitario || 0);
        return acc + (cantidad * precio);
      }, 0);

      // Comparaciones tolerantes: si números enteros (centimos) deben coincidir exactamente; permitimos tolerancia de 1 unidad
      const tol = 1;
      if (Math.abs(computedSubtotal - providedSubtotal) > tol) {
        throw new Error(`Subtotal inconsistente: items suman ${computedSubtotal} pero se indicó ${providedSubtotal}`);
      }

      // Determinar total esperado
      const expectedTotal = providedSubtotal + providedImpuestos;
      if (Math.abs(expectedTotal - providedTotal) > tol) {
        throw new Error(`Total inconsistente: subtotal + impuestos = ${expectedTotal} pero se indicó ${providedTotal}`);
      }

      return true;
    } catch (err) {
      throw err;
    }
  }),
  handleValidation
];

// Param validators
const validateIdParam = (paramName = 'id') => [
  param(paramName).custom((value) => {
    if (!isMongoId(value)) throw new Error('ID inválido');
    return true;
  }),
  handleValidation
];

module.exports = {
  validateLogin,
  validateEmpleadoCreate,
  validateClienteCreate,
  validateProductoCreate,
  validateVentaCreate,
  validateIdParam,
  handleValidation
};