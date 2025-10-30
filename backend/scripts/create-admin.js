// Small helper to create an admin employee directly in the DB.
// Usage:
//   Set MONGODB_URI and (optionally) ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env
//   node backend/scripts/create-admin.js

require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const Empleado = require('../models/Empleado.model');

// Guardia de producción
if (!process.env.NODE_ENV) {
  console.error('⚠️ NODE_ENV no está definido');
  process.exit(1);
}

if (process.env.NODE_ENV === 'production' && !process.env.FORCE_ADMIN_CREATE) {
  console.error('⚠️ Este script requiere FORCE_ADMIN_CREATE=true en producción');
  console.error('Ejemplo: FORCE_ADMIN_CREATE=true node scripts/create-admin.js');
  process.exit(1);
}

console.log(`[ENV] Ejecutando en entorno: ${process.env.NODE_ENV}`);
if (process.env.FORCE_ADMIN_CREATE) {
  console.warn('⚠️ FORCE_ADMIN_CREATE está habilitado - procediendo con precaución');
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI no está definido en backend/.env');
  process.exit(1);
}

async function main() {
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Conectado a MongoDB');

  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD || 'password123';

  let empleado = await Empleado.findOne({ email });
  if (empleado) {
    console.log(`Empleado con email ${email} ya existe (id=${empleado._id}).`);
    await mongoose.disconnect();
    process.exit(0);
  }

  empleado = new Empleado({
    nombre: 'Admin',
    apellidos: 'Local',
    email,
    password,
    dni: '00000000A',
    telefono: '000000000',
    salario: 0,
    rol: 'gerente'
  });

  await empleado.save();
  console.log(`Empleado administrador creado: ${email} (id=${empleado._id})`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Error creando admin:', err);
  process.exit(1);
});
