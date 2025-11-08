// ui.js
let cart = [];
const cartItems = document.getElementById('cartItems');
const cartSubtotal = document.getElementById('cartSubtotal');
const cartTaxes = document.getElementById('cartTaxes');
const cartTotal = document.getElementById('cartTotal');
const couponInput = document.getElementById('couponInput');
const applyCouponBtn = document.getElementById('applyCouponBtn');

export function addToCart(productId) {
  const existing = cart.find(p => p.id === productId);
  if (existing) {
    existing.quantity++;
  } else {
    cart.push({ id: productId, quantity: 1 });
  }
  updateCart();
}

function updateCart() {
  cartItems.innerHTML = '';
  let subtotal = 0;
  cart.forEach(item => {
    // Aquí podrías obtener los datos completos del producto desde "products"
    const product = window.products.find(p => p.id === item.id);
    subtotal += product.price * item.quantity;

    const li = document.createElement('li');
    li.innerHTML = `
      ${product.name} x 
      <input type="number" min="1" value="${item.quantity}" data-id="${item.id}">
      <button class="remove-item" data-id="${item.id}">Eliminar</button>
      <span>$${product.price * item.quantity}</span>
    `;
    cartItems.appendChild(li);
  });

  const taxes = subtotal * 0.19; // ejemplo 19% IVA
  const total = subtotal + taxes;

  cartSubtotal.textContent = `$${subtotal.toFixed(2)}`;
  cartTaxes.textContent = `$${taxes.toFixed(2)}`;
  cartTotal.textContent = `$${total.toFixed(2)}`;

  // Eventos para inputs y eliminar
  document.querySelectorAll('input[type="number"]').forEach(input => {
    input.addEventListener('change', () => {
      const item = cart.find(p => p.id === input.dataset.id);
      item.quantity = parseInt(input.value);
      updateCart();
    });
  });
  document.querySelectorAll('.remove-item').forEach(btn => {
    btn.addEventListener('click', () => {
      cart = cart.filter(p => p.id !== btn.dataset.id);
      updateCart();
    });
  });
}

// Aplicar cupon
applyCouponBtn.addEventListener('click', () => {
  const code = couponInput.value.trim();
  if (code === 'DESC10') {
    let subtotal = parseFloat(cartSubtotal.textContent.replace('$',''));
    subtotal *= 0.9; // 10% descuento
    const taxes = subtotal * 0.19;
    cartSubtotal.textContent = `$${subtotal.toFixed(2)}`;
    cartTaxes.textContent = `$${taxes.toFixed(2)}`;
    cartTotal.textContent = `$${(subtotal+taxes).toFixed(2)}`;
  }
});
