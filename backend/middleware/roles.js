// Flexible role-based middleware
// Usage:
//  const { requireRole, requireAnyRole } = require('../middleware/roles');
//  router.post('/', auth, requireRole('gerente'), handler);
//  router.post('/', auth, requireAnyRole(['gerente','supervisor']), handler);

const TOP_ROLE = 'gerente'; // gerente is considered top-level (bypass) by default

function toArray(val) {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

function requireRole(required) {
  const requiredRoles = toArray(required);

  return (req, res, next) => {
    if (!req.user || !req.user.rol) {
      return res.status(401).json({ success: false, message: 'No autorizado' });
    }

    const userRole = req.user.rol;

    // Top role bypasses all checks
    if (userRole === TOP_ROLE) return next();

    // If requiredRoles is empty, treat as authenticated-only
    if (requiredRoles.length === 0) return next();

    if (requiredRoles.includes(userRole)) return next();

    return res.status(403).json({ success: false, message: 'Permiso denegado' });
  };
}

function requireAnyRole(roles) {
  const rolesArr = toArray(roles);
  return requireRole(rolesArr);
}

module.exports = { requireRole, requireAnyRole };
