
      document.addEventListener('DOMContentLoaded', async () => {
    
    let products = []; // La lista de productos ahora se llenará desde la hoja de cálculo
    let BS_RATE; // Variable para la tasa de cambio

    // Constantes de tu API para TASA (Hoja 2)
    const TASA_SPREADSHEET_ID = '12uTuKlB-xjW32b3wXo1D-ivgnVh4aI10Q9x-vBUn4_o';
    const TASA_API_KEY = 'AIzaSyDvBjF4xtLKtvAzwaXMRvk8rk4UC4CDwH8';
    const TASA_SHEET_NAME = 'hoja2';
    const TASA_RANGE = 'B1';

    // Constantes de tu API para PRODUCTOS (Nueva Hoja)
    const PROD_SHEET_NAME = 'tabla_prod_pedidos'; // Nuevo nombre de hoja
    const PROD_RANGE = 'A1:G300'; // Nuevo rango de celdas
    
    // URLs de la API
    const urlApiTasa = `https://sheets.googleapis.com/v4/spreadsheets/${TASA_SPREADSHEET_ID}/values/${TASA_SHEET_NAME}!${TASA_RANGE}?key=${TASA_API_KEY}`;
    const urlApiProductos = `https://sheets.googleapis.com/v4/spreadsheets/${TASA_SPREADSHEET_ID}/values/${PROD_SHEET_NAME}!${PROD_RANGE}?key=${TASA_API_KEY}`; // Reutilizamos ID y Key

    /* --- 1. OBTENER LA TASA DE CAMBIO --- */
    try {
        const response = await fetch(urlApiTasa);
        const data = await response.json();

        if (data.values && data.values.length > 0) {
            BS_RATE = parseFloat(data.values[0][0]);
        } else {
            console.error('No se encontraron datos de la tasa.');
            BS_RATE = 0.0;
        }
    } catch (error) {
        console.error('Error al obtener la tasa de cambio de la API:', error);
        BS_RATE = 0.0;
    }

    // Mostrar la tasa en la página
    document.getElementById("tasa").innerHTML = BS_RATE;
    document.getElementById("tasa1").innerHTML = BS_RATE;

    /* --- 2. OBTENER LOS PRODUCTOS --- */
    try {
        const response = await fetch(urlApiProductos);
        const data = await response.json();

        if (data.values && data.values.length > 1) {
            // Transformar los datos de la hoja de cálculo
            // Asume que las columnas son: A=ID, B=Name, C=Price, D=ImageUrl, E=Stock
            products = data.values.slice(1).map(row => ({ // slice(1) omite la fila de encabezados
                id: parseInt(row[0]),
                name: row[1] || 'Producto sin nombre',
                uni_med: row[2] || 'U/M vacio',
                price: parseFloat(row[3]) || 0.0,
                imageUrl: row[4] || '',
                stock: row[5] || '', // Columna para la palabra "Agotado"
            }));
            
        } else {
            console.warn('No se encontraron productos o solo hay encabezados.');
        }
    } catch (error) {
        console.error('Error al obtener los productos de la API:', error);
    }
    
    // AHORA QUE TENEMOS LA TASA Y LOS PRODUCTOS, CONTINUAMOS CON EL CÓDIGO RESTANTE

    let cart = {};
    const productsContainer = document.getElementById('products-container');
    const cartItemCount = document.getElementById('cart-item-count');
    const cartModal = document.getElementById('cart-modal');
    const closeModalButton = document.getElementById('close-modal');
    const cartItemsList = document.getElementById('cart-items-list');
    const totalAmountDisplay = document.getElementById('total-amount');
    const placeOrderButton = document.getElementById('place-order-button');
    
    // Render products on the page
    products.forEach(product => {
        const productElement = document.createElement('div');
        const priceBs = (product.price * BS_RATE).toFixed(2);
        const isAgotado = product.stock.trim().toLowerCase() === 'agotado';
        

        // Determinar el contenido de la sección de stock y si los botones deben deshabilitarse
        let stockDisplay = '';
        let buttonDisabled = '';
        if (isAgotado) {
            stockDisplay = `<p class="text-sm text-red-600 font-bold mb-2">AGOTADO</p>`;
            buttonDisabled = 'disabled'; // Deshabilitar botones si está agotado
        } else {
            stockDisplay = `<p class="text-sm text-gray-600 mb-2 invisible">Placeholder</p>`; // Mantener espacio para stock
        }

        productElement.className = 'product-card bg-yellow-400 rounded-xl shadow-md p-4 flex flex-col items-center text-center';
        productElement.innerHTML = `
            <img src="${product.imageUrl}" alt="${product.name}" class="w-24 h-24 rounded-full object-cover mb-4">
            <h3 class="text-lg font-semibold">${product.name}</h3>
            <p class="text-sm text-gray-800 mb-1">${product.uni_med}</p>
            <p class="text-sm text-gray-800 mb-1">REF: $${product.price.toFixed(2)}</p>
            <p class="text-sm text-gray-800 mb-2">Bs. ${priceBs}</p>
            ${stockDisplay} <div class="flex items-center gap-2">
                <button class="bg-gray-200 text-gray-600 rounded-full w-8 h-8 flex items-center justify-center font-bold text-lg hover:bg-gray-300 transition-colors ${buttonDisabled ? 'opacity-50 cursor-not-allowed' : ''}" data-id="${product.id}" data-action="decrease" ${buttonDisabled ? 'disabled' : ''}>-</button>
                <span id="quantity-${product.id}" class="w-8 text-center text-lg font-medium">0</span>
                <button class="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-lg hover:bg-red-600 transition-colors ${buttonDisabled ? 'opacity-50 cursor-not-allowed' : ''}" data-id="${product.id}" data-action="increase" ${buttonDisabled ? 'disabled' : ''}>+</button>
            </div>
        `;
        productsContainer.appendChild(productElement);
    });

    // Handle quantity changes
    productsContainer.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button || button.disabled) return; // Se añade la verificación de 'disabled'

        const productId = parseInt(button.dataset.id);
        const action = button.dataset.action;
        const product = products.find(p => p.id === productId);

        if (action === 'increase') {
            if (cart[productId]) {
                cart[productId].quantity++;
            } else {
                cart[productId] = { ...product, quantity: 1 };
            }
        } else if (action === 'decrease') {
            if (cart[productId] && cart[productId].quantity > 0) {
                cart[productId].quantity--;
                if (cart[productId].quantity === 0) {
                    delete cart[productId];
                }
            }
        }

        updateCartDisplay();
    });

    // ... EL RESTO DEL CÓDIGO PERMANECE IGUAL (updateCartDisplay, updateCartModal, eventos de modal, placeOrderButton) ...
    // ... Asegúrate de que las funciones updateCartDisplay y updateCartModal usen la variable 'products' globalmente disponible.

    function updateCartDisplay() {
        let totalItems = 0;
        products.forEach(product => {
            const quantity = cart[product.id] ? cart[product.id].quantity : 0;
            totalItems += quantity;
            const quantitySpan = document.getElementById(`quantity-${product.id}`);
            if (quantitySpan) {
                quantitySpan.textContent = quantity;
            }
        });

        cartItemCount.textContent = totalItems;
        cartItemCount.style.display = totalItems > 0 ? 'flex' : 'none';
        updateCartModal();
    }

    function updateCartModal() {
        cartItemsList.innerHTML = '';
        let totalAmountUSD = 0;
        const itemsInCart = Object.values(cart);

        if (itemsInCart.length === 0) {
            cartItemsList.innerHTML = '<p class="text-center text-gray-500">Tu carrito está vacío.</p>';
            placeOrderButton.disabled = true;
            placeOrderButton.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            placeOrderButton.disabled = false;
            placeOrderButton.classList.remove('opacity-50', 'cursor-not-allowed');
            itemsInCart.forEach(item => {
                const totalItemPriceUSD = item.price * item.quantity;
                totalAmountUSD += totalItemPriceUSD;
                const totalItemPriceBs = (totalItemPriceUSD * BS_RATE).toFixed(2);
                const itemElement = document.createElement('li');
                itemElement.className = 'flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0';
                itemElement.innerHTML = `
                    <div class="flex-1">
                        <span class="font-semibold">${item.name}</span>
                        <span class="text-sm text-gray-500"> x${item.quantity}</span>
                    </div>
                    <div class="flex flex-col items-end">
                        <span class="text-gray-700 font-medium">REF: $${totalItemPriceUSD.toFixed(2)}</span>
                        <span class="text-gray-500 text-sm">Bs. ${totalItemPriceBs}</span>
                    </div>
                `;
                cartItemsList.appendChild(itemElement);
            });
        }
        const totalAmountBs = (totalAmountUSD * BS_RATE).toFixed(2);
        totalAmountDisplay.innerHTML = `
            <span class="font-bold">Total:</span>
            <div class="flex flex-col items-end">
                <span class="font-medium">REF: $${totalAmountUSD.toFixed(2)}</span>
                <span class="text-sm text-gray-500">Bs. ${totalAmountBs}</span>
            </div>
        `;
    }

    // Show cart modal
    document.getElementById('cart-icon-button').addEventListener('click', () => {
        cartModal.classList.remove('hidden');
        updateCartModal();
    });

    // Close cart modal
    closeModalButton.addEventListener('click', () => {
        cartModal.classList.add('hidden');
    });

    // Place order logic - now it sends a WhatsApp message
    placeOrderButton.addEventListener('click', () => {
        const phoneNumber = '584141398895';
        const itemsInCart = Object.values(cart);
        let totalAmountUSD = 0;

        let message = `¡Hola! Me gustaría hacer un pedido.\n\n`;
        message += `*Fecha:* ${new Date().toLocaleDateString()}\n\n`;
        message += `*Resumen del Pedido:*\n`;

        itemsInCart.forEach(item => {
            const totalItemPriceUSD = item.price * item.quantity;
            totalAmountUSD += totalItemPriceUSD;
            const totalItemPriceBs = (totalItemPriceUSD * BS_RATE).toFixed(2);
            message += `  - ${item.name} (x${item.quantity})\n`;
            message += `    REF: $${totalItemPriceUSD.toFixed(2)} / Bs. ${totalItemPriceBs}\n\n`;
        });

        const totalAmountBs = (totalAmountUSD * BS_RATE).toFixed(2);
        message += `\n*Total:*\n`;
        message += `  REF: $${totalAmountUSD.toFixed(2)}\n`;
        message += `  Bs. ${totalAmountBs}\n`;
        
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

        window.open(whatsappUrl, '_blank');
        
        cart = {};
        updateCartDisplay();
        cartModal.classList.add('hidden');
    });

});