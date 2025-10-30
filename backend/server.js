const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

// Importar rutas
const productosRoutes = require('./routes/productos.routes');
const ventasRoutes = require('./routes/ventas.routes');
const clientesRoutes = require('./routes/clientes.routes');
const empleadosRoutes = require('./routes/empleados.routes');
const iaRoutes = require('./routes/ia.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const authRoutes = require('./routes/auth.routes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Conectado a MongoDB'))
.catch((err) => console.error('❌ Error de conexión a MongoDB:', err));

// Rutas
app.get('/', (req, res) => {
  res.json({ 
    message: '🛒 Bienvenido a Mercadona Supermercado IA API',
    version: '1.0.0',
    endpoints: {
      productos: '/api/productos',
      ventas: '/api/ventas',
      clientes: '/api/clientes',
      empleados: '/api/empleados',
      ia: '/api/ia',
      dashboard: '/api/dashboard',
      auth: '/api/auth'
    }
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/empleados', empleadosRoutes);
app.use('/api/ia', iaRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📍 Entorno: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
