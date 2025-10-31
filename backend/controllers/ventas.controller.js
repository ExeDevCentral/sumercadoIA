const Venta = require('../models/Venta.model');
const Producto = require('../models/Producto.model');
const Batch = require('../models/Batch.model');
const audit = require('../utils/audit');

// Listar ventas (recientes)
exports.listar = async (req, res, next) => {
  try {
    const ventas = await Venta.find().sort({ createdAt: -1 }).limit(100).populate('empleado cliente items.producto');
    res.json({ success: true, data: ventas });
  } catch (err) {
    next(err);
  }
};

// Crear venta (maneja lotes cuando se proporciona batchId en items)
exports.crear = async (req, res, next) => {
  try {
    const { items, metodoPago, detallesPago, cliente, empleado, notas } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'La venta debe incluir al menos un item' });
    }

    // Validar stock y calcular totales
    let subtotal = 0;
    const itemsConDetalles = [];

    for (const item of items) {
      const producto = await Producto.findById(item.producto);
      if (!producto) {
        return res.status(404).json({ success: false, message: `Producto ${item.producto} no encontrado` });
      }

      // Determine current stock field (support legacy 'stock' and new 'stockActual')
      const currentStock = (typeof producto.stockActual === 'number') ? producto.stockActual : (typeof producto.stock === 'number' ? producto.stock : 0);
      if (currentStock < item.cantidad) {
        return res.status(400).json({ success: false, message: `Stock insuficiente para ${producto.nombre}. Disponible: ${currentStock}` });
      }

      // Determine unit price (support precioVenta or precio)
      const precioUnitario = producto.precioVenta ?? producto.precio ?? 0;
      const subtotalItem = precioUnitario * item.cantidad;

      // If batch specified, decrement batch quantity
      let batchRef = null;
      let batchCode = null;
      if (item.batchId) {
        const batch = await Batch.findById(item.batchId);
        if (!batch) {
          return res.status(404).json({ success: false, message: `Lote ${item.batchId} no encontrado` });
        }
        if (batch.quantityRemaining < item.cantidad) {
          return res.status(400).json({ success: false, message: `Cantidad insuficiente en lote ${batch.batchCode}. Disponible: ${batch.quantityRemaining}` });
        }
        // decrement batch
        batch.quantityRemaining -= item.cantidad;
        await batch.save();
        batchRef = batch._id;
        batchCode = batch.batchCode;
      }

      // Decrement product stock (prefer stockActual)
      if (typeof producto.stockActual === 'number') {
        producto.stockActual -= item.cantidad;
      } else if (typeof producto.stock === 'number') {
        producto.stock -= item.cantidad;
      }
      await producto.save();

      itemsConDetalles.push({
        producto: producto._id,
        batch: batchRef,
        batchCode,
        nombreProducto: producto.nombre,
        cantidad: item.cantidad,
        precioUnitario,
        subtotal: subtotalItem
      });

      subtotal += subtotalItem;
    }

    const iva = process.env.IVA_PERCENTAGE || 21;
    const impuestos = subtotal * (iva / 100);
    const total = subtotal + impuestos;

    // Crear venta
    const venta = await Venta.create({
      items: itemsConDetalles,
      subtotal,
      iva,
      impuestos,
      total,
      metodoPago,
      detallesPago,
      cliente: cliente || null,
      empleado,
      notas,
      createdBy: req.user?.id,
      updatedBy: req.user?.id
    });

    // Registro de auditoría
    await audit.create('venta', {
      descripcion: `Venta #${venta.numeroTicket} por ${total} (${metodoPago})`,
      usuario: req.user,
      identificador: venta.numeroTicket
    });

    const ventaCompleta = await Venta.findById(venta._id)
      .populate('empleado', 'nombre apellidos')
      .populate('cliente', 'nombre apellidos')
      .populate('items.producto', 'nombre codigo')
      .populate('items.batch', 'batchCode expirationDate');

    res.status(201).json({ success: true, message: 'Venta registrada exitosamente', data: ventaCompleta });
  } catch (err) {
    next(err);
  }
};
const Cliente = require('../models/Cliente.model');
const Empleado = require('../models/Empleado.model');

// @desc    Obtener todas las ventas
// @route   GET /api/ventas
// @access  Private
exports.obtenerVentas = async (req, res) => {
  try {
    const { fechaInicio, fechaFin, empleado, cliente, estado, page = 1, limit = 20 } = req.query;
    
    let filtro = {};
    
    if (fechaInicio && fechaFin) {
      filtro.createdAt = {
        $gte: new Date(fechaInicio),
        $lte: new Date(fechaFin)
      };
    }
    
    if (empleado) filtro.empleado = empleado;
    if (cliente) filtro.cliente = cliente;
    if (estado) filtro.estado = estado;
    
    const skip = (page - 1) * limit;
    
    const ventas = await Venta.find(filtro)
      .populate('empleado', 'nombre apellidos rol')
      .populate('cliente', 'nombre apellidos email')
      .populate('items.producto', 'nombre codigo')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    
    const total = await Venta.countDocuments(filtro);
    
    res.json({
      success: true,
      count: ventas.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: ventas
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener ventas',
      error: error.message 
    });
  }
};

// @desc    Obtener venta por ID
// @route   GET /api/ventas/:id
// @access  Private
exports.obtenerVentaPorId = async (req, res) => {
  try {
    const venta = await Venta.findById(req.params.id)
      .populate('empleado', 'nombre apellidos rol')
      .populate('cliente', 'nombre apellidos email telefono')
      .populate('items.producto', 'nombre codigo categoria');
    
    if (!venta) {
      return res.status(404).json({ 
        success: false, 
        message: 'Venta no encontrada' 
      });
    }
    
    res.json({ 
      success: true, 
      data: venta 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener venta',
      error: error.message 
    });
  }
};

// @desc    Crear nueva venta
// @route   POST /api/ventas
// @access  Private
exports.crearVenta = async (req, res) => {
  try {
    const { items, metodoPago, detallesPago, cliente, empleado, notas } = req.body;
    
    // Validar que hay items
    if (!items || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'La venta debe tener al menos un producto' 
      });
    }
    
    // Validar stock y calcular totales
    let subtotal = 0;
    const itemsConDetalles = [];
    
    for (const item of items) {
      const producto = await Producto.findById(item.producto);
      
      if (!producto) {
        return res.status(404).json({ 
          success: false, 
          message: `Producto ${item.producto} no encontrado` 
        });
      }
      
      if (producto.stock < item.cantidad) {
        return res.status(400).json({ 
          success: false, 
          message: `Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock}` 
        });
      }
      
      const precioUnitario = producto.precio;
      const subtotalItem = precioUnitario * item.cantidad;
      
      itemsConDetalles.push({
        producto: producto._id,
        nombreProducto: producto.nombre,
        cantidad: item.cantidad,
        precioUnitario,
        subtotal: subtotalItem
      });
      
      subtotal += subtotalItem;
      
      // Reducir stock
      producto.stock -= item.cantidad;
      await producto.save();
    }
    
    // Calcular impuestos y total
    const iva = process.env.IVA_PERCENTAGE || 21;
    const impuestos = subtotal * (iva / 100);
    const total = subtotal + impuestos;
    
    // Crear venta
    const venta = await Venta.create({
      items: itemsConDetalles,
      subtotal,
      iva,
      impuestos,
      total,
      metodoPago,
      detallesPago,
      cliente: cliente || null,
      empleado,
      notas
    });
    
    // Actualizar historial del cliente si existe
    if (cliente) {
      await Cliente.findByIdAndUpdate(cliente, {
        $push: {
          historialCompras: {
            venta: venta._id,
            fecha: new Date(),
            total
          }
        },
        $inc: { puntos: Math.floor(total / 10) } // 1 punto por cada 10€
      });
    }
    
    // Actualizar rendimiento del empleado
    await Empleado.findByIdAndUpdate(empleado, {
      $inc: {
        'rendimiento.ventasRealizadas': 1,
        'rendimiento.totalVendido': total
      }
    });
    
    const ventaCompleta = await Venta.findById(venta._id)
      .populate('empleado', 'nombre apellidos')
      .populate('cliente', 'nombre apellidos')
      .populate('items.producto', 'nombre codigo');
    
    res.status(201).json({ 
      success: true, 
      message: 'Venta registrada exitosamente',
      data: ventaCompleta 
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      message: 'Error al crear venta',
      error: error.message 
    });
  }
};

// @desc    Cancelar venta
// @route   PATCH /api/ventas/:id/cancelar
// @access  Private
exports.cancelarVenta = async (req, res) => {
  try {
    const venta = await Venta.findById(req.params.id);
    
    if (!venta) {
      return res.status(404).json({ 
        success: false, 
        message: 'Venta no encontrada' 
      });
    }
    
    if (venta.estado === 'cancelada') {
      return res.status(400).json({ 
        success: false, 
        message: 'La venta ya está cancelada' 
      });
    }
    
    // Devolver stock
    for (const item of venta.items) {
      // Restore product stock
      const producto = await Producto.findById(item.producto);
      if (producto) {
        if (typeof producto.stockActual === 'number') {
          producto.stockActual += item.cantidad;
        } else if (typeof producto.stock === 'number') {
          producto.stock += item.cantidad;
        }
        await producto.save();
      }

      // If sale item referenced a batch, restore batch quantityRemaining
      if (item.batch) {
        try {
          const batch = await Batch.findById(item.batch);
          if (batch) {
            batch.quantityRemaining += item.cantidad;
            await batch.save();
          }
        } catch (err) {
          // Non-fatal: continue
          console.warn('Error restaurando lote:', err.message);
        }
      }
    }
    
    venta.estado = 'cancelada';
    await venta.save();
    
    res.json({ 
      success: true, 
      message: 'Venta cancelada exitosamente',
      data: venta 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al cancelar venta',
      error: error.message 
    });
  }
};

// @desc    Obtener ventas del día
// @route   GET /api/ventas/reportes/dia
// @access  Private
exports.obtenerVentasDelDia = async (req, res) => {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const mañana = new Date(hoy);
    mañana.setDate(mañana.getDate() + 1);
    
    const ventas = await Venta.find({
      createdAt: { $gte: hoy, $lt: mañana },
      estado: 'completada'
    }).populate('empleado', 'nombre apellidos');
    
    const totalVentas = ventas.length;
    const totalIngresos = ventas.reduce((sum, venta) => sum + venta.total, 0);
    
    res.json({ 
      success: true, 
      fecha: hoy,
      totalVentas,
      totalIngresos,
      data: ventas 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener ventas del día',
      error: error.message 
    });
  }
};
