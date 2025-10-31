// Cleaned auth controller: login, obtenerPerfil, actualizarPassword
const Empleado = require('../models/Empleado.model');
const jwt = require('jsonwebtoken');

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email y contraseña son requeridos' });

    const empleado = await Empleado.findOne({ email, activo: true }).select('+password');
    if (!empleado) return res.status(401).json({ success: false, message: 'Credenciales inválidas' });

    const ok = await empleado.compararPassword(password);
    if (!ok) return res.status(401).json({ success: false, message: 'Credenciales inválidas' });

    const payload = { id: empleado._id, email: empleado.email, rol: empleado.rol };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'devsecret', { expiresIn: process.env.JWT_EXPIRE || '8h' });

    empleado.password = undefined;

    res.json({ success: true, token, empleado: { id: empleado._id, nombre: empleado.nombreCompleto || `${empleado.nombre} ${empleado.apellidos}`, email: empleado.email, rol: empleado.rol } });
  } catch (err) {
    next(err);
  }
};

exports.obtenerPerfil = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.empleado?.id;
    const empleado = await Empleado.findById(userId).select('-password');
    res.json({ success: true, data: empleado });
  } catch (err) {
    next(err);
  }
};

exports.actualizarPassword = async (req, res, next) => {
  try {
    const { passwordActual, passwordNuevo } = req.body;
    if (!passwordActual || !passwordNuevo) return res.status(400).json({ success: false, message: 'Por favor proporciona la contraseña actual y la nueva' });

    const empleado = await Empleado.findById(req.user?.id).select('+password');
    if (!empleado) return res.status(404).json({ success: false, message: 'Empleado no encontrado' });

    const isMatch = await empleado.compararPassword(passwordActual);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Contraseña actual incorrecta' });

    empleado.password = passwordNuevo;
    await empleado.save();
    res.json({ success: true, message: 'Contraseña actualizada exitosamente' });
  } catch (err) {
    next(err);
  }
};
