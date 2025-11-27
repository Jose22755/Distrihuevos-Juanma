import { auth, db } from "../js/firebase-config.js";
import {
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  addDoc,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { paymentService } from "../js/paymentService.js";
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

// --------------------------------------------------------------
// BOTÓN VERDE "IR A PAGAR" → ABRIR PANEL DE PAGO
// --------------------------------------------------------------
if (btnFinalizar) {
  btnFinalizar.addEventListener("click", () => {
    document.dispatchEvent(new Event("abrirPanelPago"));
  });
}


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
        <h5 class="text-muted">!Tu carrito está vacío!</h5>
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

// 🔹 🔹 NUEVO: hacer cada card clickable
cartContainer.querySelectorAll(".cart-item").forEach((card, index) => {
  card.addEventListener("click", (e) => {
    // Evitar que click en botones de cantidad o eliminar active la redirección
    if (e.target.closest(".btn-qty") || e.target.closest(".remove-item")) return;

    const producto = carritoFiltrado[index]; // obtener producto correspondiente
    if (producto?.id) {
      window.location.href = `product_detail.html?id=${producto.id}`;
    }
  });
});
  actualizarTotales();
  actualizarBotonesCantidad(); // ← agrega esta línea
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

window.cambiarCantidad = async (index, cambio) => {
  // index viene relativo a carritoFiltrado (lo que se renderiza)
  const filteredItem = carritoFiltrado[index];
  if (!filteredItem) return;

  // Buscar índice real en el carrito global por id
  const globalIndex = carrito.findIndex(i => i.id === filteredItem.id);
  if (globalIndex === -1) return;

  const item = carrito[globalIndex];

  // Nueva cantidad
  const nuevaCantidad = item.cantidad + cambio;
  if (nuevaCantidad < 1) return; // no permitir menos de 1

  item.cantidad = nuevaCantidad;

  // Actualizar solo el número de cantidad en el DOM (buscamos el cart-item relativo al render)
  const itemElements = cartContainer.querySelectorAll(".cart-item");
  const itemElement = itemElements[index]; // coincide con carritoFiltrado
  if (itemElement) {
    const cantidadEl = itemElement.querySelector(".cantidad");
    if (cantidadEl) cantidadEl.textContent = item.cantidad;

    const btnMenos = itemElement.querySelector(".btn-qty:first-child");
    const btnMas = itemElement.querySelector(".btn-qty:last-child");

    if (btnMenos) {
      btnMenos.disabled = item.cantidad <= 1;
      btnMenos.classList.toggle("btn-disabled", item.cantidad <= 1);
    }
    if (btnMas) btnMas.disabled = false;
  }

  // Actualizar totales en tiempo real
  actualizarTotales();

  // Actualizar stock en Firestore (buscamos por id)
  try {
    const productoRef = doc(db, "products", item.id);
    const productoSnap = await getDoc(productoRef);
    if (!productoSnap.exists()) {
      Swal.fire("Atención", "El producto ya no está disponible.", "warning");
      return;
    }

    const productoData = productoSnap.data();
    let stockActual = productoData.Stock ?? 0;

    if (cambio > 0) {
      if (stockActual < cambio) {
        Swal.fire("Atención", "No hay suficiente stock disponible.", "warning");
        item.cantidad -= cambio; // revertir cantidad
        if (itemElement) {
          const cantidadEl = itemElement.querySelector(".cantidad");
          if (cantidadEl) cantidadEl.textContent = item.cantidad;
        }
        return;
      }
      stockActual -= cambio;
    } else {
      stockActual += Math.abs(cambio);
    }

    await updateDoc(productoRef, { Stock: stockActual });
  } catch (error) {
    console.error(error);
    Swal.fire("Error", "Ocurrió un problema al actualizar la cantidad.", "error");
  }

  // Guardar carrito actualizado en Firestore (usa la función nueva)
  await guardarCarrito(carrito);
};

// 🗑️ Eliminar producto con mini toast en el centro
window.eliminarItem = async (index) => {
  // index relativo a carritoFiltrado (lo que se está mostrando)
  const filteredItem = carritoFiltrado[index];
  if (!filteredItem) return;

  // Encontrar índice global
  const globalIndex = carrito.findIndex(i => i.id === filteredItem.id);
  if (globalIndex === -1) {
    // Si no está en el carrito global, solo re-renderizamos
    carritoFiltrado = carrito.filter(Boolean);
    renderCarritoCompleto();
    actualizarTotales();
    return;
  }

  const itemEliminado = carrito[globalIndex];

  // Sacar del array global
  carrito.splice(globalIndex, 1);
  carritoFiltrado = [...carrito];

  await guardarCarrito(carrito);
  renderCarritoCompleto();
  actualizarTotales();

  // 🔔 Mostrar toast pequeño en el centro
  Swal.fire({
    position: 'center',
    icon: 'success',
    title: `Producto eliminado ✅`,
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true,
  });

  // Actualizar stock: verificar que exista antes
  try {
    const productoRef = doc(db, "products", itemEliminado.id);
    const productoSnap = await getDoc(productoRef);
    if (!productoSnap.exists()) {
      console.warn(`⚠️ Producto ${itemEliminado.id} ya no existe. No se actualiza stock.`);
      return;
    }
    const productoData = productoSnap.data();
    await updateDoc(productoRef, { Stock: (productoData.Stock || 0) + itemEliminado.cantidad });
  } catch (error) {
    console.error(error);
  }
};


// 🧹 Vaciar carrito
// 🧹 Vaciar carrito con actualización de stock
btnVaciar.addEventListener("click", async () => {
  if (carrito.length === 0) return;

  Swal.fire({
    title: "¿Seguro que deseas vaciar el carrito?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Sí, vaciar",
    cancelButtonText: "Cancelar",
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        // 🔹 Devolver stock
        // 🔹 Devolver stock
      for (const item of carrito) {
        const productoRef = doc(db, "products", item.id);
        const productoSnap = await getDoc(productoRef);
      if (!productoSnap.exists()) {
        console.warn(`⚠️ Producto ${item.id} ya no existe. No se actualiza stock.`);
        continue;
      }

      const productoData = productoSnap.data();
      const stockActual = productoData.Stock ?? 0;
      await updateDoc(productoRef, { Stock: stockActual + item.cantidad });
      }

        // 🔹 Vaciar carrito
        carrito = [];
        carritoFiltrado = [];
        await guardarCarrito();

        renderCarritoCompleto();

        Swal.fire("¡Carrito vaciado!", "Todos los productos han sido devueltos al stock.", "success");
      } catch (error) {
        console.error(error);
        Swal.fire("Error", "Ocurrió un problema al vaciar el carrito.", "error");
      }
    }
  });
});



// ↩️ Seguir comprando
if (btnSeguir) {
  btnSeguir.addEventListener("click", () => {
    window.location.href = "productos.html";
  });
}

// 💾 Guardar carrito
// Guardar carrito (items opcional; por defecto usa la variable global)
async function guardarCarrito(items = carrito) {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        console.warn("⚠️ No hay usuario autenticado, no guardo carrito.");
        return resolve(false);
      }

      try {
        const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
        const ref = doc(db, "carritos", user.uid);
        await setDoc(ref, { items: safeItems });
        resolve(true);
      } catch (error) {
        console.error("Error guardando carrito:", error);
        reject(error);
      }
    });
  });
}


// 💰 Calcular totales
function actualizarTotales() {
  const subtotal = carritoFiltrado.reduce((acc, i) => acc + i.precio * i.cantidad, 0);
  
  // IVA solo como variable interna, NO sumarlo al total
 /* const impuesto = Math.round(subtotal * 0.19);*/

  // Total real SIN IVA
  const total = subtotal; // <- aquí quitamos la suma del impuesto

  if (subtotalEl) subtotalEl.textContent = `$${subtotal.toLocaleString()}`;
  if (impuestoEl) impuestoEl.textContent = `$0`; // ocultamos o ponemos cero
  if (totalEl) totalEl.textContent = `$${total.toLocaleString()}`;
}

// ✅ Finalizar compra con spinner + toast
// ✅ Finalizar compra con spinner + toast (versión con pedidos consecutivos)
// 🧾 Panel Checkout Control


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

// --------------------------------------------------------------
// LOGICA BOTON "VOLVER"
// --------------------------------------------------------------

document.getElementById("btnVolver")?.addEventListener("click", () => {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = "index.html"; // Respaldo
  }
});

function actualizarBotonesCantidad() {
  carritoFiltrado.forEach((item, index) => {
    const itemElement = cartContainer.children[index];
    if (!itemElement) return;

    const btnMenos = itemElement.querySelector(".btn-qty:first-child");
    const btnMas = itemElement.querySelector(".btn-qty:last-child");

    // Desactivar si la cantidad es 1 y aplicar clase gris
    btnMenos.disabled = item.cantidad <= 1;
    btnMenos.classList.toggle("btn-disabled", item.cantidad <= 1);

    // El botón + siempre activo
    btnMas.disabled = false;
  });
}
