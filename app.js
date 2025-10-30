const productCategories = [
    { name: 'Almacén seco', products: ['Harinas', 'arroz', 'pastas', 'legumbres', 'aceites', 'conservas', 'galletitas', 'azúcar', 'café', 'té'] },
    { name: 'Bebidas', products: ['Aguas', 'gaseosas', 'jugos', 'cervezas', 'vinos', 'licores'] },
    { name: 'Lácteos', products: ['Leche', 'yogures', 'quesos', 'manteca', 'postres'] },
    { name: 'Carnicería', products: ['Carne vacuna', 'cerdo', 'pollo', 'embutidos'] },
    { name: 'Pescadería', products: ['Pescados', 'mariscos', 'congelados del mar'] },
    { name: 'Verdulería / Frutas y verduras', products: ['Productos frescos de estación'] },
    { name: 'Panadería / Pastelería', products: ['Panes', 'facturas', 'tortas', 'masas', 'bizcochos'] },
    { name: 'Fiambrería / Rotisería', products: ['Fiambres', 'quesos cortados', 'comidas preparadas'] },
    { name: 'Congelados', products: ['Verduras congeladas', 'helados', 'comidas listas'] },
    { name: 'Limpieza / Hogar', products: ['Detergentes', 'lavandinas', 'desinfectantes', 'insecticidas'] },
    { name: 'Perfumería / Higiene personal', products: ['Shampoo', 'jabón', 'pasta dental', 'cosmética básica'] },
    { name: 'Mascotas', products: ['Alimentos balanceados', 'accesorios'] },
    { name: 'Bazar / Hogar', products: ['Utensilios', 'ollas', 'artículos de cocina'] },
    { name: 'Textil / Ropa', products: ['Ropa interior', 'remeras', 'medias', 'toallas'] },
    { name: 'Electrodomésticos / Tecnología', products: ['Pequeños electrodomésticos', 'pilas', 'cargadores'] }
];

const productGrid = document.getElementById('product-grid');

productCategories.forEach(category => {
    const categoryElement = document.createElement('div');
    categoryElement.classList.add('category');
    
    const categoryTitle = document.createElement('h2');
    categoryTitle.textContent = category.name;
    categoryElement.appendChild(categoryTitle);
    
    productGrid.appendChild(categoryElement);
});
