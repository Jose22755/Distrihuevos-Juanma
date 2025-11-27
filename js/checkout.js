import { auth, db } from "../js/firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  const checkoutContainer = document.getElementById("checkoutContainer");
  const closeCheckout = document.getElementById("closeCheckout");
  const confirmPurchase = document.getElementById("confirmPurchase");
  const checkoutItems = document.getElementById("checkoutItems");
  const checkoutTotal = document.getElementById("checkoutTotal");

  let carrito = [];
  let usuarioActual = null;
  let metodoPagoSeleccionado = null;

  // 🔹 Recibir método de pago de pagos.js
  document.addEventListener("seleccionarMetodoPago", (e) => {
    metodoPagoSeleccionado = e.detail; // "nequi" o "bancolombia"
  });

  // 🔹 Detectar usuario
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      usuarioActual = user.uid;
      await cargarCarrito();
    } else {
      usuarioActual = null;
      carrito = [];
    }
  });

  // 🔹 Cargar carrito del usuario
  async function cargarCarrito() {
    if (!usuarioActual) return;
    const carritoDoc = doc(db, "carritos", usuarioActual);
    const carritoSnap = await getDoc(carritoDoc);
    carrito = carritoSnap.exists() ? carritoSnap.data().items || [] : [];
  }

  // 🔹 Abrir panel de checkout
  async function abrirCheckout() {
    const paymentPanel = document.getElementById("paymentContainer");

    // Cerrar el panel de pago si está abierto
    if (paymentPanel?.classList.contains("show")) {
      paymentPanel.classList.remove("show");
      setTimeout(() => (paymentPanel.style.display = "none"), 300);
    }

    await cargarCarrito();
    checkoutItems.innerHTML = "";
    let total = 0;

    if (carrito.length === 0) {
      checkoutItems.innerHTML =
        '<p class="text-center text-muted py-3">Tu carrito está vacío 🛍️</p>';
    } else {
      carrito.forEach((prod) => {
        const subtotal = prod.precio * prod.cantidad;
        const item = document.createElement("div");
        item.classList.add("checkout-product-item");

        item.innerHTML = `
          <span>${prod.nombre} × ${prod.cantidad}</span>
          <strong>$${subtotal.toLocaleString()}</strong>
        `;

        checkoutItems.appendChild(item);
        total += subtotal;
      });
    }

    checkoutTotal.textContent = `$${total.toLocaleString()}`;

    // 🔙 Botón para volver al panel de pago
    let volverBtn = document.getElementById("btnVolverPago");
    if (!volverBtn) {
      volverBtn = document.createElement("button");
      volverBtn.id = "btnVolverPago";
      volverBtn.textContent = "← Volver al panel de pago";
      volverBtn.className = "checkout-details-btn mt-3";

      checkoutContainer
        .querySelector(".checkout-modal")
        .insertBefore(volverBtn, confirmPurchase);

      volverBtn.addEventListener("click", () => {
        checkoutContainer.classList.remove("show");
        setTimeout(() => (checkoutContainer.style.display = "none"), 300);

        document.dispatchEvent(new Event("abrirPanelPago"));
      });
    }

    checkoutContainer.style.display = "flex";
    setTimeout(() => checkoutContainer.classList.add("show"), 10);
  }

  function cerrarCheckout() {
    checkoutContainer.classList.remove("show");
    setTimeout(() => (checkoutContainer.style.display = "none"), 300);
  }

  closeCheckout?.addEventListener("click", cerrarCheckout);
  document.addEventListener("abrirCheckoutForce", abrirCheckout);

});
