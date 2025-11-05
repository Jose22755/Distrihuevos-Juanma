import { auth, db } from "../js/firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {

  const checkoutBtn = document.getElementById("checkout");
  const checkoutContainer = document.getElementById("checkoutContainer");
  const closeCheckout = document.getElementById("closeCheckout");
  const confirmPurchase = document.getElementById("confirmPurchase");
  const checkoutItems = document.getElementById("checkoutItems");
  const checkoutTotal = document.getElementById("checkoutTotal");

  let carrito = []; // será cargado desde Firestore
  let userId = null;

  // Detectar usuario autenticado
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      userId = user.uid;

      // Traer carrito desde Firestore
      const carritoDoc = doc(db, "carritos", userId);
      const carritoSnap = await getDoc(carritoDoc);

      if (carritoSnap.exists()) {
        carrito = carritoSnap.data().items || [];
        // Actualizar contador flotante
        const cartCount = document.getElementById("cart-count");
        const totalItems = carrito.reduce((acc, prod) => acc + prod.cantidad, 0);
        cartCount.textContent = totalItems;
      } else {
        carrito = [];
      }
    }
  });

  function abrirCheckout() {
    checkoutItems.innerHTML = "";
    let total = 0;

    if (carrito.length === 0) {
      checkoutItems.innerHTML = `<p>Tu carrito está vacío 🛍️</p>`;
    } else {
      carrito.forEach(prod => {
        const item = document.createElement("div");
        item.textContent = `${prod.nombre} x${prod.cantidad}`;
        const precio = document.createElement("span");
        precio.textContent = `$${prod.precio * prod.cantidad}`;
        precio.style.color = "#ff9800"; // naranja
        item.appendChild(precio);
        checkoutItems.appendChild(item);
        total += prod.precio * prod.cantidad;
      });
    }

    checkoutTotal.textContent = `$${total}`;

    checkoutContainer.style.display = "flex";
    setTimeout(() => checkoutContainer.classList.add("show"), 10);
  }

  function cerrarCheckout() {
    checkoutContainer.classList.remove("show");
    setTimeout(() => checkoutContainer.style.display = "none", 350);
  }

  checkoutBtn.addEventListener("click", abrirCheckout);
  closeCheckout.addEventListener("click", cerrarCheckout);

  confirmPurchase.addEventListener("click", async () => {
    if (!userId) {
      alert("Debes iniciar sesión para finalizar tu compra 😅");
      return;
    }

    // Aquí podrías agregar lógica de confirmación en Firestore o sistema de pagos
    alert("Compra confirmada, manito! 😎");

    // Limpiar carrito en Firestore
    // import { updateDoc } from "firebase/firestore";
    // await updateDoc(doc(db, "carritos", userId), { items: [] });

    carrito = [];
    document.getElementById("cart-count").textContent = 0;
    cerrarCheckout();
  });

});
