// Seed script to create N sample products. Idempotent by 'codigo'.
// Usage:
//  Set MONGODB_URI in backend/.env and run:
//    node backend/scripts/seed-products.js 1500

require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const Producto = require('../models/Producto.model');

// Guardia de producción
if (process.env.NODE_ENV === 'production') {
  console.error('⚠️ Este script no debe ejecutarse en producción sin FORCE_SEED=true');
  if (!process.env.FORCE_SEED) {
    process.exit(1);
  }
  console.warn('⚠️ FORCE_SEED está habilitado - procediendo con precaución en producción');
}

const categories = ['alimentos','bebidas','limpieza','higiene','panaderia','carniceria','pescaderia','fruteria','congelados','otros'];

async function seed(count = 1500) {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not defined in backend/.env');
    process.exit(1);
  }

  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  for (let i = 1; i <= count; i++) {
    const codigo = `P-${String(i).padStart(6, '0')}`;
    const nombre = `Producto ${i}`;
    const categoria = categories[i % categories.length];
    const precioCompra = Number((Math.random() * 50 + 10).toFixed(2));
    const precio = Number((precioCompra * (1 + (Math.random() * 1))).toFixed(2));
    const stock = Math.floor(Math.random() * 200);

    const exists = await Producto.findOne({ codigo });
    if (exists) {
      if (i % 100 === 0) console.log(`Skipping existing ${codigo}`);
      continue;
    }

    const doc = new Producto({ codigo, nombre, categoria, precio, precioCompra, stock });
    await doc.save();

    if (i % 100 === 0) console.log(`Seeded ${i}/${count}`);
  }

  console.log('Seeding complete');
  await mongoose.disconnect();
}

const n = parseInt(process.argv[2], 10) || 1500;
seed(n).catch(err => { console.error(err); process.exit(1); });
