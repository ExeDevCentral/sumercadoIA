const Audit = require('../models/Audit.model');

/**
 * Middleware to automatically record audit entries for model changes.
 * @param {Object} options Configuration options
 * @param {String} options.entityType Type of entity being audited
 * @param {Array} options.sensitiveFields Fields to mask in audit log
 * @param {Function} options.getMetadata Function to extract metadata from request
 */
const auditMiddleware = (options = {}) => {
  const {
    entityType,
    sensitiveFields = [],
    getMetadata = (req) => ({
      origen: req.get('X-Origin') || 'API',
      ip: req.ip,
      userAgent: req.get('User-Agent')
    })
  } = options;

  return async (req, res, next) => {
    // Store original send/json
    const originalJson = res.json;
    const originalSend = res.send;

    // Override response methods to intercept success
    res.json = function(data) {
      recordAuditIfSuccess(req, data);
      originalJson.apply(res, arguments);
    };

    res.send = function(data) {
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
          recordAuditIfSuccess(req, data);
        } catch (e) {}
      }
      originalSend.apply(res, arguments);
    };

    async function recordAuditIfSuccess(req, data) {
      try {
        // Only audit if operation was successful
        if (!data || !data.success) return;

        const method = req.method.toLowerCase();
        let action, changes = [];

        // Map HTTP method to audit action
        switch (method) {
          case 'post':
            action = 'create';
            if (data.data) {
              changes = Object.entries(data.data)
                .filter(([k]) => !sensitiveFields.includes(k))
                .map(([field, newValue]) => ({
                  field,
                  oldValue: null,
                  newValue
                }));
            }
            break;

          case 'put':
          case 'patch':
            action = 'update';
            // For updates, compare req.body with final data
            if (req.body && data.data) {
              changes = Object.entries(req.body)
                .filter(([k]) => !sensitiveFields.includes(k))
                .map(([field, newValue]) => ({
                  field,
                  oldValue: req.originalDoc ? req.originalDoc[field] : undefined,
                  newValue
                }));
            }
            break;

          case 'delete':
            action = 'delete';
            break;
        }

        if (!action) return; // Skip for GET etc.

        const entityId = data.data ? data.data._id : req.params.id;
        if (!entityId) return;

        await Audit.record({
          entityType,
          entityId,
          action,
          changes,
          usuario: req.user ? req.user.id : null,
          metadata: getMetadata(req)
        });

      } catch (err) {
        console.error('Error recording audit:', err);
        // Don't throw - audit logging should not break the main flow
      }
    }

    next();
  };
};

module.exports = auditMiddleware;