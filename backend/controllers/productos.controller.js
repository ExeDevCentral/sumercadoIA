const Producto = require('../models/Producto.model');
const audit = require('../utils/audit');

// Listar productos (paginación simple opcional)
exports.listar = async (req, res, next) => {
  try {
    const productos = await Producto.find().limit(100);
    res.json({ success: true, data: productos });
  } catch (err) {
    next(err);
  }
};

// Crear producto
exports.crear = async (req, res, next) => {
  try {
    const { codigo, nombre, categoria, precio, precioCompra, stock } = req.body;

    if (!codigo || !nombre || !categoria || precio == null || precioCompra == null || stock == null) {
      return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
    }

    const existente = await Producto.findOne({ codigo });
    if (existente) return res.status(409).json({ success: false, message: 'Código ya existe' });

    const producto = new Producto({ 
      codigo, 
      nombre, 
      categoria, 
      precio, 
      precioCompra, 
      stock,
      createdBy: req.user.id,
      updatedBy: req.user.id
    });
    
    await producto.save();
    
    // Registrar evento de auditoría
    const audit = require('../utils/audit');
    await audit.create('producto', {
      descripcion: `Producto ${nombre} (${codigo}) creado con precio ${precio}`,
      usuario: req.user,
      identificador: codigo
    });

    res.status(201).json({ success: true, data: producto });
  } catch (err) {
    next(err);
  }
};

// @desc    Obtener todos los productos
// @route   GET /api/productos
// @access  Public
exports.obtenerProductos = async (req, res) => {
  try {
    const { categoria, busqueda, estado, page = 1, limit = 10 } = req.query;
    
    let filtro = {};
    
    if (categoria) filtro.categoria = categoria;
    if (estado === 'bajo_stock') filtro.$expr = { $lte: ['$stock', '$stockMinimo'] };
    if (estado === 'agotado') filtro.stock = 0;
    if (busqueda) {
      filtro.$or = [
        { nombre: { $regex: busqueda, $options: 'i' } },
        { codigo: { $regex: busqueda, $options: 'i' } },
        { descripcion: { $regex: busqueda, $options: 'i' } }
      ];
    }
    
    const skip = (page - 1) * limit;
    
    const productos = await Producto.find(filtro)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    
    const total = await Producto.countDocuments(filtro);
    
    res.json({
      success: true,
      count: productos.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: productos
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener productos',
      error: error.message 
    });
  }
};

// @desc    Obtener producto por ID
// @route   GET /api/productos/:id
// @access  Public
exports.obtenerProductoPorId = async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id);
    
    if (!producto) {
      return res.status(404).json({ 
        success: false, 
        message: 'Producto no encontrado' 
      });
    }
    
    res.json({ 
      success: true, 
      data: producto 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener producto',
      error: error.message 
    });
  }
};

// @desc    Crear nuevo producto
// @route   POST /api/productos
// @access  Private
exports.crearProducto = async (req, res) => {
  try {
    // Añadir auditoría a la payload
    req.body.createdBy = req.user ? req.user.id : null;
    req.body.updatedBy = req.user ? req.user.id : null;

    const producto = await Producto.create(req.body);
    
    // Registrar auditoría
    await audit.create('producto', {
      descripcion: `Producto ${producto.nombre} creado con código ${producto.codigo}`,
      usuario: req.user || { id: 'system', email: 'system' },
      identificador: producto.codigo
    });

    res.status(201).json({ 
      success: true, 
      message: 'Producto creado exitosamente',
      data: producto 
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'El código del producto ya existe' 
      });
    }
    
    res.status(400).json({ 
      success: false, 
      message: 'Error al crear producto',
      error: error.message 
    });
  }
};

// @desc    Actualizar producto
// @route   PUT /api/productos/:id
// @access  Private
exports.actualizarProducto = async (req, res) => {
  try {
    // Añadir updatedBy
    const updatePayload = Object.assign({}, req.body, { updatedBy: req.user.id });

    const producto = await Producto.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true, runValidators: true }
    );
    
    if (!producto) {
      return res.status(404).json({ 
        success: false, 
        message: 'Producto no encontrado' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Producto actualizado exitosamente',
      data: producto 
    });

    // Auditoría de actualización
    await audit.update('producto', {
      descripcion: `Producto ${producto.nombre} actualizado`,
      usuario: req.user,
      identificador: producto._id
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      message: 'Error al actualizar producto',
      error: error.message 
    });
  }
};

// @desc    Eliminar producto
// @route   DELETE /api/productos/:id
// @access  Private
exports.eliminarProducto = async (req, res) => {
  try {
    const producto = await Producto.findByIdAndDelete(req.params.id);
    
    if (!producto) {
      return res.status(404).json({ 
        success: false, 
        message: 'Producto no encontrado' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Producto eliminado exitosamente' 
    });

    // Auditoría de eliminación
    await audit.delete('producto', {
      descripcion: `Producto ${producto.nombre} eliminado`,
      usuario: req.user,
      identificador: producto._id
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al eliminar producto',
      error: error.message 
    });
  }
};

// @desc    Actualizar stock del producto
// @route   PATCH /api/productos/:id/stock
// @access  Private
exports.actualizarStock = async (req, res) => {
  try {
    const { cantidad, operacion } = req.body; // operacion: 'sumar' o 'restar'
    
    const producto = await Producto.findById(req.params.id);
    
    if (!producto) {
      return res.status(404).json({ 
        success: false, 
        message: 'Producto no encontrado' 
      });
    }
    
    if (operacion === 'sumar') {
      producto.stock += cantidad;
    } else if (operacion === 'restar') {
      if (producto.stock < cantidad) {
        return res.status(400).json({ 
          success: false, 
          message: 'Stock insuficiente' 
        });
      }
      producto.stock -= cantidad;
    } else {
      producto.stock = cantidad;
    }
    
    await producto.save();
    
    res.json({ 
      success: true, 
      message: 'Stock actualizado exitosamente',
      data: producto 
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      message: 'Error al actualizar stock',
      error: error.message 
    });
  }
};

// @desc    Obtener productos con bajo stock
// @route   GET /api/productos/alertas/bajo-stock
// @access  Private
exports.obtenerProductosBajoStock = async (req, res) => {
  try {
    const productos = await Producto.find({
      $expr: { $lte: ['$stock', '$stockMinimo'] }
    }).sort({ stock: 1 });
    
    res.json({ 
      success: true, 
      count: productos.length,
      data: productos 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener productos con bajo stock',
      error: error.message 
    });
  }
};
