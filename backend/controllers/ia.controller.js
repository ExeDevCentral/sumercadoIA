const OpenAI = require('openai');
const Producto = require('../models/Producto.model');
const Venta = require('../models/Venta.model');
const Cliente = require('../models/Cliente.model');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// @desc    Predicción de demanda de productos
// @route   POST /api/ia/predecir-demanda
// @access  Private
exports.predecirDemanda = async (req, res) => {
  try {
    const { productoId, periodo = '7dias' } = req.body;
    
    const producto = await Producto.findById(productoId);
    if (!producto) {
      return res.status(404).json({ 
        success: false, 
        message: 'Producto no encontrado' 
      });
    }
    
    // Obtener ventas históricas del producto
    const diasAtras = periodo === '7dias' ? 30 : 90;
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() - diasAtras);
    
    const ventas = await Venta.find({
      'items.producto': productoId,
      createdAt: { $gte: fechaInicio },
      estado: 'completada'
    });
    
    // Calcular estadísticas
    let totalUnidadesVendidas = 0;
    const ventasPorDia = {};
    
    ventas.forEach(venta => {
      const fecha = venta.createdAt.toISOString().split('T')[0];
      venta.items.forEach(item => {
        if (item.producto.toString() === productoId) {
          totalUnidadesVendidas += item.cantidad;
          ventasPorDia[fecha] = (ventasPorDia[fecha] || 0) + item.cantidad;
        }
      });
    });
    
    const promedioDiario = totalUnidadesVendidas / diasAtras;
    const diasPronostico = periodo === '7dias' ? 7 : 30;
    const demandaPronosticada = Math.ceil(promedioDiario * diasPronostico);
    
    // Usar IA para análisis más detallado
    const prompt = `Analiza estos datos de ventas de un producto de supermercado:
    
    Producto: ${producto.nombre}
    Categoría: ${producto.categoria}
    Stock actual: ${producto.stock}
    Precio: ${producto.precio}€
    Unidades vendidas últimos ${diasAtras} días: ${totalUnidadesVendidas}
    Promedio diario: ${promedioDiario.toFixed(2)}
    
    Proporciona:
    1. Predicción de demanda para próximos ${diasPronostico} días
    2. Recomendación de stock óptimo
    3. Factores a considerar (estacionalidad, tendencias)
    4. Nivel de confianza de la predicción (bajo/medio/alto)
    
    Responde en formato JSON con las claves: demandaEstimada, stockRecomendado, factores, nivelConfianza, recomendaciones`;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "Eres un experto analista de datos de retail y predicción de demanda." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });
    
    const analisisIA = JSON.parse(completion.choices[0].message.content);
    
    res.json({ 
      success: true,
      producto: {
        id: producto._id,
        nombre: producto.nombre,
        stockActual: producto.stock
      },
      estadisticas: {
        totalUnidadesVendidas,
        promedioDiario: promedioDiario.toFixed(2),
        diasAnalisis: diasAtras
      },
      prediccion: {
        periodo: diasPronostico + ' días',
        demandaBasica: demandaPronosticada,
        analisisIA
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al predecir demanda',
      error: error.message 
    });
  }
};

// @desc    Optimización de precios
// @route   POST /api/ia/optimizar-precio
// @access  Private
exports.optimizarPrecio = async (req, res) => {
  try {
    const { productoId } = req.body;
    
    const producto = await Producto.findById(productoId);
    if (!producto) {
      return res.status(404).json({ 
        success: false, 
        message: 'Producto no encontrado' 
      });
    }
    
    // Obtener productos similares
    const productosSimilares = await Producto.find({
      categoria: producto.categoria,
      _id: { $ne: productoId },
      activo: true
    }).limit(5);
    
    const preciosCompetencia = productosSimilares.map(p => p.precio);
    const precioPromedio = preciosCompetencia.reduce((a, b) => a + b, 0) / preciosCompetencia.length;
    
    const prompt = `Analiza la estrategia de precios para este producto:
    
    Producto: ${producto.nombre}
    Precio actual: ${producto.precio}€
    Precio de compra: ${producto.precioCompra}€
    Margen actual: ${producto.margenGanancia}%
    Categoría: ${producto.categoria}
    Stock: ${producto.stock}
    
    Precios de productos similares: ${preciosCompetencia.join(', ')}€
    Precio promedio competencia: ${precioPromedio.toFixed(2)}€
    
    Proporciona análisis y recomendación de precio óptimo considerando:
    - Competitividad
    - Margen de ganancia saludable (mínimo 20%)
    - Rotación de stock
    - Percepción de valor
    
    Responde en JSON con: precioOptimo, razonamiento, margenProyectado, impactoVentas, recomendaciones`;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "Eres un experto en pricing y estrategia comercial de supermercados." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });
    
    const analisisIA = JSON.parse(completion.choices[0].message.content);
    
    res.json({ 
      success: true,
      producto: {
        id: producto._id,
        nombre: producto.nombre,
        precioActual: producto.precio,
        margenActual: producto.margenGanancia + '%'
      },
      mercado: {
        preciosCompetencia,
        precioPromedio: precioPromedio.toFixed(2)
      },
      recomendacion: analisisIA
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al optimizar precio',
      error: error.message 
    });
  }
};

// @desc    Análisis de productos más vendidos
// @route   GET /api/ia/productos-top
// @access  Private
exports.obtenerProductosTop = async (req, res) => {
  try {
    const { periodo = '30dias', limite = 10 } = req.query;
    
    const diasAtras = parseInt(periodo.replace('dias', ''));
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() - diasAtras);
    
    const ventas = await Venta.find({
      createdAt: { $gte: fechaInicio },
      estado: 'completada'
    }).populate('items.producto');
    
    // Calcular productos más vendidos
    const productosStats = {};
    
    ventas.forEach(venta => {
      venta.items.forEach(item => {
        if (item.producto) {
          const id = item.producto._id.toString();
          if (!productosStats[id]) {
            productosStats[id] = {
              producto: item.producto,
              unidadesVendidas: 0,
              ingresoTotal: 0,
              vecesVendido: 0
            };
          }
          productosStats[id].unidadesVendidas += item.cantidad;
          productosStats[id].ingresoTotal += item.subtotal;
          productosStats[id].vecesVendido += 1;
        }
      });
    });
    
    // Ordenar por unidades vendidas
    const topProductos = Object.values(productosStats)
      .sort((a, b) => b.unidadesVendidas - a.unidadesVendidas)
      .slice(0, parseInt(limite));
    
    res.json({ 
      success: true,
      periodo: `${diasAtras} días`,
      totalProductos: topProductos.length,
      data: topProductos.map(p => ({
        producto: {
          id: p.producto._id,
          nombre: p.producto.nombre,
          categoria: p.producto.categoria,
          precio: p.producto.precio
        },
        estadisticas: {
          unidadesVendidas: p.unidadesVendidas,
          ingresoTotal: p.ingresoTotal.toFixed(2),
          vecesVendido: p.vecesVendido,
          promedioUnidadesPorVenta: (p.unidadesVendidas / p.vecesVendido).toFixed(2)
        }
      }))
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener productos top',
      error: error.message 
    });
  }
};

// @desc    Chatbot de consultas administrativas
// @route   POST /api/ia/chatbot
// @access  Private
exports.chatbot = async (req, res) => {
  try {
    const { mensaje, contexto = [] } = req.body;
    
    if (!mensaje) {
      return res.status(400).json({ 
        success: false, 
        message: 'El mensaje es obligatorio' 
      });
    }
    
    // Obtener datos relevantes del sistema
    const totalProductos = await Producto.countDocuments({ activo: true });
    const productosAgotados = await Producto.countDocuments({ stock: 0 });
    const totalClientes = await Cliente.countDocuments({ activo: true });
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const ventasHoy = await Venta.countDocuments({ 
      createdAt: { $gte: hoy },
      estado: 'completada'
    });
    
    const systemPrompt = `Eres un asistente virtual inteligente del sistema de gestión de Mercadona Supermercado.
    
Datos actuales del sistema:
- Total de productos activos: ${totalProductos}
- Productos agotados: ${productosAgotados}
- Total de clientes registrados: ${totalClientes}
- Ventas realizadas hoy: ${ventasHoy}

Puedes ayudar con:
- Consultas sobre inventario y productos
- Información de ventas y reportes
- Gestión de clientes y empleados
- Análisis de datos y estadísticas
- Recomendaciones operativas

Responde de manera profesional, clara y útil. Si necesitas datos específicos que no tienes, indica qué información adicional se requiere.`;
    
    const messages = [
      { role: "system", content: systemPrompt },
      ...contexto,
      { role: "user", content: mensaje }
    ];
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      temperature: 0.8,
      max_tokens: 500
    });
    
    const respuesta = completion.choices[0].message.content;
    
    res.json({ 
      success: true,
      mensaje,
      respuesta,
      contexto: [...contexto, 
        { role: "user", content: mensaje },
        { role: "assistant", content: respuesta }
      ]
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error en el chatbot',
      error: error.message 
    });
  }
};

// @desc    Análisis inteligente de cliente
// @route   POST /api/ia/analizar-cliente
// @access  Private
exports.analizarCliente = async (req, res) => {
  try {
    const { clienteId } = req.body;
    
    const cliente = await Cliente.findById(clienteId);
    if (!cliente) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cliente no encontrado' 
      });
    }
    
    const ventas = await Venta.find({ 
      cliente: clienteId,
      estado: 'completada'
    }).populate('items.producto').sort({ createdAt: -1 }).limit(20);
    
    const totalGastado = ventas.reduce((sum, v) => sum + v.total, 0);
    const ticketPromedio = totalGastado / ventas.length || 0;
    
    // Productos más comprados
    const productosMap = {};
    ventas.forEach(venta => {
      venta.items.forEach(item => {
        if (item.producto) {
          const id = item.producto._id.toString();
          if (!productosMap[id]) {
            productosMap[id] = {
              nombre: item.producto.nombre,
              categoria: item.producto.categoria,
              veces: 0
            };
          }
          productosMap[id].veces += 1;
        }
      });
    });
    
    const productosFrecuentes = Object.values(productosMap)
      .sort((a, b) => b.veces - a.veces)
      .slice(0, 5);
    
    const prompt = `Analiza el perfil de este cliente de supermercado:
    
Cliente: ${cliente.nombreCompleto}
Nivel: ${cliente.nivel}
Puntos: ${cliente.puntos}
Compras realizadas: ${ventas.length}
Total gastado: ${totalGastado.toFixed(2)}€
Ticket promedio: ${ticketPromedio.toFixed(2)}€

Productos más comprados:
${productosFrecuentes.map(p => `- ${p.nombre} (${p.categoria}): ${p.veces} veces`).join('\n')}

Proporciona en JSON:
- perfilCliente: descripción del tipo de cliente
- patronesCompra: patrones identificados
- oportunidades: formas de aumentar su valor
- recomendacionesMarketing: estrategias personalizadas
- riesgoChurn: bajo/medio/alto y razones`;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "Eres un experto en análisis de comportamiento de clientes y CRM." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });
    
    const analisis = JSON.parse(completion.choices[0].message.content);
    
    res.json({ 
      success: true,
      cliente: {
        id: cliente._id,
        nombre: cliente.nombreCompleto,
        nivel: cliente.nivel,
        puntos: cliente.puntos
      },
      estadisticas: {
        totalCompras: ventas.length,
        totalGastado: totalGastado.toFixed(2),
        ticketPromedio: ticketPromedio.toFixed(2),
        productosFrecuentes
      },
      analisis
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error al analizar cliente',
      error: error.message 
    });
  }
};
