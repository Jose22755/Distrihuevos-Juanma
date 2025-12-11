// ../js/catalog.js
import { auth, db } from "../js/firebase-config.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

/*
  Catalog.js - Reescritura completa
  - Resuelve problemas de duplicación de listeners/ejecuciones
  - Manejo robusto de vaciado de carrito y actualización de stocks
  - Exposición mínima de variables a window para compatibilidad con index.html
*/

/* ==========================
   🔹 VARIABLES GLOBALES
   ========================== */
let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
let usuarioUID = null;
let productosArray = [];
let stockCache = {}; // cache local del stock
let isClearingCart = false; // bloqueo para evitar ejecuciones duplicadas

/* ==========================
   🔹 ELEMENTOS DOM (selección)
   ========================== */
const contenedor = document.getElementById("productos-container");
const spinner = document.getElementById("productos-spinner");
const cartPanel = document.getElementById("cart-panel");
const cartOverlay = document.getElementById("cart-overlay");
const floatingCartBtn = document.getElementById("floating-cart");
const closeCartBtn = document.getElementById("close-cart");
const goToCartBtn = document.getElementById("go-to-cart");
const searchInput = document.getElementById("searchInput");
const clearCartBtnGlobal = document.getElementById("clear-cart"); // botón en DOM

// ==========================
// 🍔 MENÚ HAMBURGUESA + SUBMENÚ PERFIL (VERSIÓN FINAL)
// ==========================
document.addEventListener("DOMContentLoaded", () => {
  const menuTrigger = document.getElementById("menuTrigger");
  const sideMenu = document.getElementById("sideMenu");
  const hamburger = menuTrigger?.querySelector(".hamburger");

  // Crear overlay si no existe
  let overlay = document.getElementById("menuOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "menuOverlay";
    overlay.className = "menu-overlay";
    document.body.appendChild(overlay);
  }

  // === FUNCIONES ===
  const openMenu = () => {
    hamburger?.classList.add("active");
    sideMenu?.classList.add("open");
    overlay?.classList.add("show");
  };

  const closeMenu = () => {
    hamburger?.classList.remove("active");
    sideMenu?.classList.remove("open");
    overlay?.classList.remove("show");

    // Cierra submenú si está abierto
    submenuPerfil?.classList.remove("open");
    const arrow = perfilToggle?.querySelector(".arrow");
    if (arrow) arrow.classList.remove("rotate");
  };

  const toggleMenu = (e) => {
    e?.stopPropagation();
    if (sideMenu?.classList.contains("open")) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  // === EVENTOS ===
  if (menuTrigger) {
    menuTrigger.addEventListener("click", toggleMenu);
  } else {
    console.warn("⚠️ menuTrigger no encontrado — revisa tu HTML");
  }

  overlay?.addEventListener("click", closeMenu);

  // === SUBMENÚ PERFIL ===
  const perfilToggle = document.getElementById("perfilToggle");
  const submenuPerfil = document.getElementById("submenuPerfil");

  if (perfilToggle && submenuPerfil) {
    perfilToggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      submenuPerfil.classList.toggle("open");

      const arrow = perfilToggle.querySelector(".arrow");
      if (arrow) arrow.classList.toggle("rotate");
    });
  } else {
    console.warn("⚠️ Submenú de perfil no encontrado en el DOM");
  }
});

/* ==========================
   👤 AUTENTICACIÓN / LOGOUT
   ========================== */
// Versión extendida para desktop + mobile
const userNameDesktop = document.getElementById("userNameDesktop");
const userNameMobile = document.getElementById("userNameMobile");

const logoutBtnDesktop = document.getElementById("logoutBtnDesktop");
const logoutBtnMobile = document.getElementById("logoutBtnMobile");


onAuthStateChanged(auth, (user) => {
  if (user) {
    const name = user.displayName || user.email?.split("@")[0] || "Usuario";

    if (userNameDesktop) userNameDesktop.textContent = name;
    if (userNameMobile) userNameMobile.textContent = name;

  } else {
    if (userNameDesktop) userNameDesktop.textContent = "Usuario";
    if (userNameMobile) userNameMobile.textContent = "Usuario";
  }
});



function logoutUser() {
  const spinnerOverlay = document.getElementById("logout-spinner");

  if (spinnerOverlay) spinnerOverlay.style.display = "flex";

  setTimeout(async () => {
    try {
      await signOut(auth);
      window.location.href = "login.html";
    } catch (err) {
      console.error("Logout error:", err);
      if (spinnerOverlay) spinnerOverlay.style.display = "none";
    }
  }, 700);
}

// Inicializar listeners
if (logoutBtnDesktop) logoutBtnDesktop.addEventListener("click", logoutUser);
if (logoutBtnMobile) logoutBtnMobile.addEventListener("click", logoutUser);


/* ==========================
   🔄 SPINNER UTILS
   ========================== */
function showSpinner() { if (spinner) spinner.style.display = "flex"; }
function hideSpinner() { if (spinner) spinner.style.display = "none"; }

/* ==========================
   🔹 INICIALIZACIÓN (DOMContentLoaded)
   ========================== */
document.addEventListener("DOMContentLoaded", async () => {
  // 🧩 Escucha autenticación -> carga carrito si hay usuario
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      usuarioUID = user.uid;
      await cargarCarritoDesdeFirestore();
      escucharCambiosCarrito();
    } else {
      usuarioUID = null;
      carrito = [];
      localStorage.removeItem("carrito");
      updateCartCount();
    }
  });

  // 🥚 Carga inicial de productos
  await cargarProductos();

  // 🔄 Escuchar cambios en colección "products"
  escucharCambiosProductos();

const agotados = productosArray.filter(p => p.Stock <= 0);
renderProductosAgotados(agotados);


  // ⚙️ Eventos de UI
  floatingCartBtn?.addEventListener("click", openCartPanel);
  closeCartBtn?.addEventListener("click", closeCartPanel);
  cartOverlay?.addEventListener("click", closeCartPanel);
  goToCartBtn?.addEventListener("click", () => (window.location.href = "cart.html"));

  /* ==========================
     🔍 BÚSQUEDA DE PRODUCTOS (compatible con tu <form>)
     ========================== */
  const searchForm = document.getElementById("searchForm");
  const searchBtn = document.querySelector(".btn-search");
  const searchInputEl = document.getElementById("searchInput");
  const contenedor = document.getElementById("productos-container"); // ✅ tu contenedor real

  if (searchForm && searchInputEl) {
    // 🔸 Previene recarga y ejecuta búsqueda al enviar el form
    searchForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      await ejecutarBusqueda(searchInputEl.value);
      setTimeout(() => animarResultados(), 150);
    });

    // 🔸 Búsqueda automática mientras el usuario escribe
    searchInputEl.addEventListener("input", async () => {
      await ejecutarBusqueda(searchInputEl.value);
      setTimeout(() => animarResultados(), 150);
    });

    // 🔸 Búsqueda manual con Enter
    searchInputEl.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        await ejecutarBusqueda(searchInputEl.value);
        setTimeout(() => animarResultados(), 150);
      }
    });

    // 🔸 Clic en la lupa hace lo mismo que el Enter
    if (searchBtn) {
      searchBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        await ejecutarBusqueda(searchInputEl.value);
        setTimeout(() => animarResultados(), 150);
      });
    }
  }
});

/* ==========================
   🔹 FUNCIÓN AUXILIAR DE BÚSQUEDA
   ========================== */
async function ejecutarBusqueda(valorBusqueda) {
  const valor = normalizarTexto(valorBusqueda);
  const palabrasBusqueda = valor === "" ? [] : valor.split(/\s+/);

  // ✅ Si el campo está vacío → mostrar todos los productos
  if (palabrasBusqueda.length === 0) {
    renderProductos(productosArray);
    return;
  }

  // 🔍 Mantiene tu lógica exacta de coincidencia por palabra
  const filtrados = productosArray.filter((p) => {
    const nombre = normalizarTexto(p.Nombre || "");
    const palabrasNombre = nombre.split(/\s+/);
    return palabrasBusqueda.every((palabra) => palabrasNombre.includes(palabra));
  });

  // ✅ Mostrar mensaje o resultados
  if (filtrados.length === 0) {
    mostrarProductoNoDisponible();
  } else {
    renderProductos(filtrados);
  }
}

/* ==========================
   ✨ ANIMACIÓN DE CONFIRMACIÓN DE BÚSQUEDA
   ========================== */
function animarResultados() {
  const cards = Array.from(document.querySelectorAll("#productos-container .card"))
    .filter(c => c.offsetParent !== null);

  if (cards.length === 0) return;

  // Añade una animación sutil de aparición
  cards.forEach(card => {
    card.style.transition = "transform 0.3s ease, opacity 0.3s ease";
    card.style.opacity = "0.5";
    card.style.transform = "scale(0.97)";
    setTimeout(() => {
      card.style.opacity = "1";
      card.style.transform = "scale(1)";
    }, 50);
  });
}

/* ==========================
   🔹 CARGAR PRODUCTOS desde Firestore
   ========================== */
export async function cargarProductos() {
  if (!contenedor) return;
  showSpinner();
  try {
    const querySnapshot = await getDocs(collection(db, "products"));
    productosArray = [];
    querySnapshot.forEach((docSnap) => {
      const p = docSnap.data();
      p.id = docSnap.id;
      productosArray.push(p);
      stockCache[p.id] = p.Stock ?? 0;
    });
    renderProductos(productosArray);
  } catch (err) {
    console.error("Error cargando productos:", err);
    if (contenedor) contenedor.innerHTML = "<p>Error al cargar productos.</p>";
  } finally {
    hideSpinner();
  }
}

/* ==========================
   🔹 NORMALIZACIÓN / UI HELPERS
   ========================== */
function normalizarTexto(texto) {
  return (texto || "").toString().toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/* ==========================
   ⚠️ MENSAJE DE PRODUCTO NO DISPONIBLE
   ========================== */
function mostrarProductoNoDisponible() {
  if (!contenedor) return;
  contenedor.innerHTML = `
    <div class="no-products">
      ⚠️ <span>Producto no disponible</span>
    </div>
  `;
}


/* ==========================
   🔹 CARRITO FIRESTORE
   ========================== */
async function cargarCarritoDesdeFirestore() {
  if (!usuarioUID) return;
  const docRef = doc(db, "carritos", usuarioUID);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    carrito = docSnap.data().items || [];
    localStorage.setItem("carrito", JSON.stringify(carrito));
    updateCartCount();
  } else {
    await setDoc(docRef, { items: [] });
  }
}

function escucharCambiosCarrito() {
  if (!usuarioUID) return;
  const docRef = doc(db, "carritos", usuarioUID);
  onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      carrito = snapshot.data().items || [];
      localStorage.setItem("carrito", JSON.stringify(carrito));
      renderCartPanel();
      updateCartCount();
    }
  });
}

async function guardarCarritoEnFirestore() {
  if (!usuarioUID) return;
  try {
    const carritoRef = doc(db, "carritos", usuarioUID);
    await setDoc(carritoRef, { items: carrito });
  } catch (err) {
    console.error("Error guardando carrito:", err);
  }
}

/* ==========================
   🔹 ESCUCHAR CAMBIOS EN PRODUCTS (onSnapshot)
   ========================== */
function escucharCambiosProductos() {
  const productosRef = collection(db, "products");
  onSnapshot(productosRef, (snapshot) => {
    let necesitaReRender = false;

    snapshot.docChanges().forEach((change) => {
      const p = change.doc.data();
      p.id = change.doc.id;

      if (change.type === "modified") {
        const index = productosArray.findIndex((prod) => prod.id === p.id);
        if (index !== -1) {
          productosArray[index] = p;
          stockCache[p.id] = p.Stock ?? 0;
          actualizarStockCard(p.id);
        }
      } else if (change.type === "added") {
        // Evitamos duplicados: solo agregamos si no existe ya en productosArray
        if (!productosArray.some((prod) => prod.id === p.id)) {
          productosArray.push(p);
          stockCache[p.id] = p.Stock ?? 0;
          necesitaReRender = true;
        } else {
          // si ya existe actualizamos cache/valor por si cambió stock
          stockCache[p.id] = p.Stock ?? stockCache[p.id] ?? 0;
        }
      } else if (change.type === "removed") {
        productosArray = productosArray.filter((prod) => prod.id !== p.id);
        delete stockCache[p.id];
        necesitaReRender = true;
      }
    });

    if (necesitaReRender) renderProductos(productosArray);
  });
}


const checkoutBtn = document.getElementById("checkout");
checkoutBtn?.addEventListener("click", () => {
  if (carrito.length === 0) {
Swal.fire({
  icon: "warning",
  title: "Tu carrito está vacío 🛒❌",
  text: "No puedes finalizar la compra",
  position: "center",
  showConfirmButton: false,
  heightAuto: false,
  timer: 2500,
  timerProgressBar: true
});
    return;
  }
  window.location.href = "cart.html";
});


/* ==========================
   🔹 UTILIDADES DE CARRITO EN UI
   ========================== */
function updateCartCount() {
  const totalCantidad = carrito.reduce((acc, item) => acc + item.cantidad, 0);
  const headerCount = document.querySelector(".header-right .cart-count");
  const floatingCount = document.getElementById("cart-count");
  if (headerCount) headerCount.textContent = totalCantidad;
  if (floatingCount) {
    floatingCount.textContent = totalCantidad;
    try {
      floatingCount.animate([{ transform: "scale(1)" }, { transform: "scale(1.3)" }, { transform: "scale(1)" }], { duration: 300, easing: "ease-out" });
    } catch (e) {}
  }
}
// Para compatibilidad con tus otros scripts
function actualizarCarrito() { updateCartCount(); }

/* ==========================
   🔹 PANEL CARRITO (render + handlers)
   ========================== */
function openCartPanel() {
  cartPanel?.classList.add("open");
  cartOverlay?.classList.add("active");
  renderCartPanel();
}
function closeCartPanel() {
  cartPanel?.classList.remove("open");
  cartOverlay?.classList.remove("active");
}

function renderCartPanel() {
  const container = document.getElementById("cart-items");
  const subtotalEl = document.getElementById("cart-subtotal");
  const totalEl = document.getElementById("cart-total");
  if (!container) return;

  if (carrito.length === 0) {
    container.innerHTML = `<p class="empty-cart">Tu carrito está vacío 🛍️</p>`;
    if (subtotalEl) subtotalEl.textContent = "$0";
    if (totalEl) totalEl.textContent = "$0";
    return;
  }

  let html = "";
  let subtotal = 0;
  carrito.forEach((item, index) => {
    const itemTotal = item.precio * item.cantidad;
    subtotal += itemTotal;
    html += `
      <div class="cart-item">
        <img src="${item.imagen || 'https://cdn.pixabay.com/photo/2017/03/19/03/18/eggs-2151533_1280.jpg'}" alt="${item.nombre}" class="cart-item-img">
        <div class="cart-item-info">
          <h4>${item.nombre}</h4>
          <p><span class="precio-label">Precio:</span> $${item.precio.toLocaleString()}</p>
          <div class="cart-item-actions">
            <span class="cantidad-label">Cant:</span>
            <button class="qty-btn minus" data-index="${index}">−</button>
            <span class="cart-qty">${item.cantidad}</span>
            <button class="qty-btn plus" data-index="${index}">+</button>
            <button class="remove-item" data-index="${index}">❌ <span>Eliminar</span></button>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  if (subtotalEl) subtotalEl.textContent = `$${subtotal.toLocaleString()}`;
  if (totalEl) totalEl.textContent = `$${subtotal.toLocaleString()}`;

  // Handlers: añadimos onclick (sobrescribe previos) para evitar duplicados
  container.querySelectorAll(".qty-btn.plus").forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.index, 10);
      const item = carrito[idx];
      if (!item) return;

      if ((stockCache[item.id] ?? 0) <= 0) {
Swal.fire({
  icon: "error",
  title: "Sin stock disponible ❌",
  position: "center",
  showConfirmButton: false,
  heightAuto: false,
  timer: 2000,
  timerProgressBar: true
});

        return;
      }

      item.cantidad += 1;
      stockCache[item.id] -= 1;

      // ✅ actualizar solo UI sin volver a renderizar todo
      const qtySpan = container.querySelectorAll(".cart-qty")[idx];
      if (qtySpan) qtySpan.textContent = item.cantidad;
      actualizarStockCard(item.id);
      updateCartCount();

      (async () => {
        try {
          const productoRef = doc(db, "products", item.id);
          await updateDoc(productoRef, { Stock: stockCache[item.id] });
          await guardarCarritoEnFirestore();
        } catch (err) { console.error(err); }
      })();
    };

  });

   container.querySelectorAll(".qty-btn.minus").forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.index, 10);
      const item = carrito[idx];
      if (!item) return;

      item.cantidad -= 1;
      stockCache[item.id] += 1;

      if (item.cantidad <= 0) carrito.splice(idx, 1);

      renderCartPanel();
      actualizarStockCard(item.id);
      updateCartCount();

      (async () => {
        try {
          const productoRef = doc(db, "products", item.id);
          await updateDoc(productoRef, { Stock: stockCache[item.id] });
          await guardarCarritoEnFirestore();
        } catch (err) { console.error(err); }
      })();
    };
  });
    container.querySelectorAll(".remove-item").forEach(btn => {
  btn.onclick = async () => {
    const idx = parseInt(btn.dataset.index, 10);
    const item = carrito[idx];
    if (!item) return;

    try {
      const productoRef = doc(db, "products", item.id);
      const snap = await getDoc(productoRef);
      const stockActual = (snap.exists() ? snap.data().Stock ?? 0 : 0) + item.cantidad;

      // actualizar Firestore
      await updateDoc(productoRef, { Stock: stockActual });

      // actualizar cache y array local
      stockCache[item.id] = stockActual;
      const prodIdx = productosArray.findIndex(p => p.id === item.id);
      if (prodIdx !== -1) productosArray[prodIdx].Stock = stockActual;

      // eliminar del carrito
      carrito.splice(idx, 1);
      localStorage.setItem("carrito", JSON.stringify(carrito));
      await guardarCarritoEnFirestore();

      // actualizar UI
      renderCartPanel();
      actualizarStockCard(item.id);
      updateCartCount();
Swal.fire({
  icon: "success",
  title: `"${item.nombre}" eliminado del carrito ❌`,
  position: "center",
  showConfirmButton: false,
  heightAuto: false,
  timer: 2000,
  timerProgressBar: true
});
    } catch (err) {
      console.error("❌ Error al eliminar producto:", err);
Swal.fire({
  toast: true,
  icon: "error",
  title: "Error al eliminar producto",
  position: "center",
  showConfirmButton: false,
  timer: 2000,
  timerProgressBar: true
});
    }
  };
});
}

/* ==========================
   🔹 VACIAR CARRITO - handler robusto
   ========================== */
async function handleClearCart() {
  if (isClearingCart) return;
  isClearingCart = true;

  try {
    if (carrito.length === 0) {
Swal.fire({
  icon: "error",
  title: "Error al vaciar el carrito",
  position: "center",
  showConfirmButton: false,
  heightAuto: false,
  timer: 2000,
  timerProgressBar: true
});
      isClearingCart = false;
      return;
    }

    const copia = carrito.slice(); // copia para no mutar mientras iteramos

    for (const item of copia) {
      const productoRef = doc(db, "products", item.id);
      const snap = await getDoc(productoRef);
      let stockActual = (snap.exists() ? snap.data().Stock ?? 0 : 0) + item.cantidad;

      // actualizar Firestore primero
      await updateDoc(productoRef, { Stock: stockActual });

      // actualizar cache y array local
      stockCache[item.id] = stockActual;
      const idx = productosArray.findIndex(p => p.id === item.id);
      if (idx !== -1) productosArray[idx].Stock = stockActual;

      // actualizar visualmente la card
      actualizarStockCard(item.id);
    }

    // limpiar carrito local y Firestore
    carrito = [];
    localStorage.removeItem("carrito");
    await guardarCarritoEnFirestore();

    // actualizar UI del panel
    renderCartPanel();
    updateCartCount();

Swal.fire({
  icon: "success",
  title: "Carrito vaciado y stock actualizado 🗑️✅",
  position: "center",
  showConfirmButton: false,
  heightAuto: false,
  timer: 1500,
  timerProgressBar: true
});

  } catch (err) {
    console.error("❌ Error al vaciar carrito:", err);
Swal.fire({
  icon: "error",
  title: "Error al vaciar el carrito",
  timer: 2000,
  showConfirmButton: false,
  heightAuto: false
});

  } finally {
    setTimeout(() => { isClearingCart = false; }, 300);
  }
  
}


const clearCartBtn = document.getElementById("clear-cart");

clearCartBtn?.addEventListener("click", () => {
    handleClearCart();
});



/* ==========================
   🔹 ACTUALIZAR STOCK EN CARDS
   ========================== */
function actualizarStockCard(productId, nuevoStockArg) {
  const card = document.querySelector(`.card[data-id="${productId}"]`);
  const producto = productosArray.find(p => p.id === productId) || {};
  const enCarrito = carrito.find(i => i.id === productId);
  const stockFromCache = stockCache[productId];
  const stockCalculated = (typeof nuevoStockArg !== "undefined")
    ? nuevoStockArg
    : (typeof stockFromCache !== "undefined" ? stockFromCache : (producto.Stock ?? 0) - (enCarrito?.cantidad ?? 0));

  // actualizar cache si se recibió nuevoStockArg
  if (typeof nuevoStockArg !== "undefined") stockCache[productId] = nuevoStockArg;

  if (!card) return;
  const stockSpan = card.querySelector(".stock");
  if (stockSpan) {
    stockSpan.textContent = stockCalculated > 0 ? `Stock: ${stockCalculated}` : "Sin stock";
    stockSpan.style.background = stockCalculated > 0 ? "linear-gradient(90deg,#4CAF50,#81C784)" : "linear-gradient(90deg,#e53935,#ef5350)";
  }
  const addBtn = card.querySelector(".btn-add");
  if (addBtn) {
    addBtn.disabled = stockCalculated <= 0;
    addBtn.innerHTML = stockCalculated > 0 ? `<i class="bi bi-cart-plus"></i> Agregar` : `<i class="bi bi-x-circle"></i> Agotado`;
    addBtn.style.background = stockCalculated > 0 ? "linear-gradient(90deg,#4CAF50,#66bb6a)" : "linear-gradient(90deg,#9e9e9e,#bdbdbd)";
  }
  const cantidadEl = card.querySelector(".cantidad");
  if (cantidadEl) {
    let cant = parseInt(cantidadEl.textContent) || 0;
    if (stockCalculated <= 0) cant = 0;
    else if (cant > stockCalculated) cant = stockCalculated;
    cantidadEl.textContent = cant;
  }
}


/* ==========================
   🔹 RENDER PRODUCTOS (optimizado)
   ========================== */
function renderProductos(productos) {
  if (!contenedor) return;

  // quick path: si el DOM ya tiene exactamente las mismas ids, solo actualiza las tarjetas existentes
  const existingCards = Array.from(contenedor.querySelectorAll(".card")).map(c => c.getAttribute("data-id"));
  const allIdsMatch = existingCards.length === productos.length && productos.every((p, i) => existingCards[i] === p.id);

  if (existingCards.length > 0 && allIdsMatch) {
    productos.forEach(p => {
      const card = contenedor.querySelector(`.card[data-id="${p.id}"]`);
      if (!card) return;
      const enCarrito = carrito.find(i => i.id === p.id);
      const stockActual = stockCache[p.id] ?? (p.Stock ?? 0) - (enCarrito?.cantidad ?? 0);
      const tieneStock = stockActual > 0;
      const stockSpan = card.querySelector(".stock");
      if (stockSpan) {
        stockSpan.textContent = tieneStock ? `Stock: ${stockActual}` : "Sin stock";
        stockSpan.style.background = tieneStock ? "linear-gradient(90deg,#4CAF50,#81C784)" : "linear-gradient(90deg,#e53935,#ef5350)";
      }
      const addBtn = card.querySelector(".btn-add");
      if (addBtn) {
        addBtn.disabled = !tieneStock;
        addBtn.innerHTML = tieneStock ? `<i class="bi bi-cart-plus"></i> Agregar` : `<i class="bi bi-x-circle"></i> Agotado`;
        addBtn.style.background = tieneStock ? "linear-gradient(90deg,#4CAF50,#66bb6a)" : "linear-gradient(90deg,#9e9e9e,#bdbdbd)";
      }
    });
    return;
  }

  // render completo (limpia container)
  contenedor.innerHTML = "";
  if (productos.length === 0) {
    contenedor.innerHTML = `<p class="text-center">No se encontraron productos.</p>`;
    return;
  }

  productos.forEach((p) => {
    // calculo stock inicial considerando carrito
    const enCarrito = carrito.find(i => i.id === p.id);
    let stockActual = Math.max(0, stockCache[p.id] ?? (p.Stock ?? 0));
    const tieneStock = stockActual > 0;
    const stockTexto = tieneStock ? `Stock: ${stockActual}` : "Agotado";
    const stockColor = tieneStock ? "linear-gradient(90deg,#4CAF50,#81C784)" : "linear-gradient(90deg,#e53935,#ef5350)";
    const btnColor = tieneStock ? "linear-gradient(90deg,#4CAF50,#66bb6a)" : "linear-gradient(90deg,#9e9e9e,#bdbdbd)";
    const btnDisabled = tieneStock ? "" : "disabled";

    // estructura: slide -> card (compatibilidad con tu HTML)
    const slide = document.createElement("div");
    slide.className = "swiper-slide";
    slide.innerHTML = `
      <div class="card" data-id="${p.id}">
        <img src="${p.imagen || 'https://cdn.pixabay.com/photo/2017/03/19/03/18/eggs-2151533_1280.jpg'}" alt="${p.Nombre}">
        <div class="card-content">
          <h3>${p.Nombre}</h3>
          <p>${p.Descripción || ""}</p>
          <p class="price">$${p.Precio?.toLocaleString() || 0}</p>
          <p class="stock" style="background:${stockColor};">${stockTexto}</p>
          <div class="cantidad-control">
            <button class="menos">-</button>
            <span class="cantidad">1</span>
            <button class="mas">+</button>
          </div>
          <button class="btn-add" style="background:${btnColor};" ${btnDisabled}>
            <i class="bi bi-cart-plus"></i> ${tieneStock ? "Agregar" : "Sin productos"}
          </button>
          <a class="btn-detalle" href="productos.html?id=${p.id}">Ver más productos</a>
        </div>
      </div>
    `;
    contenedor.appendChild(slide);

    // listeners por card (se crean solo aquí)
    const card = slide.querySelector(".card");
    const addBtn = card.querySelector(".btn-add");
    const cantidadEl = card.querySelector(".cantidad");
    let cantidad = 1;

    card.querySelector(".mas").onclick = () => { if (cantidad < stockActual) cantidadEl.textContent = ++cantidad; };
    card.querySelector(".menos").onclick = () => { if (cantidad > 1) cantidadEl.textContent = --cantidad; };

    // usar onclick (sobrescribe previos) para evitar duplicaciones
    addBtn.onclick = async () => {
      if (stockActual <= 0) return;

      // buscar si ya está en el carrito
      const existente = carrito.find(i => i.id === p.id);
      if (existente) {
        // sumamos cantidad, pero sin exceder el stock real
        const maxAgregable = stockCache[p.id];
        const suma = Math.min(cantidad, maxAgregable);
        existente.cantidad += suma;
        stockCache[p.id] -= suma;
      } else {
        const nuevaCantidad = Math.min(cantidad, stockCache[p.id]);
        carrito.push({
          id: p.id,
          nombre: p.Nombre,
          precio: p.Precio,
          imagen: p.imagen,
          cantidad: nuevaCantidad
        });
        stockCache[p.id] -= nuevaCantidad;
      }

      // actualizar UI inmediata
      updateCartCount();
      actualizarStockCard(p.id);

Swal.fire({
  toast: true,
  icon: "success",
  title: `"${p.Nombre}" agregado al carrito ✅`,
  position: "top-end",
  showConfirmButton: false,
  timer: 2000,
  timerProgressBar: true
});
      await guardarCarritoEnFirestore();

      // actualizar stock en Firestore en background
      (async () => {
        try {
          const productoRef = doc(db, "products", p.id);
          await updateDoc(productoRef, { Stock: stockCache[p.id] });
        } catch (err) {
          console.error("Error actualizando stock en Firestore:", err);
        }
      })();

      // si panel abierto, re-render solo del panel
      if (document.querySelector(".cart-panel.open")) renderCartPanel();

      // reset cantidad en card
      cantidad = 1;
      cantidadEl.textContent = "1";
    };
  });

// Swiper management: destruimos instancia previa para evitar duplicados internos
try {
  if (window.swiperProductos) {
    // destruye por completo la instancia anterior y limpia slides
    window.swiperProductos.destroy(true, true);
    window.swiperProductos = null;
  }
} catch (err) {
  console.warn("Warning al destruir swiper previo:", err);
  window.swiperProductos = null;
}

// Ahora inicializamos Swiper de nuevo con las slides actuales en DOM
try {
window.swiperProductos = new Swiper(".productosSwiper", {
  loop: productos.length > 1,
  grabCursor: true,
  slidesPerView: 'auto',        // auto ajusta según el ancho del slide
  spaceBetween: 30,
  centeredSlides: true,          // ✅ centra los slides en el carrusel
  autoplay: { delay: 3000, disableOnInteraction: false },
  speed: 800,
  pagination: { el: ".swiper-pagination", clickable: true, dynamicBullets: true },
  breakpoints: {
    1024: { slidesPerView: 3 },
    768: { slidesPerView: 2 },
    480: { slidesPerView: 1, centeredSlides: true },
  },
});
} catch (err) {
  console.warn("Swiper init error (no crítico):", err);
  window.swiperProductos = null;
} 

// --- SWIPER MANAGEMENT ROBUSTO ---
function reiniciarSwiper() {
  try {
    // 🔹 Si ya hay una instancia previa, destruirla correctamente
    if (window.swiperProductos) {
      window.swiperProductos.destroy(true, true);
      window.swiperProductos = null;
    }
  } catch (err) {
    console.warn("Error al destruir Swiper previo:", err);
  }

  // 🔹 Crear una nueva instancia SOLO si hay productos
  const slides = document.querySelectorAll("#productos-container .swiper-slide");
  if (slides.length > 0) {
    window.swiperProductos = new Swiper(".productosSwiper", {
      slidesPerView: 1,
      spaceBetween: 20,
      grabCursor: true,
      loop: false,
      breakpoints: {
        576: { slidesPerView: 2 },
        768: { slidesPerView: 3 },
        1200: { slidesPerView: 4 }
      },
      pagination: {
        el: ".swiper-pagination",
        clickable: true,
      },
    });
  }
  }

}


/* ==========================
   🔹 Exports / compat
   ========================== */
window.cargarProductos = cargarProductos;
window.actualizarCarrito = actualizarCarrito;
window.updateCartCount = updateCartCount;
window.showRedToast = showRedToast;
window.showGreenToast = showGreenToast;


function renderProductosAgotados(lista) {
  const cont = document.getElementById("productos-agotados");
  if (!cont) return;

  if (lista.length === 0) {
    cont.innerHTML = "";
    return;
  }

cont.innerHTML = `
  <style>
    /* Animación del título */
    @keyframes pulse {
      0% { transform: scale(1); color: #FF9800; }
      50% { transform: scale(1.05); color: #FFB74D; }
      100% { transform: scale(1); color: #FF9800; }
    }

    /* Animación de las tarjetas */
    @keyframes fadeInUp {
      to { transform: translateY(0); opacity: 1; }
    }

    .agotados-list {
      display:flex;
      gap:10px;
      overflow-x:auto;
      padding:10px 20px;
      max-width:90%;
      max-height:220px;
      margin: 0 auto;
      justify-content:center;
    }

    .agotado-item {
      min-width:120px;
      background: linear-gradient(135deg, #FFCDD2, #FF8A65);
      border: 2px solid #FF5722;
      border-radius:8px;
      padding:6px;
      text-align:center;
      opacity:0.9;
      flex-shrink:0;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      transform: translateY(20px);
      opacity: 0;
      animation: fadeInUp 0.5s forwards;
      animation-delay: calc(var(--i) * 0.1s);
    }

    .agotado-item h4 {
      margin:6px 0;
      color:#fff;
      font-size:0.85rem;
    }

    .agotado-item span {
      color:#fff;
      font-weight:700;
      font-size:0.85rem;
    }
  </style>

<h2 style="
  text-align:center;
  margin: 30px 0 20px 0;
  font-size: 1.8rem;
  font-weight: 900;
  color: #FF3D00; /* rojo intenso que resalta sobre verde */
  background: rgba(255,255,255,0.85); /* fondo semitransparente */
  padding: 8px 20px;
  border-radius: 12px;
  display: inline-block;
  text-shadow: 1px 1px 3px rgba(0,0,0,0.5);
  animation: pulse 1.5s infinite;
">
  ⚠️ PRODUCTOS AGOTADOS
</h2>


  <div class="agotados-list">
    ${lista.map((p, i) => `
      <div class="agotado-item" style="--i:${i}">
        <img src="${p.imagen}" style="width:100%; height:80px; object-fit:cover; border-radius:6px;">
        <h4>${p.Nombre}</h4>
        <span>⚠️ AGOTADO</span>
      </div>
    `).join('')}
  </div>
`;

}
