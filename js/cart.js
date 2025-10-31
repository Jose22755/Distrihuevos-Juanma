import { auth, db } from "../js/firebase-config.js";
import {
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

// 🧺 Variables globales
let usuarioActual = null;
let carrito = [];
let carritoFiltrado = []; // 🆕 Para manejar las búsquedas

// 🔗 Referencias HTML
const cartContainer = document.querySelector(".col-lg-8");
const subtotalEl = document.querySelector("#subtotal");
const impuestoEl = document.querySelector("#impuesto");
const totalEl = document.querySelector("#total");
const btnFinalizar = document.querySelector(".btn-checkout");
const btnVaciar = document.querySelector(".btn-vaciar");
const btnSeguir = document.querySelector(".btn-seguir");

// 🔍 Referencias del buscador
const inputBusqueda = document.querySelector("#busqueda");
const searchForm = document.querySelector("#searchForm");

// 👤 Detectar usuario
onAuthStateChanged(auth, (user) => {
  if (user) {
    usuarioActual = user.uid;
    cargarCarrito();
  } else {
    cartContainer.innerHTML = `
      <div class="text-center mt-5">
        <h5 class="text-danger">Por favor inicia sesión para ver tu carrito 🥚</h5>
      </div>
    `;
  }
});

// 🔥 Escuchar cambios del carrito sin parpadeos
function cargarCarrito() {
  const ref = doc(db, "carritos", usuarioActual);

  onSnapshot(ref, (docSnap) => {
    if (!docSnap.exists()) {
      carrito = [];
      renderCarritoCompleto();
      return;
    }

    const nuevosItems = docSnap.data().items || [];

    // 🧩 Si no había carrito, render completo
    if (carrito.length === 0) {
      carrito = nuevosItems;
      carritoFiltrado = [...carrito];
      renderCarritoCompleto();
      return;
    }

    // ⚡ Detectar y actualizar solo los productos cambiados
    nuevosItems.forEach((nuevo, i) => {
      const anterior = carrito[i];
      if (!anterior || anterior.cantidad !== nuevo.cantidad || anterior.precio !== nuevo.precio) {
        carrito[i] = nuevo;
        const itemElement = cartContainer.children[i];
        if (itemElement) itemElement.outerHTML = renderItem(nuevo, i);
      }
    });

    if (nuevosItems.length !== carrito.length) {
      carrito = nuevosItems;
      carritoFiltrado = [...carrito];
      renderCarritoCompleto();
    }

    actualizarTotales();
  });
}

// 🥚 Renderizar todo el carrito
function renderCarritoCompleto() {
  if (!cartContainer) return;

  // ✅ Si no se encuentra ningún producto en la búsqueda
  if (carritoFiltrado.length === 0 && carrito.length > 0) {
    cartContainer.innerHTML = `
      <div class="text-center mt-5">
        <h5 class="fw-semibold text-dark">⚠️ Producto no añadido al carrito</h5>
        <button class="btn btn-outline-success mt-3" onclick="window.location.href='productos.html'">
          <i class="bi bi-plus-circle" style="font-size: 1.2rem; vertical-align: middle;"></i>
          <span class="ms-1">Ver más productos</span>
        </button>
      </div>
    `;
    actualizarTotales();
    return;
  }

  // ✅ Si el carrito está completamente vacío
  if (carritoFiltrado.length === 0 && carrito.length === 0) {
    cartContainer.innerHTML = `
      <div class="text-center mt-5">
        <h5 class="text-muted">Tu carrito está vacío 🥚</h5>
        <button class="btn btn-outline-success mt-3" onclick="window.location.href='productos.html'">
          <i class="bi bi-plus-circle" style="font-size: 1.2rem; vertical-align: middle;"></i>
          <span class="ms-1">Ver más productos</span>
        </button>
      </div>
    `;
    actualizarTotales();
    return;
  }

  // ✅ Si hay productos en el carrito
  const html = carritoFiltrado.map((item, i) => renderItem(item, i)).join("");

  // 🟢 Botón “Ver más productos” debajo del último producto
  const botonVerMas = `
    <div class="text-center mt-5">
      <button class="btn btn-outline-success mt-3" onclick="window.location.href='productos.html'">
        <i class="bi bi-plus-circle" style="font-size: 1.2rem; vertical-align: middle;"></i>
        <span class="ms-1">Ver más productos</span>
      </button>
    </div>
  `;

  cartContainer.innerHTML = html + botonVerMas;
  actualizarTotales();
}

// 🧱 Renderizar un solo producto
function renderItem(item, i) {
  return `
    <div class="cart-item d-flex align-items-center mb-3 p-4 rounded shadow-custom bg-white">
      <img src="${item.imagen}" alt="${item.nombre}" class="rounded me-3 shadow-sm" width="100">
      <div class="flex-grow-1">
        <h5 class="mb-2 fw-semibold text-success">${item.nombre}</h5>
        <p class="precio mb-2">
          <span class="precio-label">Precio:</span>
          <span class="precio-valor" style="color:#ff9800;">$${item.precio.toLocaleString()}</span>
        </p>

        <div class="cantidad-stock d-flex align-items-center mt-2">
          <small class="stock-label me-2 fw-semibold text-muted">Cantidad:</small>
          <div class="cantidad-control d-flex align-items-center">
            <button class="btn-qty" onclick="cambiarCantidad(${i}, -1)">−</button>
            <span class="cantidad mx-1 fw-bold">${item.cantidad}</span>
            <button class="btn-qty" onclick="cambiarCantidad(${i}, 1)">+</button>
          </div>
        </div>
      </div>

      <button class="remove-item ms-3 d-flex align-items-center" onclick="eliminarItem(${i})">
        <i class="bi bi-trash3-fill me-1"></i>
        <span>Eliminar</span>
      </button>
    </div>
  `;
}

// ➕➖ Cambiar cantidad
window.cambiarCantidad = async (index, cambio) => {
  const item = carrito[index];
  if (!item) return;

  item.cantidad += cambio;
  if (item.cantidad <= 0) {
    carrito.splice(index, 1);
    carritoFiltrado = [...carrito];
    await guardarCarrito();
    renderCarritoCompleto();
    return;
  }

  const itemElement = cartContainer.children[index];
  const cantidadEl = itemElement?.querySelector(".cantidad");
  if (cantidadEl) cantidadEl.textContent = item.cantidad;

  await guardarCarrito();
  actualizarTotales();
};

// 🗑️ Eliminar producto
window.eliminarItem = async (index) => {
  carrito.splice(index, 1);
  carritoFiltrado = [...carrito];
  await guardarCarrito();
};

// 🧹 Vaciar carrito
if (btnVaciar) {
  btnVaciar.addEventListener("click", async () => {
    if (confirm("¿Seguro que deseas vaciar el carrito?")) {
      carrito = [];
      carritoFiltrado = [];
      await guardarCarrito();
    }
  });
}

// ↩️ Seguir comprando
if (btnSeguir) {
  btnSeguir.addEventListener("click", () => {
    window.location.href = "productos.html";
  });
}

// 💾 Guardar carrito
async function guardarCarrito() {
  const ref = doc(db, "carritos", usuarioActual);
  await setDoc(ref, { items: carrito });
}

// 💰 Calcular totales
function actualizarTotales() {
  const subtotal = carritoFiltrado.reduce((acc, i) => acc + i.precio * i.cantidad, 0);
  const impuesto = Math.round(subtotal * 0.19);
  const total = subtotal + impuesto;

  if (subtotalEl) subtotalEl.textContent = `$${subtotal.toLocaleString()}`;
  if (impuestoEl) impuestoEl.textContent = `$${impuesto.toLocaleString()}`;
  if (totalEl) totalEl.textContent = `$${total.toLocaleString()}`;
}

// ✅ Finalizar compra
if (btnFinalizar) {
  btnFinalizar.addEventListener("click", async () => {
    if (carrito.length === 0) return alert("Tu carrito está vacío 🥚");

    const refPedido = doc(db, "pedidos", `${usuarioActual}_${Date.now()}`);
    await setDoc(refPedido, {
      items: carrito,
      total: carrito.reduce((acc, i) => acc + i.precio * i.cantidad, 0),
      fecha: new Date().toISOString(),
      estado: "pendiente",
    });

    await deleteDoc(doc(db, "carritos", usuarioActual));
    alert("✅ ¡Pedido confirmado con éxito!");
    window.location.href = "pedidos.html";
  });
}

// 🔎 Buscador en tiempo real
if (inputBusqueda) {
  inputBusqueda.addEventListener("input", (e) => {
    const valor = e.target.value.toLowerCase().trim();

    if (valor === "") {
      carritoFiltrado = [...carrito];
    } else {
      carritoFiltrado = carrito.filter((item) =>
        item.nombre.toLowerCase().includes(valor)
      );
    }

    renderCarritoCompleto();
  });
}
