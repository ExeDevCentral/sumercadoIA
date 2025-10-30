// Sample product database
const products = {
    '7790010001234': { name: 'Harina 1kg', price: 150.00 },
    '7790020004567': { name: 'Arroz 1kg', price: 120.50 },
    '7790030007890': { name: 'Gaseosa 2.25L', price: 250.75 },
    '7790040001122': { name: 'Leche 1L', price: 180.00 },
    '7790050003344': { name: 'Pan Lactal', price: 220.25 }
};

const itemList = document.getElementById('item-list');
const totalDisplay = document.getElementById('total');
const barcodeInput = document.getElementById('barcode-input');
const addItemBtn = document.getElementById('add-item-btn');
const printReceiptBtn = document.getElementById('print-receipt-btn');

let currentSale = [];

function addItem() {
    const barcode = barcodeInput.value;
    const product = products[barcode];

    if (product) {
        currentSale.push(product);
        updateDisplay();
    } else {
        alert('Producto no encontrado');
    }
    barcodeInput.value = '';
    barcodeInput.focus();
}

function updateDisplay() {
    // Clear current list
    itemList.innerHTML = '';

    // Add items to list
    currentSale.forEach(item => {
        const listItem = document.createElement('li');
        listItem.textContent = `${item.name} - $${item.price.toFixed(2)}`;
        itemList.appendChild(listItem);
    });

    // Calculate and display total
    const total = currentSale.reduce((sum, item) => sum + item.price, 0);
    totalDisplay.textContent = `Total: $${total.toFixed(2)}`;
}

function printReceipt() {
    // This is a placeholder for actual printing logic
    let receiptContent = 'Mercadona Recibo\n';
    receiptContent += '--------------------\n';
    currentSale.forEach(item => {
        receiptContent += `${item.name} - $${item.price.toFixed(2)}\n`;
    });
    receiptContent += '--------------------\n';
    const total = currentSale.reduce((sum, item) => sum + item.price, 0);
    receiptContent += `Total: $${total.toFixed(2)}\n`;

    alert(receiptContent);

    // Reset for next sale
    currentSale = [];
    updateDisplay();
}


addItemBtn.addEventListener('click', addItem);
barcodeInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        addItem();
    }
});
printReceiptBtn.addEventListener('click', printReceipt);

barcodeInput.focus();
