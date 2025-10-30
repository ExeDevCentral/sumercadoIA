// Estado de la aplicación
const state = {
    cart: [],
    products: [],
    currentTab: 'terminal'
};

// Formato de moneda
const formatter = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
});

// Cargar productos de la API
async function loadProducts() {
    try {
        const response = await fetch('/api/productos');
        const data = await response.json();
        if (data.success) {
            state.products = data.data;
            renderProducts();
        }
    } catch (err) {
        console.error('Error al cargar productos:', err);
    }
}

// Renderizar productos en la grilla
function renderProducts() {
    const grid = document.querySelector('.products-grid');
    grid.innerHTML = state.products.map(product => `
        <div class="product-card" onclick="addToCart('${product._id}')">
            <div class="product-name">${product.nombre}</div>
            <div class="product-price">${formatter.format(product.precio/100)}</div>
            <div class="product-stock">Stock: ${product.stock}</div>
        </div>
    `).join('');
}

// Agregar producto al carrito
function addToCart(productId) {
    const product = state.products.find(p => p._id === productId);
    if (!product) return;

    const existingItem = state.cart.find(item => item.producto === productId);
    if (existingItem) {
        existingItem.cantidad++;
        existingItem.subtotal = existingItem.cantidad * existingItem.precioUnitario;
    } else {
        state.cart.push({
            producto: productId,
            nombreProducto: product.nombre,
            cantidad: 1,
            precioUnitario: product.precio,
            subtotal: product.precio
        });
    }

    renderCart();
    updateTotal();
}

// Renderizar carrito
function renderCart() {
    const cartItems = document.querySelector('.cart-items');
    cartItems.innerHTML = state.cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-quantity">${item.cantidad}x</div>
            <div class="cart-item-name">${item.nombreProducto}</div>
            <div class="cart-item-price">${formatter.format(item.subtotal/100)}</div>
        </div>
    `).join('');
}

// Actualizar total
function updateTotal() {
    const total = state.cart.reduce((sum, item) => sum + item.subtotal, 0);
    document.querySelector('.total-display').textContent = formatter.format(total/100);
}

// Finalizar venta
async function finalizarVenta() {
    if (state.cart.length === 0) return;

    const venta = {
        items: state.cart,
        subtotal: state.cart.reduce((sum, item) => sum + item.subtotal, 0),
        iva: 21,
        impuestos: Math.round(state.cart.reduce((sum, item) => sum + item.subtotal, 0) * 0.21),
        total: Math.round(state.cart.reduce((sum, item) => sum + item.subtotal, 0) * 1.21),
        metodoPago: 'efectivo', // Por implementar selector de método
        detallesPago: {}, // Por implementar
        empleado: getCurrentUserId() // Por implementar
    };

    try {
        const response = await fetch('/api/ventas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}` // Por implementar
            },
            body: JSON.stringify(venta)
        });

        const data = await response.json();
        if (data.success) {
            alert('Venta realizada con éxito');
            state.cart = [];
            renderCart();
            updateTotal();
        }
    } catch (err) {
        console.error('Error al finalizar venta:', err);
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();

    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        });
    });

    // Botón finalizar venta
    document.querySelector('.btn-primary').addEventListener('click', finalizarVenta);
});

// Actualizar interfaz cada 5 segundos para mantener stock actualizado
setInterval(loadProducts, 5000);