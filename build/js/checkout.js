import { auth, db } from "../js/firebase-config.js";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  limit,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  const checkoutContainer = document.getElementById("checkoutContainer");
  const closeCheckout = document.getElementById("closeCheckout");
  const confirmPurchase = document.getElementById("confirmPurchase");
  const checkoutItems = document.getElementById("checkoutItems");
  const checkoutTotal = document.getElementById("checkoutTotal");
  const checkoutBtn = document.querySelector(".btn-checkout");

  const spinner = document.getElementById("spinnerCarga");
  const toast = document.getElementById("toastExito");

  let carrito = [];
  let usuarioActual = null;

  // 🔐 Detectar usuario autenticado
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      usuarioActual = user.uid;
      await cargarCarrito();
    } else {
      usuarioActual = null;
      carrito = [];
    }
  });

  // 🧺 Cargar carrito del usuario desde Firestore
  async function cargarCarrito() {
    if (!usuarioActual) return;

    const carritoDoc = doc(db, "carritos", usuarioActual);
    const carritoSnap = await getDoc(carritoDoc);

    carrito = carritoSnap.exists() ? carritoSnap.data().items || [] : [];
  }

  // 🧾 Abrir el panel de checkout
  async function abrirCheckout() {
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
    checkoutContainer.style.display = "flex";

    // Activar animación
    setTimeout(() => checkoutContainer.classList.add("show"), 10);
  }

  // ❌ Cerrar el panel
  function cerrarCheckout() {
    checkoutContainer.classList.remove("show");
    setTimeout(() => (checkoutContainer.style.display = "none"), 300);
  }

  // 🎯 Eventos de botones
  if (checkoutBtn) checkoutBtn.addEventListener("click", abrirCheckout);
  if (closeCheckout) closeCheckout.addEventListener("click", cerrarCheckout);

  // ✅ Confirmar compra
  if (confirmPurchase) {
    confirmPurchase.addEventListener("click", async () => {
      if (!usuarioActual) {
        alert("Debes iniciar sesión para finalizar tu compra 😅");
        return;
      }

      if (carrito.length === 0) {
        alert("Tu carrito está vacío 🥚");
        return;
      }

      try {
        spinner.style.display = "flex";

        // Buscar el último pedido para asignar número
        const pedidosRef = collection(db, "pedidos");
        const q = query(pedidosRef, orderBy("pedidoNumero", "desc"), limit(1));
        const snapshot = await getDocs(q);

        let nuevoNumero = 1;
        if (!snapshot.empty) {
          const ultimo = snapshot.docs[0].data();
          nuevoNumero = (ultimo.pedidoNumero || 0) + 1;
        }

        const codigoPedido = `PED-${nuevoNumero}`;

        // 💾 Guardar pedido
        await setDoc(doc(db, "pedidos", codigoPedido), {
          pedidoNumero: nuevoNumero,
          codigoPedido,
          usuario: usuarioActual,
          items: carrito,
          total: carrito.reduce(
            (acc, i) => acc + i.precio * i.cantidad,
            0
          ),
          fecha: new Date().toISOString(),
          metodoPago: "pendiente",
          referenciaPago: "N/A",
          estado: "pendiente",
        });

        // 🧹 Vaciar carrito
        await setDoc(doc(db, "carritos", usuarioActual), { items: [] });

        // Limpiar UI
        carrito = [];
        checkoutItems.innerHTML =
          '<p class="text-center text-muted py-3">Tu carrito está vacío 🛍️</p>';
        checkoutTotal.textContent = "$0";

        spinner.style.display = "none";

        // 🎉 Mostrar toast
        toast.innerHTML = `
          <div class="toast-body">
            <h4>✅ Pedido realizado con éxito</h4>
            <p>Tu número de pedido es <strong>${codigoPedido}</strong>.</p>
            <p>Gracias por tu compra 🥚</p>
          </div>
        `;
        toast.style.display = "flex";
        setTimeout(() => toast.classList.add("show"), 50);

        // ⏱️ Cerrar toast + panel + redirigir
        setTimeout(() => {
          toast.classList.remove("show");
          setTimeout(() => {
            toast.style.display = "none";
            cerrarCheckout();
            window.location.href = "pedidos.html";
          }, 500);
        }, 2500);
      } catch (error) {
        spinner.style.display = "none";
        console.error("❌ Error al procesar el pedido:", error);
        alert("Ocurrió un error al procesar el pedido. Intenta de nuevo.");
      }
    });
  }
});
