const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const secret = process.env.JWT_SECRET || 'devsecret';
    const payload = jwt.verify(token, secret);
    req.user = payload; // { id, email, rol }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token inválido' });
  }
};
