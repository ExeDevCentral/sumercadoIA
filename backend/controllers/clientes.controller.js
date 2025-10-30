const Cliente = require('../models/Cliente.model');

// Listar clientes
exports.listar = async (req, res, next) => {
  try {
    const clientes = await Cliente.find().limit(200);
    res.json({ success: true, data: clientes });
  } catch (err) {
    next(err);
  }
};

// Crear cliente
exports.crear = async (req, res, next) => {
  try {
    const { nombre, apellidos, email, telefono } = req.body;
    if (!nombre || !apellidos || !email || !telefono) {
      return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
    }

    const existente = await Cliente.findOne({ email });
    if (existente) return res.status(409).json({ success: false, message: 'Email ya registrado' });

    const cliente = new Cliente(req.body);
    await cliente.save();
    res.status(201).json({ success: true, data: cliente });
  } catch (err) {
    next(err);
  }
};
const Cliente = require('../models/Cliente.model');
const Venta = require('../models/Venta.model');

// @desc    Obtener todos los clientes
// @route   GET /api/clientes
// @access  Private
exports.obtenerClientes = async (req, res) => {
  try {
    const { busqueda, nivel, page = 1, limit = 20 } = req.query;
    
    let filtro = { activo: true };
    
    if (nivel) filtro.nivel = nivel;
    if (busqueda) {
      filtro.$or = [
        { nombre: { $regex: busqueda, $options: 'i' } },
        { apellidos: { $regex: busqueda, $options: 'i' } },
        { email: { $regex: busqueda, $options: 'i' } },
        { dni: { $regex: busqueda, $options: 'i' } }
      ];
    }
    
    const skip = (page - 1) * limit;
    
    const clientes = await Cliente.find(filtro)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    
    const total = await Cliente.countDocuments(filtro);
    
    res.json({
      success: true,
      count: clientes.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: clientes
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener clientes',
      error: error.message 
    });
  }
};

// @desc    Obtener cliente por ID
// @route   GET /api/clientes/:id
// @access  Private
exports.obtenerClientePorId = async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    
    if (!cliente) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cliente no encontrado' 
      });
    }
    
    res.json({ 
      success: true, 
      data: cliente 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener cliente',
      error: error.message 
    });
  }
};

// @desc    Crear nuevo cliente
// @route   POST /api/clientes
// @access  Private
exports.crearCliente = async (req, res) => {
  try {
    const cliente = await Cliente.create(req.body);
    
    res.status(201).json({ 
      success: true, 
      message: 'Cliente registrado exitosamente',
      data: cliente 
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'El email o DNI ya está registrado' 
      });
    }
    
    res.status(400).json({ 
      success: false, 
      message: 'Error al crear cliente',
      error: error.message 
    });
  }
};

// @desc    Actualizar cliente
// @route   PUT /api/clientes/:id
// @access  Private
exports.actualizarCliente = async (req, res) => {
  try {
    const cliente = await Cliente.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!cliente) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cliente no encontrado' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Cliente actualizado exitosamente',
      data: cliente 
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      message: 'Error al actualizar cliente',
      error: error.message 
    });
  }
};

// @desc    Eliminar cliente (desactivar)
// @route   DELETE /api/clientes/:id
// @access  Private
exports.eliminarCliente = async (req, res) => {
  try {
    const cliente = await Cliente.findByIdAndUpdate(
      req.params.id,
      { activo: false },
      { new: true }
    );
    
    if (!cliente) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cliente no encontrado' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Cliente desactivado exitosamente',
      data: cliente 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al eliminar cliente',
      error: error.message 
    });
  }
};

// @desc    Obtener historial de compras del cliente
// @route   GET /api/clientes/:id/historial
// @access  Private
exports.obtenerHistorialCompras = async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id)
      .populate({
        path: 'historialCompras.venta',
        populate: { path: 'items.producto', select: 'nombre codigo' }
      });
    
    if (!cliente) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cliente no encontrado' 
      });
    }
    
    res.json({ 
      success: true, 
      data: cliente.historialCompras 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener historial',
      error: error.message 
    });
  }
};

// @desc    Obtener recomendaciones personalizadas
// @route   GET /api/clientes/:id/recomendaciones
// @access  Private
exports.obtenerRecomendaciones = async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);
    
    if (!cliente) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cliente no encontrado' 
      });
    }
    
    // Obtener ventas del cliente
    const ventas = await Venta.find({ cliente: cliente._id })
      .populate('items.producto')
      .limit(10);
    
    // Analizar productos más comprados
    const productosComprados = {};
    const categoriasCompradas = {};
    
    ventas.forEach(venta => {
      venta.items.forEach(item => {
        if (item.producto) {
          // Contar productos
          if (productosComprados[item.producto._id]) {
            productosComprados[item.producto._id].cantidad += item.cantidad;
          } else {
            productosComprados[item.producto._id] = {
              producto: item.producto,
              cantidad: item.cantidad
            };
          }
          
          // Contar categorías
          const categoria = item.producto.categoria;
          categoriasCompradas[categoria] = (categoriasCompradas[categoria] || 0) + 1;
        }
      });
    });
    
    // Obtener categorías favoritas
    const categoriasFavoritas = Object.entries(categoriasCompradas)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([categoria]) => categoria);
    
    // Actualizar preferencias del cliente
    cliente.preferencias.categoriasFavoritas = categoriasFavoritas;
    await cliente.save();
    
    // Buscar productos similares
    const Producto = require('../models/Producto.model');
    const recomendaciones = await Producto.find({
      categoria: { $in: categoriasFavoritas },
      activo: true,
      stock: { $gt: 0 }
    }).limit(10);
    
    res.json({ 
      success: true,
      categoriasFavoritas,
      recomendaciones
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener recomendaciones',
      error: error.message 
    });
  }
};

// @desc    Actualizar puntos del cliente
// @route   PATCH /api/clientes/:id/puntos
// @access  Private
exports.actualizarPuntos = async (req, res) => {
  try {
    const { puntos, operacion } = req.body;
    
    const cliente = await Cliente.findById(req.params.id);
    
    if (!cliente) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cliente no encontrado' 
      });
    }
    
    if (operacion === 'sumar') {
      cliente.puntos += puntos;
    } else if (operacion === 'restar') {
      cliente.puntos = Math.max(0, cliente.puntos - puntos);
    }
    
    cliente.actualizarNivel();
    await cliente.save();
    
    res.json({ 
      success: true, 
      message: 'Puntos actualizados exitosamente',
      data: cliente 
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      message: 'Error al actualizar puntos',
      error: error.message 
    });
  }
};
