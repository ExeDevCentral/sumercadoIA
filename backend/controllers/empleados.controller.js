const Empleado = require('../models/Empleado.model');
const audit = require('../utils/audit');

// Listar empleados
exports.listar = async (req, res, next) => {
  try {
    const empleados = await Empleado.find().select('-password').limit(200);
    res.json({ success: true, data: empleados });
  } catch (err) {
    next(err);
  }
};

// Crear empleado (cuidado: en producción esto debería estar protegido y validado)
exports.crear = async (req, res, next) => {
  try {
    const { nombre, apellidos, email, password, dni, telefono, salario, rol } = req.body;
    if (!nombre || !apellidos || !email || !password || !dni || !telefono || salario == null) {
      return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
    }

    const existente = await Empleado.findOne({ email });
    if (existente) return res.status(409).json({ success: false, message: 'Email ya registrado' });

    // Añadir campos de auditoría
    const empleado = new Empleado({ nombre, apellidos, email, password, dni, telefono, salario, rol, createdBy: req.user.id, updatedBy: req.user.id });
    await empleado.save();
    const obj = empleado.toObject();
    delete obj.password;

    // Registrar auditoría
    await audit.create('empleado', {
      descripcion: `Empleado ${empleado.nombreCompleto} creado`,
      usuario: req.user,
      identificador: empleado._id
    });

    res.status(201).json({ success: true, data: obj });
  } catch (err) {
    next(err);
  }
};
const Empleado = require('../models/Empleado.model');

// @desc    Obtener todos los empleados
// @route   GET /api/empleados
// @access  Private
exports.obtenerEmpleados = async (req, res) => {
  try {
    const { rol, activo, page = 1, limit = 20 } = req.query;
    
    let filtro = {};
    
    if (rol) filtro.rol = rol;
    if (activo !== undefined) filtro.activo = activo === 'true';
    
    const skip = (page - 1) * limit;
    
    const empleados = await Empleado.find(filtro)
      .select('-password')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    
    const total = await Empleado.countDocuments(filtro);
    
    res.json({
      success: true,
      count: empleados.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: empleados
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener empleados',
      error: error.message 
    });
  }
};

// @desc    Obtener empleado por ID
// @route   GET /api/empleados/:id
// @access  Private
exports.obtenerEmpleadoPorId = async (req, res) => {
  try {
    const empleado = await Empleado.findById(req.params.id).select('-password');
    
    if (!empleado) {
      return res.status(404).json({ 
        success: false, 
        message: 'Empleado no encontrado' 
      });
    }
    
    res.json({ 
      success: true, 
      data: empleado 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener empleado',
      error: error.message 
    });
  }
};

// @desc    Crear nuevo empleado
// @route   POST /api/empleados
// @access  Private (Admin)
exports.crearEmpleado = async (req, res) => {
  try {
    // Añadir auditoría a la payload
    req.body.createdBy = req.user ? req.user.id : null;
    req.body.updatedBy = req.user ? req.user.id : null;

    const empleado = await Empleado.create(req.body);
    
    // Remover password de la respuesta
    empleado.password = undefined;

    // Registrar auditoría
    await audit.create('empleado', {
      descripcion: `Empleado ${empleado.nombreCompleto} creado via API`,
      usuario: req.user || { id: 'system', email: 'system' },
      identificador: empleado._id
    });

    res.status(201).json({ 
      success: true, 
      message: 'Empleado registrado exitosamente',
      data: empleado 
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
      message: 'Error al crear empleado',
      error: error.message 
    });
  }
};

// @desc    Actualizar empleado
// @route   PUT /api/empleados/:id
// @access  Private (Admin)
exports.actualizarEmpleado = async (req, res) => {
  try {
    // No permitir actualizar password desde aquí
    delete req.body.password;
    
    // Añadir updatedBy
    const updatePayload = Object.assign({}, req.body, { updatedBy: req.user.id });

    const empleado = await Empleado.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!empleado) {
      return res.status(404).json({ 
        success: false, 
        message: 'Empleado no encontrado' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Empleado actualizado exitosamente',
      data: empleado 
    });
    // Auditoría de actualización
    await audit.update('empleado', {
      descripcion: `Empleado ${empleado.nombreCompleto} actualizado`,
      usuario: req.user,
      identificador: empleado._id
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      message: 'Error al actualizar empleado',
      error: error.message 
    });
  }
};

// @desc    Eliminar empleado (desactivar)
// @route   DELETE /api/empleados/:id
// @access  Private (Admin)
exports.eliminarEmpleado = async (req, res) => {
  try {
    const empleado = await Empleado.findByIdAndUpdate(
      req.params.id,
      { activo: false },
      { new: true }
    ).select('-password');
    
    if (!empleado) {
      return res.status(404).json({ 
        success: false, 
        message: 'Empleado no encontrado' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Empleado desactivado exitosamente',
      data: empleado 
    });
    // Auditoría de eliminación (desactivación)
    await audit.delete('empleado', {
      descripcion: `Empleado ${empleado.nombreCompleto} desactivado`,
      usuario: req.user,
      identificador: empleado._id
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al eliminar empleado',
      error: error.message 
    });
  }
};

// @desc    Registrar turno de empleado
// @route   POST /api/empleados/:id/turnos
// @access  Private
exports.registrarTurno = async (req, res) => {
  try {
    const empleado = await Empleado.findById(req.params.id);
    
    if (!empleado) {
      return res.status(404).json({ 
        success: false, 
        message: 'Empleado no encontrado' 
      });
    }
    
    empleado.turnos.push(req.body);
    await empleado.save();
    
    res.json({ 
      success: true, 
      message: 'Turno registrado exitosamente',
      data: empleado 
    });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      message: 'Error al registrar turno',
      error: error.message 
    });
  }
};

// @desc    Obtener rendimiento de empleado
// @route   GET /api/empleados/:id/rendimiento
// @access  Private
exports.obtenerRendimiento = async (req, res) => {
  try {
    const empleado = await Empleado.findById(req.params.id).select('nombre apellidos rol rendimiento');
    
    if (!empleado) {
      return res.status(404).json({ 
        success: false, 
        message: 'Empleado no encontrado' 
      });
    }
    
    const Venta = require('../models/Venta.model');
    
    // Obtener ventas del mes actual
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);
    
    const ventasMes = await Venta.find({
      empleado: empleado._id,
      createdAt: { $gte: inicioMes },
      estado: 'completada'
    });
    
    const ventasMesTotal = ventasMes.reduce((sum, venta) => sum + venta.total, 0);
    const diasTrabajados = new Set(ventasMes.map(v => v.createdAt.toDateString())).size;
    
    const promedioDiario = diasTrabajados > 0 ? ventasMesTotal / diasTrabajados : 0;
    
    res.json({ 
      success: true,
      data: {
        empleado: {
          nombre: empleado.nombreCompleto,
          rol: empleado.rol
        },
        rendimientoTotal: empleado.rendimiento,
        rendimientoMesActual: {
          ventasRealizadas: ventasMes.length,
          totalVendido: ventasMesTotal,
          promedioDiario: promedioDiario.toFixed(2),
          diasTrabajados
        }
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener rendimiento',
      error: error.message 
    });
  }
};
