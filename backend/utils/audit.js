const fs = require('fs').promises;
const path = require('path');

// Configuración de auditoría
const config = {
  logToConsole: true,
  logToFile: process.env.NODE_ENV === 'production',
  logPath: process.env.AUDIT_LOG_PATH || path.join(__dirname, '../logs/audit.log'),
};

/**
 * Registra una acción de auditoría
 * @param {Object} options Opciones de logging
 * @param {string} options.action Acción realizada (crear, modificar, eliminar)
 * @param {string} options.recurso Tipo de recurso (producto, empleado, venta, etc)
 * @param {string} options.descripcion Descripción detallada de la acción
 * @param {Object} options.usuario Usuario que realiza la acción
 * @param {string} options.identificador Identificador del recurso (código, ID, etc)
 */
async function logAuditEvent({ action, recurso, descripcion, usuario, identificador }) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    action,
    recurso,
    descripcion,
    usuario: {
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol
    },
    identificador
  };

  const logMessage = `[AUDIT] ${timestamp} | ${usuario.email} (${usuario.rol}) | ${action} ${recurso} | ${identificador} | ${descripcion}`;

  // Log a consola
  if (config.logToConsole) {
    console.log(logMessage);
  }

  // Log a archivo en producción
  if (config.logToFile) {
    try {
      await fs.appendFile(config.logPath, logMessage + '\n');
    } catch (err) {
      console.error('Error al escribir log de auditoría:', err);
    }
  }
}

// Helpers para acciones comunes
const audit = {
  async create(recurso, { descripcion, usuario, identificador }) {
    return logAuditEvent({
      action: 'crear',
      recurso,
      descripcion,
      usuario,
      identificador
    });
  },

  async update(recurso, { descripcion, usuario, identificador }) {
    return logAuditEvent({
      action: 'modificar',
      recurso,
      descripcion,
      usuario,
      identificador
    });
  },

  async delete(recurso, { descripcion, usuario, identificador }) {
    return logAuditEvent({
      action: 'eliminar',
      recurso,
      descripcion,
      usuario,
      identificador
    });
  }
};

module.exports = audit;