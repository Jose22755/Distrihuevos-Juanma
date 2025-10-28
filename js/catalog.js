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
const logoutBtn = document.getElementById("logoutBtn");
const userNameElement = document.getElementById("userName");

onAuthStateChanged(auth, (user) => {
  if (user) {
    const name = user.displayName || user.email?.split("@")[0] || "Usuario";
    if (userNameElement) userNameElement.textContent = name;
  } else {
    if (userNameElement) userNameElement.textContent = "Usuario";
  }
});

if (logoutBtn) {
  const spinnerOverlay = document.getElementById("logout-spinner");
  logoutBtn.addEventListener("click", async () => {
    try {
      if (spinnerOverlay) spinnerOverlay.style.display = "flex";
      await new Promise((res) => setTimeout(res, 700));
      await signOut(auth);
      if (spinnerOverlay)
        spinnerOverlay.querySelector("p").textContent =
          "¡Sesión cerrada correctamente ✅";
      setTimeout(() => (window.location.href = "login.html"), 1000);
    } catch (err) {
      console.error("Logout error:", err);
      if (spinnerOverlay) spinnerOverlay.style.display = "none";
    }
  });
}

/* ==========================
   🔄 SPINNER UTILS
   ========================== */
function showSpinner() { if (spinner) spinner.style.display = "flex"; }
function hideSpinner() { if (spinner) spinner.style.display = "none"; }

/* ==========================
   🔹 INICIALIZACIÓN (DOMContentLoaded)
   ========================== */
document.addEventListener("DOMContentLoaded", async () => {
  // escucha autenticación -> carga carrito si hay usuario
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

  // carga inicial de productos
  await cargarProductos();

  // iniciar listener de cambios en coleccion products
  escucharCambiosProductos();

  // UI events
  floatingCartBtn?.addEventListener("click", openCartPanel);
  closeCartBtn?.addEventListener("click", closeCartPanel);
  cartOverlay?.addEventListener("click", closeCartPanel);
  goToCartBtn?.addEventListener("click", () => (window.location.href = "cart.html"));

  // búsqueda
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const valor = normalizarTexto(searchInput.value);
      const palabrasBusqueda = valor === "" ? [] : valor.split(/\s+/);
      const filtrados = productosArray.filter((p) => {
        const nombre = normalizarTexto(p.Nombre || "");
        const palabrasNombre = nombre.split(/\s+/);
        return palabrasBusqueda.every((palabra) => palabrasNombre.includes(palabra));
      });
      filtrados.length === 0 ? mostrarProductoNoDisponible() : renderProductos(filtrados);
    });
  }

  // Vaciar carrito: fijar listener robusto (si existe botón)
  if (clearCartBtnGlobal) {
    clearCartBtnGlobal.onclick = handleClearCart; // setea onclick (sobrescribe duplicados)
  }
});

/* ==========================
   🔹 CARGAR PRODUCTOS desde Firestore
   ========================== */
export async function cargarProductos() {
  // función exportada por si quieres llamarla desde fuera
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
  return (texto || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}
function mostrarProductoNoDisponible() {
  if (!contenedor) return;
  contenedor.innerHTML = `<div style="text-align:center;padding:40px;font-weight:600;color:#444">⚠️ Producto no disponible</div>`;
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
    await setDoc(carritoRef, { items: carrito }, { merge: true });
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
        productosArray.push(p);
        stockCache[p.id] = p.Stock ?? 0;
        necesitaReRender = true;
      } else if (change.type === "removed") {
        productosArray = productosArray.filter((prod) => prod.id !== p.id);
        delete stockCache[p.id];
        necesitaReRender = true;
      }
    });
    if (necesitaReRender) renderProductos(productosArray);
  });
}

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
  container.querySelectorAll(".qty-btn.plus").forEach((btn) => {
    btn.onclick = async (e) => {
      const idx = parseInt(e.currentTarget.dataset.index, 10);
      const item = carrito[idx];
      if (!item) return;
      const productoRef = doc(db, "products", item.id);
      const productoSnap = await getDoc(productoRef);
      if (!productoSnap.exists()) return;

      let stockActual = stockCache[item.id] ?? (productoSnap.data().Stock ?? 0);
      if (stockActual <= 0) { showGreenToast("Sin stock disponible ❌"); return; }

      carrito[idx].cantidad += 1;
      stockActual = Math.max(stockActual - 1, 0);
      try {
        await Promise.all([updateDoc(productoRef, { Stock: stockActual }), guardarCarritoEnFirestore()]);
        stockCache[item.id] = stockActual;
        actualizarStockCard(item.id);
        updateCartCount();
        // actualizar sólo la cantidad en panel
        const qtySpan = container.querySelectorAll(".cart-qty")[idx];
        if (qtySpan) qtySpan.textContent = carrito[idx].cantidad;
      } catch (err) {
        console.error("Error actualizando cantidad +:", err);
        carrito[idx].cantidad -= 1; // revertir local
      }
    };
  });

  container.querySelectorAll(".qty-btn.minus").forEach((btn) => {
    btn.onclick = async (e) => {
      const idx = parseInt(e.currentTarget.dataset.index, 10);
      const item = carrito[idx];
      if (!item) return;
      const productoRef = doc(db, "products", item.id);
      const productoSnap = await getDoc(productoRef);
      if (!productoSnap.exists()) return;

      let stockActual = (productoSnap.data().Stock ?? 0) + 1;
      if (carrito[idx].cantidad > 1) carrito[idx].cantidad -= 1;
      else carrito.splice(idx, 1);

      try {
        await Promise.all([updateDoc(productoRef, { Stock: stockActual }), guardarCarritoEnFirestore()]);
        stockCache[item.id] = stockActual;
        actualizarStockCard(item.id);
        updateCartCount();
        renderCartPanel(); // re-render porque índices cambiaron
      } catch (err) {
        console.error("Error actualizando cantidad -:", err);
      }
    };
  });

  container.querySelectorAll(".remove-item").forEach((btn) => {
    btn.onclick = async (e) => {
      const idx = parseInt(e.currentTarget.dataset.index, 10);
      const item = carrito[idx];
      if (!item) return;
      const productoRef = doc(db, "products", item.id);
      const productoSnap = await getDoc(productoRef);
      if (!productoSnap.exists()) return;

      const stockActual = (productoSnap.data().Stock ?? 0) + item.cantidad;
      carrito.splice(idx, 1);
      try {
        await Promise.all([updateDoc(productoRef, { Stock: stockActual }), guardarCarritoEnFirestore()]);
        stockCache[item.id] = stockActual;
        actualizarStockCard(item.id);
        updateCartCount();
        renderCartPanel();
      } catch (err) {
        console.error("Error al eliminar item:", err);
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
      showRedToast("Tu carrito ya está vacío 😅");
      isClearingCart = false;
      return;
    }

    // usar copia para evitar que el for se corrompa si mutamos carrito en medio
    const copia = carrito.slice();

    for (const item of copia) {
      const productoRef = doc(db, "products", item.id);
      const snap = await getDoc(productoRef);
      let stockActual;
      if (snap.exists()) {
        stockActual = (snap.data().Stock ?? 0) + item.cantidad;
      } else {
        stockActual = (stockCache[item.id] ?? 0) + item.cantidad;
      }
      await updateDoc(productoRef, { Stock: stockActual });
      stockCache[item.id] = stockActual;
      const idx = productosArray.findIndex(p => p.id === item.id);
      if (idx !== -1) productosArray[idx].Stock = stockActual;
      // actualizar visualmente la card si existe
      actualizarStockCard(item.id);
    }

    // limpiar carrito local y en firestore
    carrito = [];
    localStorage.removeItem("carrito");
    await guardarCarritoEnFirestore();

    // actualizar UI
    renderCartPanel();
    actualizarCarrito();

    // forzar recarga visual de productos (opcional)
    await cargarProductos();

    showGreenToast("Carrito vaciado y stock actualizado 🗑️✅");
  } catch (err) {
    console.error("❌ Error al vaciar carrito:", err);
    showRedToast("Error al vaciar el carrito");
  } finally {
    // liberamos bloqueo con pequeño delay
    setTimeout(() => { isClearingCart = false; }, 300);
  }
}

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
    let stockActual = Math.max(0, (stockCache[p.id] ?? (p.Stock ?? 0)) - (enCarrito?.cantidad ?? 0));
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
          <a class="btn-detalle" href="product_detail.html?id=${p.id}">Ver más detalles</a>
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
      const existente = carrito.find(i => i.id === p.id);
      if (existente) existente.cantidad = Math.min(existente.cantidad + cantidad, (p.Stock ?? 0));
      else carrito.push({ id: p.id, nombre: p.Nombre, precio: p.Precio, imagen: p.imagen, cantidad });

      updateCartCount();
      showGreenToast(`"${p.Nombre}" agregado al carrito ✅`);
      await guardarCarritoEnFirestore();

      // actualizar cache y UI local para mejor UX; onSnapshot hará authoritative sync después
      stockActual = Math.max(stockActual - cantidad, 0);
      stockCache[p.id] = stockActual;
      p.Stock = stockActual;

      const stockSpan = card.querySelector(".stock");
      if (stockActual <= 0) {
        addBtn.disabled = true;
        addBtn.innerHTML = `<i class="bi bi-x-circle"></i> Agotado`;
        stockSpan.textContent = "Sin stock";
        stockSpan.style.background = "linear-gradient(90deg,#e53935,#ef5350)";
      } else {
        stockSpan.textContent = `Stock: ${stockActual}`;
      }

      // actualizar firestore en background (no interrumpimos UX)
      (async () => {
        try {
          const productoRef = doc(db, "products", p.id);
          await updateDoc(productoRef, { Stock: stockActual });
        } catch (err) {
          console.error("Error actualizando stock en Firestore:", err);
        }
      })();

      // si panel abierto, re-render
      if (document.querySelector(".cart-panel.open")) renderCartPanel();
      // reset cantidad
      cantidad = 1;
      cantidadEl.textContent = "1";
    };
  });

  // Swiper management: si existe, actualiza; si no, crea
  if (!window.swiperProductos) {
    try {
      window.swiperProductos = new Swiper(".productosSwiper", {
        loop: productos.length > 1,
        grabCursor: true,
        slidesPerView: 3,
        spaceBetween: 30,
        centeredSlides: productos.length === 1,
        autoplay: { delay: 3000, disableOnInteraction: false },
        speed: 800,
        pagination: { el: ".swiper-pagination", clickable: true, dynamicBullets: true },
        breakpoints: { 1024: { slidesPerView: 3 }, 768: { slidesPerView: 2 }, 480: { slidesPerView: 1, centeredSlides: true } },
      });
    } catch (err) {
      console.warn("Swiper init error (no crítico):", err);
    }
  } else {
    try { window.swiperProductos.update(); } catch (e) { try { window.swiperProductos.destroy(true, true); } catch (e2) {} window.swiperProductos = null; }
  }
}

/* ==========================
   🔹 TOASTS (GREEN / RED)
   ========================== */
function showGreenToast(message = "Producto agregado ✅", duration = 2000) {
  let toast = document.getElementById("toast-message");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast-message";
    Object.assign(toast.style, {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%,-50%) scale(0.8)",
      background: "#4CAF50",
      color: "#fff",
      padding: "12px 20px",
      borderRadius: "10px",
      fontSize: "1rem",
      fontWeight: "600",
      boxShadow: "0 6px 18px rgba(0,0,0,0.2)",
      display: "none",
      transition: "opacity 0.3s ease, transform 0.3s ease",
      zIndex: 9999,
      textAlign: "center",
    });
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.display = "flex";
  requestAnimationFrame(() => { toast.style.opacity = "1"; toast.style.transform = "translate(-50%,-50%) scale(1)"; });
  setTimeout(() => { toast.style.opacity = "0"; toast.style.transform = "translate(-50%,-50%) scale(0.9)"; setTimeout(() => (toast.style.display = "none"), 300); }, duration);
}

function showRedToast(message = "Error", duration = 2500) {
  let toast = document.getElementById("toast-message-red");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast-message-red";
    Object.assign(toast.style, {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%,-50%) scale(0.8)",
      background: "#e53935",
      color: "#fff",
      padding: "12px 20px",
      borderRadius: "10px",
      fontSize: "1rem",
      fontWeight: "600",
      boxShadow: "0 6px 18px rgba(0,0,0,0.2)",
      display: "none",
      transition: "opacity 0.3s ease, transform 0.3s ease",
      zIndex: 9999,
      textAlign: "center",
    });
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.display = "flex";
  requestAnimationFrame(() => { toast.style.opacity = "1"; toast.style.transform = "translate(-50%,-50%) scale(1)"; });
  setTimeout(() => { toast.style.opacity = "0"; toast.style.transform = "translate(-50%,-50%) scale(0.9)"; setTimeout(() => (toast.style.display = "none"), 300); }, duration);
}

/* ==========================
   🔹 Exports / compat
   ========================== */
window.cargarProductos = cargarProductos;
window.actualizarCarrito = actualizarCarrito;
window.updateCartCount = updateCartCount;
window.showRedToast = showRedToast;
window.showGreenToast = showGreenToast;

