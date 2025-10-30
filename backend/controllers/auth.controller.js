const Empleado = require('../models/Empleado.model');
const jwt = require('jsonwebtoken');

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email y contraseña son requeridos' });

    const empleado = await Empleado.findOne({ email }).select('+password');
    if (!empleado) return res.status(401).json({ success: false, message: 'Credenciales inválidas' });

    const ok = await empleado.compararPassword(password);
    if (!ok) return res.status(401).json({ success: false, message: 'Credenciales inválidas' });

    const payload = { id: empleado._id, email: empleado.email, rol: empleado.rol };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'devsecret', { expiresIn: '8h' });

    res.json({ success: true, token, empleado: { id: empleado._id, nombre: empleado.nombre, apellidos: empleado.apellidos, rol: empleado.rol } });
  } catch (err) {
    next(err);
  }
};
const jwt = require('jsonwebtoken');
const Empleado = require('../models/Empleado.model');

// @desc    Login de empleado
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Por favor proporciona email y contraseña' 
      });
    }
    
    // Buscar empleado con password
    const empleado = await Empleado.findOne({ email, activo: true }).select('+password');
    
    if (!empleado) {
      return res.status(401).json({ 
        success: false, 
        message: 'Credenciales inválidas' 
      });
    }
    
    // Verificar password
    const isMatch = await empleado.compararPassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Credenciales inválidas' 
      });
    }
    
    // Generar token JWT
    const token = jwt.sign(
      { 
        id: empleado._id, 
        rol: empleado.rol,
        permisos: empleado.permisos 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );
    
    // Remover password de la respuesta
    empleado.password = undefined;
    
    res.json({ 
      success: true,
      message: 'Login exitoso',
      token,
      empleado: {
        id: empleado._id,
        nombre: empleado.nombreCompleto,
        email: empleado.email,
        rol: empleado.rol,
        permisos: empleado.permisos,
        foto: empleado.foto
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error en el login',
      error: error.message 
    });
  }
};

// @desc    Obtener perfil del empleado actual
// @route   GET /api/auth/me
// @access  Private
exports.obtenerPerfil = async (req, res) => {
  try {
    const empleado = await Empleado.findById(req.empleado.id).select('-password');
    
    res.json({ 
      success: true,
      data: empleado 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener perfil',
      error: error.message 
    });
  }
};

// @desc    Actualizar contraseña
// @route   PUT /api/auth/actualizar-password
// @access  Private
exports.actualizarPassword = async (req, res) => {
  try {
    const { passwordActual, passwordNuevo } = req.body;
    
    if (!passwordActual || !passwordNuevo) {
      return res.status(400).json({ 
        success: false, 
        message: 'Por favor proporciona la contraseña actual y la nueva' 
      });
    }
    
    const empleado = await Empleado.findById(req.empleado.id).select('+password');
    
    // Verificar password actual
    const isMatch = await empleado.compararPassword(passwordActual);
    
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Contraseña actual incorrecta' 
      });
    }
    
    // Actualizar password
    empleado.password = passwordNuevo;
    await empleado.save();
    
    res.json({ 
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al actualizar contraseña',
      error: error.message 
    });
  }
};
