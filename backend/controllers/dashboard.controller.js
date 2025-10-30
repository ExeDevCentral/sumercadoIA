const Producto = require('../models/Producto.model');
const Venta = require('../models/Venta.model');
const Cliente = require('../models/Cliente.model');
const Empleado = require('../models/Empleado.model');

// @desc    Obtener métricas generales del dashboard
// @route   GET /api/dashboard/metricas
// @access  Private
exports.obtenerMetricas = async (req, res) => {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const mañana = new Date(hoy);
    mañana.setDate(mañana.getDate() + 1);
    
    // Ventas de hoy
    const ventasHoy = await Venta.find({
      createdAt: { $gte: hoy, $lt: mañana },
      estado: 'completada'
    });
    
    const totalVentasHoy = ventasHoy.length;
    const ingresosTotalHoy = ventasHoy.reduce((sum, venta) => sum + venta.total, 0);
    
    // Ventas del mes
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const ventasMes = await Venta.find({
      createdAt: { $gte: inicioMes },
      estado: 'completada'
    });
    
    const totalVentasMes = ventasMes.length;
    const ingresosTotalMes = ventasMes.reduce((sum, venta) => sum + venta.total, 0);
    
    // Productos
    const totalProductos = await Producto.countDocuments({ activo: true });
    const productosAgotados = await Producto.countDocuments({ stock: 0 });
    const productosBajoStock = await Producto.countDocuments({
      $expr: { $lte: ['$stock', '$stockMinimo'] },
      stock: { $gt: 0 }
    });
    
    // Clientes
    const totalClientes = await Cliente.countDocuments({ activo: true });
    const clientesNuevosMes = await Cliente.countDocuments({
      createdAt: { $gte: inicioMes }
    });
    
    // Empleados
    const totalEmpleados = await Empleado.countDocuments({ activo: true });
    
    // Calcular comparación con día anterior
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);
    
    const ventasAyer = await Venta.find({
      createdAt: { $gte: ayer, $lt: hoy },
      estado: 'completada'
    });
    
    const ingresosTotalAyer = ventasAyer.reduce((sum, venta) => sum + venta.total, 0);
    const variacionDiaria = ingresosTotalAyer > 0 
      ? ((ingresosTotalHoy - ingresosTotalAyer) / ingresosTotalAyer * 100).toFixed(2)
      : 0;
    
    res.json({ 
      success: true,
      fecha: hoy,
      ventasHoy: {
        cantidad: totalVentasHoy,
        ingresos: ingresosTotalHoy.toFixed(2),
        variacion: variacionDiaria + '%',
        ticketPromedio: totalVentasHoy > 0 ? (ingresosTotalHoy / totalVentasHoy).toFixed(2) : 0
      },
      ventasMes: {
        cantidad: totalVentasMes,
        ingresos: ingresosTotalMes.toFixed(2),
        promedioDiario: (ingresosTotalMes / hoy.getDate()).toFixed(2)
      },
      inventario: {
        totalProductos,
        productosAgotados,
        productosBajoStock,
        alertas: productosAgotados + productosBajoStock
      },
      clientes: {
        total: totalClientes,
        nuevosMes: clientesNuevosMes
      },
      empleados: {
        total: totalEmpleados,
        activos: totalEmpleados
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener métricas',
      error: error.message 
    });
  }
};

// @desc    Obtener gráficos de ventas
// @route   GET /api/dashboard/graficos/ventas
// @access  Private
exports.obtenerGraficosVentas = async (req, res) => {
  try {
    const { periodo = '7dias' } = req.query;
    
    const dias = parseInt(periodo.replace('dias', ''));
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() - dias);
    fechaInicio.setHours(0, 0, 0, 0);
    
    const ventas = await Venta.find({
      createdAt: { $gte: fechaInicio },
      estado: 'completada'
    });
    
    // Agrupar ventas por día
    const ventasPorDia = {};
    const ingresosPorDia = {};
    
    for (let i = 0; i < dias; i++) {
      const fecha = new Date(fechaInicio);
      fecha.setDate(fecha.getDate() + i);
      const fechaStr = fecha.toISOString().split('T')[0];
      ventasPorDia[fechaStr] = 0;
      ingresosPorDia[fechaStr] = 0;
    }
    
    ventas.forEach(venta => {
      const fechaStr = venta.createdAt.toISOString().split('T')[0];
      if (ventasPorDia.hasOwnProperty(fechaStr)) {
        ventasPorDia[fechaStr]++;
        ingresosPorDia[fechaStr] += venta.total;
      }
    });
    
    // Ventas por categoría
    const ventasPorCategoria = {};
    
    for (const venta of ventas) {
      for (const item of venta.items) {
        const producto = await Producto.findById(item.producto);
        if (producto) {
          const categoria = producto.categoria;
          ventasPorCategoria[categoria] = (ventasPorCategoria[categoria] || 0) + item.subtotal;
        }
      }
    }
    
    // Ventas por método de pago
    const ventasPorMetodoPago = {};
    ventas.forEach(venta => {
      ventasPorMetodoPago[venta.metodoPago] = 
        (ventasPorMetodoPago[venta.metodoPago] || 0) + venta.total;
    });
    
    res.json({ 
      success: true,
      periodo: `${dias} días`,
      ventasPorDia: {
        labels: Object.keys(ventasPorDia),
        cantidad: Object.values(ventasPorDia),
        ingresos: Object.values(ingresosPorDia).map(v => v.toFixed(2))
      },
      ventasPorCategoria: {
        labels: Object.keys(ventasPorCategoria),
        valores: Object.values(ventasPorCategoria).map(v => v.toFixed(2))
      },
      ventasPorMetodoPago: {
        labels: Object.keys(ventasPorMetodoPago),
        valores: Object.values(ventasPorMetodoPago).map(v => v.toFixed(2))
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener gráficos',
      error: error.message 
    });
  }
};

// @desc    Obtener reporte de inventario
// @route   GET /api/dashboard/reporte/inventario
// @access  Private
exports.obtenerReporteInventario = async (req, res) => {
  try {
    const productos = await Producto.find({ activo: true });
    
    const valorTotal = productos.reduce((sum, p) => sum + (p.precio * p.stock), 0);
    const valorCompra = productos.reduce((sum, p) => sum + (p.precioCompra * p.stock), 0);
    const gananciaProyectada = valorTotal - valorCompra;
    
    // Productos por categoría
    const productosPorCategoria = {};
    const valorPorCategoria = {};
    
    productos.forEach(producto => {
      const cat = producto.categoria;
      productosPorCategoria[cat] = (productosPorCategoria[cat] || 0) + 1;
      valorPorCategoria[cat] = (valorPorCategoria[cat] || 0) + (producto.precio * producto.stock);
    });
    
    // Productos con mejor margen
    const mejoresMaxrgenes = productos
      .sort((a, b) => parseFloat(b.margenGanancia) - parseFloat(a.margenGanancia))
      .slice(0, 10)
      .map(p => ({
        id: p._id,
        nombre: p.nombre,
        margen: p.margenGanancia + '%',
        precio: p.precio,
        stock: p.stock
      }));
    
    res.json({ 
      success: true,
      resumen: {
        totalProductos: productos.length,
        valorInventario: valorTotal.toFixed(2),
        valorCompra: valorCompra.toFixed(2),
        gananciaProyectada: gananciaProyectada.toFixed(2)
      },
      categorias: {
        cantidades: productosPorCategoria,
        valores: Object.fromEntries(
          Object.entries(valorPorCategoria).map(([k, v]) => [k, v.toFixed(2)])
        )
      },
      mejoresMaxrgenes
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener reporte de inventario',
      error: error.message 
    });
  }
};

// @desc    Obtener top empleados
// @route   GET /api/dashboard/top-empleados
// @access  Private
exports.obtenerTopEmpleados = async (req, res) => {
  try {
    const { periodo = '30dias' } = req.query;
    
    const dias = parseInt(periodo.replace('dias', ''));
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() - dias);
    
    const empleados = await Empleado.find({ activo: true, rol: { $in: ['cajero', 'supervisor'] } })
      .select('nombre apellidos rol rendimiento');
    
    const empleadosConVentas = [];
    
    for (const empleado of empleados) {
      const ventas = await Venta.find({
        empleado: empleado._id,
        createdAt: { $gte: fechaInicio },
        estado: 'completada'
      });
      
      const totalVendido = ventas.reduce((sum, v) => sum + v.total, 0);
      const cantidadVentas = ventas.length;
      
      empleadosConVentas.push({
        id: empleado._id,
        nombre: empleado.nombreCompleto,
        rol: empleado.rol,
        ventasRealizadas: cantidadVentas,
        totalVendido: totalVendido.toFixed(2),
        ticketPromedio: cantidadVentas > 0 ? (totalVendido / cantidadVentas).toFixed(2) : 0
      });
    }
    
    // Ordenar por total vendido
    empleadosConVentas.sort((a, b) => parseFloat(b.totalVendido) - parseFloat(a.totalVendido));
    
    res.json({ 
      success: true,
      periodo: `${dias} días`,
      totalEmpleados: empleadosConVentas.length,
      data: empleadosConVentas.slice(0, 10)
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener top empleados',
      error: error.message 
    });
  }
};

// @desc    Obtener alertas del sistema
// @route   GET /api/dashboard/alertas
// @access  Private
exports.obtenerAlertas = async (req, res) => {
  try {
    const alertas = [];
    
    // Productos agotados
    const productosAgotados = await Producto.find({ stock: 0, activo: true })
      .select('nombre codigo categoria')
      .limit(10);
    
    productosAgotados.forEach(p => {
      alertas.push({
        tipo: 'error',
        categoria: 'inventario',
        mensaje: `Producto agotado: ${p.nombre} (${p.codigo})`,
        dato: p
      });
    });
    
    // Productos con bajo stock
    const productosBajoStock = await Producto.find({
      $expr: { $lte: ['$stock', '$stockMinimo'] },
      stock: { $gt: 0 },
      activo: true
    }).select('nombre codigo stock stockMinimo').limit(10);
    
    productosBajoStock.forEach(p => {
      alertas.push({
        tipo: 'warning',
        categoria: 'inventario',
        mensaje: `Stock bajo: ${p.nombre} (Stock: ${p.stock}, Mínimo: ${p.stockMinimo})`,
        dato: p
      });
    });
    
    // Ventas de hoy vs ayer
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);
    
    const ventasHoy = await Venta.countDocuments({
      createdAt: { $gte: hoy },
      estado: 'completada'
    });
    
    const ventasAyer = await Venta.countDocuments({
      createdAt: { $gte: ayer, $lt: hoy },
      estado: 'completada'
    });
    
    if (ventasHoy < ventasAyer * 0.7) {
      alertas.push({
        tipo: 'warning',
        categoria: 'ventas',
        mensaje: `Las ventas de hoy (${ventasHoy}) están significativamente por debajo de ayer (${ventasAyer})`,
        dato: { ventasHoy, ventasAyer }
      });
    }
    
    res.json({ 
      success: true,
      totalAlertas: alertas.length,
      alertas
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener alertas',
      error: error.message 
    });
  }
};
