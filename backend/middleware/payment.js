/**
 * Middleware de validación de pagos y seguridad transaccional
 */

const LIMITES_METODOS_PAGO = {
  efectivo: 1000000, // 10,000€ en céntimos
  tarjeta: 500000,   // 5,000€ en céntimos
  transferencia: 1000000
};

const INTENTOS_MAX_POR_HORA = 50;
const intentosPago = new Map(); // clienteId => [timestamps]

function limpiarIntentos() {
  const unaHoraAtras = Date.now() - 3600000;
  for (const [clienteId, timestamps] of intentosPago) {
    const intentosRecientes = timestamps.filter(t => t > unaHoraAtras);
    if (intentosRecientes.length === 0) {
      intentosPago.delete(clienteId);
    } else {
      intentosPago.set(clienteId, intentosRecientes);
    }
  }
}

// Limpiar intentos cada hora
setInterval(limpiarIntentos, 3600000);

/**
 * Valida límites de pago y registra intentos
 */
function validarPago(req, res, next) {
  const { metodoPago, total, cliente } = req.body;
  
  // Validar método de pago
  if (!LIMITES_METODOS_PAGO[metodoPago]) {
    return res.status(400).json({
      success: false,
      message: 'Método de pago no válido'
    });
  }

  // Validar límite por método
  if (total > LIMITES_METODOS_PAGO[metodoPago]) {
    return res.status(400).json({
      success: false,
      message: `El monto excede el límite para pagos por ${metodoPago}`
    });
  }

  // Validar intentos por cliente
  if (cliente) {
    const clienteId = cliente.toString();
    const intentosCliente = intentosPago.get(clienteId) || [];
    const unaHoraAtras = Date.now() - 3600000;
    const intentosRecientes = intentosCliente.filter(t => t > unaHoraAtras);

    if (intentosRecientes.length >= INTENTOS_MAX_POR_HORA) {
      return res.status(429).json({
        success: false,
        message: 'Demasiados intentos de pago. Por favor, espere un momento.'
      });
    }

    intentosRecientes.push(Date.now());
    intentosPago.set(clienteId, intentosRecientes);
  }

  next();
}

module.exports = { validarPago };