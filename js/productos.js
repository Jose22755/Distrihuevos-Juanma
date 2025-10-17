// ../js/productos.js
import { auth, db } from "../js/firebase-config.js";
import {collection, getDocs, doc, getDoc, setDoc, updateDoc, onSnapshot} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

document.addEventListener("DOMContentLoaded", async () => {

  // =========================
  // CONTENEDORES
  // =========================
  const contenedor = document.getElementById("productos-container");
  const spinner = document.getElementById("productos-spinner");
  const cartBtn = document.querySelector(".cart-btn");
  const cartPanel = document.getElementById("cart-panel");
  const closeCartBtn = document.getElementById("close-cart");
  const cartBadgeHeader = document.querySelector(".cart-count");
  const cartBadgeFloating = document.getElementById("cart-count");

  // =========================
  // MENSAJE DE CARGA
  // =========================
  const loadingMessage = document.createElement("div");
  loadingMessage.id = "loading-message";
  loadingMessage.innerHTML = `<p>Cargando productos...</p>`;
  Object.assign(loadingMessage.style, {
    textAlign: "center",
    fontSize: "1.3rem",
    fontWeight: "600",
    color: "#4CAF50",
    padding: "40px",
    animation: "pulse 1.5s infinite",
  });
  contenedor.parentElement.insertBefore(loadingMessage, contenedor);

  const style = document.createElement("style");
  style.textContent = `
    @keyframes pulse {
      0%,100% {opacity:1;}
      50%{opacity:0.4;}
    }
    .fade-out{opacity:0;transition:opacity 0.4s ease;}
    .fade-in{opacity:1;transition:opacity 0.4s ease;}
    .cat-btn.active {
      background: linear-gradient(90deg, #4CAF50, #81C784);
      color: white;
      transform: scale(1.05);
    }
  `;
  document.head.appendChild(style);

  let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
  let productosArray = [];
  let usuarioUID = null;

  // =========================
  // SPINNER
  // =========================
  const showSpinner = () => spinner && (spinner.style.display = "flex");
  const hideSpinner = () => spinner && (spinner.style.display = "none");

  // =========================
  // TOAST
  // =========================
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
        padding: "16px 24px",
        borderRadius: "12px",
        fontSize: "1.1rem",
        fontWeight: "600",
        boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
        display: "none",
        transition: "opacity 0.4s ease, transform 0.4s ease",
        zIndex: "9999",
        textAlign: "center",
      });
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.display = "flex";
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translate(-50%,-50%) scale(1)";
    });
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translate(-50%,-50%) scale(0.9)";
      setTimeout(() => (toast.style.display = "none"), 400);
    }, duration);
  }

  // =========================
  // MOSTRAR/OCULTAR CARRITO
  // =========================
  cartBtn?.addEventListener("click", () => cartPanel?.classList.toggle("open"));
  closeCartBtn?.addEventListener("click", () => cartPanel?.classList.remove("open"));

  // =========================
  // CARGA DE PRODUCTOS
  // =========================
  showSpinner();
  loadingMessage.style.display = "block";
  contenedor.style.display = "none";

  try {
    const querySnapshot = await getDocs(collection(db, "products"));
    if (querySnapshot.empty) {
      contenedor.innerHTML = "<p>No hay productos disponibles.</p>";
    } else {
      querySnapshot.forEach((doc) => {
        const p = doc.data();
        p.id = doc.id;
        productosArray.push(p);
      });
      renderProductos(productosArray);
    }
  } catch (err) {
    console.error("Error cargando productos:", err);
    contenedor.innerHTML = "<p>Error al cargar productos.</p>";
  } finally {
    hideSpinner();
    setTimeout(() => {
      loadingMessage.style.display = "none";
      contenedor.style.display = "grid";
    }, 1000);
  }

  // =========================
  // RENDER DE PRODUCTOS
  // =========================
  function renderProductos(productos) {
    contenedor.classList.remove("fade-in");
    contenedor.classList.add("fade-out");
    setTimeout(() => {
      contenedor.innerHTML = "";
      if (productos.length === 0) {
        contenedor.innerHTML = "<p>No se encontraron productos.</p>";
      } else {
        productos.forEach((p) => {
          const card = document.createElement("div");
          card.className = "card";
          card.dataset.cat = (p.Categoría || "general").toLowerCase();

          const tieneStock = p.Stock > 0;
          const stockTexto = tieneStock ? `Stock: ${p.Stock}` : "Agotado";
          const stockColor = tieneStock
            ? "linear-gradient(90deg,#4CAF50,#81C784)"
            : "linear-gradient(90deg,#e53935,#ef5350)";
          const btnTexto = tieneStock ? "Agregar" : "Sin productos";
          const btnColor = tieneStock
            ? "linear-gradient(90deg,#4CAF50,#66bb6a)"
            : "linear-gradient(90deg,#9e9e9e,#bdbdbd)";
          const btnDisabled = tieneStock ? "" : "disabled";

          card.innerHTML = `
            <img src="${p.imagen || "https://cdn.pixabay.com/photo/2017/03/19/03/18/eggs-2151533_1280.jpg"}" alt="${p.Nombre}">
            <div class="card-content">
              <h3>${p.Nombre}</h3>
              <p>${p.Descripción || ""}</p>
              <p class="price">$${p.Precio?.toLocaleString() || 0}</p>
              <p class="stock" style="background:${stockColor};">${stockTexto}</p>
              <button class="btn-add" style="background:${btnColor}" ${btnDisabled}>
                <i class="bi bi-cart-plus"></i> ${btnTexto}
              </button>
            </div>
          `;

          contenedor.appendChild(card);

          const addBtn = card.querySelector(".btn-add");
          let stockActual = p.Stock;

          if (tieneStock) {
            const control = document.createElement("div");
            control.classList.add("cantidad-control");
            control.innerHTML = `<button class="menos">-</button><span class="cantidad">1</span><button class="mas">+</button>`;
            const cantidadEl = control.querySelector(".cantidad");
            let cantidad = 1;
            card.querySelector(".card-content").insertBefore(control, addBtn);
            control.querySelector(".mas").addEventListener("click", () => {
              if (cantidad < stockActual) cantidadEl.textContent = ++cantidad;
            });
            control.querySelector(".menos").addEventListener("click", () => {
              if (cantidad > 1) cantidadEl.textContent = --cantidad;
            });
          }

          const btnDetalle = document.createElement("a");
          btnDetalle.className = "btn-detalle";
          btnDetalle.href = `product_detail.html?id=${p.id}`;
          btnDetalle.textContent = "Ver más detalles";
          card.querySelector(".card-content").appendChild(btnDetalle);

          addBtn?.addEventListener("click", async () => {
          if (stockActual === 0) return;

          const cantidad = parseInt(card.querySelector(".cantidad").textContent);
          const existente = carrito.find((item) => item.id === p.id);

          if (existente) existente.cantidad += cantidad;
          else carrito.push({
            id: p.id,
            nombre: p.Nombre,
            precio: p.Precio,
            imagen: p.imagen,
            cantidad
          });

          localStorage.setItem("carrito", JSON.stringify(carrito));
          actualizarCarrito();
          await guardarCarritoEnFirestore(); // 🔥 Guarda en Firestore

          // ✅ 🔥 REFRESCAR PANEL EN TIEMPO REAL
          if (document.querySelector(".cart-panel.open")) {
            renderCartPanel();
          }

          stockActual -= cantidad;
          const stockSpan = card.querySelector(".stock");

          if (stockActual <= 0) {
            addBtn.disabled = true;
            addBtn.innerHTML = '<i class="bi bi-x-circle"></i> Agotado';
            stockSpan.textContent = "Sin stock";
            stockSpan.style.background = "linear-gradient(90deg,#e53935,#ef5350)";
          } else {
            stockSpan.textContent = `Stock: ${stockActual}`;
          }

          card.querySelector(".cantidad").textContent = 1;
          showGreenToast(`"${p.Nombre}" agregado al carrito ✅`);
        });

        });
      }
      contenedor.classList.remove("fade-out");
      contenedor.classList.add("fade-in");
    }, 400);
  }

  // ===========================
// 🔥 SINCRONIZACIÓN CARRITO CON FIRESTORE
// ===========================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    usuarioUID = user.uid;
    console.log("Usuario activo:", usuarioUID);
    await cargarCarritoDesdeFirestore();
    escucharCambiosCarrito();
  } else {
    usuarioUID = null;
    carrito = [];
    localStorage.removeItem("carrito");
    actualizarCarrito();
  }
});

async function cargarCarritoDesdeFirestore() {
  if (!usuarioUID) return;
  const docRef = doc(db, "carritos", usuarioUID);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    carrito = docSnap.data().items || [];
    localStorage.setItem("carrito", JSON.stringify(carrito));
    actualizarCarrito();
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
      actualizarCarrito();
    }
  });
}


// 🔹 Vaciar carrito
const clearCartBtn = document.getElementById("clear-cart");
clearCartBtn?.addEventListener("click", async () => {
  carrito = [];
  localStorage.setItem("carrito", JSON.stringify(carrito));
  await guardarCarritoEnFirestore();
  renderCartPanel();
  updateCartCount();
  showGreenToast("Carrito vaciado 🗑️");
});

// 🔹 Finalizar compra
const checkoutBtn = document.getElementById("checkout");
checkoutBtn?.addEventListener("click", () => {
  if(carrito.length === 0){
    alert("Tu carrito está vacío 😅");
    return;
  }
  // Aquí puedes redirigir a la página de pago o mostrar un modal
  window.location.href = "checkout.html"; 
});


async function guardarCarritoEnFirestore() {
  if (!usuarioUID) return;
  const docRef = doc(db, "carritos", usuarioUID);
  await updateDoc(docRef, { items: carrito });
}


  // =========================
  // ACTUALIZAR CARRITO
  // =========================
  function actualizarCarrito() {
    localStorage.setItem("carrito", JSON.stringify(carrito));
    const cantidadTotal = carrito.reduce((sum, p) => sum + p.cantidad, 0);
    if (cartBadgeHeader) cartBadgeHeader.textContent = cantidadTotal;
    if (cartBadgeFloating) {
      cartBadgeFloating.textContent = cantidadTotal;
      cartBadgeFloating.animate(
        [{ transform: "scale(1)" }, { transform: "scale(1.3)" }, { transform: "scale(1)" }],
        { duration: 300, easing: "ease-out" }
      );
    }
  }
  actualizarCarrito();

  // =========================
// 🟢 FILTRO UNIFICADO: CATEGORÍA + BÚSQUEDA + MENSAJE SI NO HAY RESULTADOS (VERSIÓN FINAL)
// =========================

let categoriaActiva = "todos";
let palabrasBusqueda = [];

// Normaliza texto (minúsculas + sin acentos)
function normalizarTexto(texto) {
  return (texto || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// =====================
// FILTRAR Y RENDERIZAR
// =====================
function filtrarYRenderizar() {
  const contenedor = document.querySelector("#productos-container");

  const filtrados = productosArray.filter((producto) => {
    const nombre = normalizarTexto(producto.Nombre || "");
    const categoria = normalizarTexto(producto.Categoria || "");

    // ✅ FILTRO DE CATEGORÍA — Coincidencia EXACTA o palabra completa
    const cumpleCategoria =
      categoriaActiva === "todos" ||
      categoria === categoriaActiva ||
      new RegExp(`\\b${categoriaActiva}\\b`, "i").test(nombre);

    if (!cumpleCategoria) return false;

    // ✅ FILTRO DE BÚSQUEDA EXACTO
    if (palabrasBusqueda.length === 0) return true;

    const palabrasNombre = nombre.split(/\s+/);
    const cumpleBusqueda = palabrasBusqueda.every((palabra) =>
      palabrasNombre.includes(palabra)
    );

    return cumpleBusqueda;
  });

  // ✅ Mostrar resultados o mensaje de “no disponible”
  if (filtrados.length === 0) {
    contenedor.innerHTML = `
      <div style="
        text-align: center;
        padding: 40px;
        font-size: 1.2rem;
        font-weight: 600;
        color: #444;
      ">
        ⚠️ Producto no disponible
      </div>
    `;
  } else {
    renderProductos(filtrados);
  }
}

// =====================
// BOTONES DE CATEGORÍA
// =====================
const catBtns = document.querySelectorAll(".cat-btn");

catBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    catBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    categoriaActiva = normalizarTexto(btn.dataset.cat || "todos");
    filtrarYRenderizar();
  });
});

// Activa botón "Todos" al inicio
const todosBtn = document.querySelector('.cat-btn[data-cat="todos"]');
if (todosBtn) todosBtn.classList.add("active");

// =====================
// BARRA DE BÚSQUEDA
// =====================
const inputBusqueda = document.querySelector("#busqueda");
if (inputBusqueda) {
  inputBusqueda.addEventListener("input", () => {
    const valor = normalizarTexto(inputBusqueda.value);
    palabrasBusqueda = valor === "" ? [] : valor.split(/\s+/);
    filtrarYRenderizar();
  });
}

// =====================
// INICIALIZAR
// =====================
filtrarYRenderizar();


  // =========================
  // 🔒 AUTENTICACIÓN HEADER
  // =========================
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

  logoutBtn?.addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.href = "index.html";
    } catch (err) {
      console.error("Logout error:", err);
    }
  });

  // =========================
// 🛒 PANEL LATERAL CARRITO (AJUSTADO)
// =========================
const floatingCartBtn = document.getElementById("floating-cart");
const cartPanelNuevo = document.getElementById("cart-panel");
const closeCart = document.getElementById("close-cart");
const overlay = document.getElementById("cart-overlay");
const goToCartBtn = document.getElementById("go-to-cart");


// 🔹 Abrir panel al hacer clic en el carrito flotante
floatingCartBtn?.addEventListener("click", (e) => {
  e.preventDefault(); // Evita ir a cart.html
  cartPanelNuevo?.classList.add("open");
  overlay?.classList.add("active");
});

// 🔹 Cerrar panel
closeCart?.addEventListener("click", () => {
  cartPanelNuevo?.classList.remove("open");
  overlay?.classList.remove("active");
});

// 🔹 Cerrar si hace clic fuera
overlay?.addEventListener("click", () => {
  cartPanelNuevo?.classList.remove("open");
  overlay?.classList.remove("active");
});

// 🔹 Ir al carrito completo (cart.html)
goToCartBtn?.addEventListener("click", () => {
  window.location.href = "cart.html";
});


// =========================
// 🧺 MOSTRAR PRODUCTOS EN EL PANEL DEL CARRITO
// =========================
function renderCartPanel() {
  const cartItemsContainer = document.getElementById("cart-items");
  const subtotalEl = document.getElementById("cart-subtotal");
  const totalEl = document.getElementById("cart-total");

  if (!cartItemsContainer) return; // Seguridad

  if (carrito.length === 0) {
    cartItemsContainer.innerHTML = `<p class="empty-cart">Tu carrito está vacío 🛍️</p>`;
    if(subtotalEl) subtotalEl.textContent = "$0";
    if(totalEl) totalEl.textContent = "$0";
    return;
  }

  let html = "";
  let subtotal = 0;

  carrito.forEach((item, index) => {
    const itemTotal = item.precio * item.cantidad;
    subtotal += itemTotal;

    html += `
  <div class="cart-item">
    <img src="${item.imagen || 'https://cdn.pixabay.com/photo/2017/03/19/03/18/eggs-2151533_1280.jpg'}" 
         alt="${item.nombre}" class="cart-item-img">
    <div class="cart-item-info">
      <h4>${item.nombre}</h4>
      <p>$${item.precio.toLocaleString()}</p>

      <div class="cart-item-actions">
        <div class="qty-control">
          <button class="qty-btn minus" data-index="${index}">−</button>
          <span class="qty">${item.cantidad}</span>
          <button class="qty-btn plus" data-index="${index}">+</button>
        </div>
        <button class="remove-item" data-index="${index}">🗑️</button>
      </div>
    </div>
  </div>
`;

  });

  cartItemsContainer.innerHTML = html;

  // Actualizar subtotal y total
  if(subtotalEl) subtotalEl.textContent = `$${subtotal.toLocaleString()}`;
  if(totalEl) totalEl.textContent = `$${subtotal.toLocaleString()}`;

  // 🔹 Permitir eliminar productos directamente desde el panel
  const removeBtns = cartItemsContainer.querySelectorAll(".remove-item");
  removeBtns.forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const index = e.target.dataset.index;
      carrito.splice(index, 1);               // ⚡ Usa la variable global
      await guardarCarritoEnFirestore();      // ⚡ Actualiza Firestore
      renderCartPanel();                       // ⚡ Vuelve a renderizar
      updateCartCount();                     // ⚡ Actualiza badges
    });
  });
}

// 🔹 Controles de cantidad (+ y -)
const plusBtns = cartItemsContainer.querySelectorAll(".qty-btn.plus");
const minusBtns = cartItemsContainer.querySelectorAll(".qty-btn.minus");

plusBtns.forEach((btn) => {
  btn.addEventListener("click", async (e) => {
    const index = e.target.dataset.index;
    carrito[index].cantidad += 1;
    await guardarCarritoEnFirestore();
    renderCartPanel();
    updateCartCount();
  });
});

minusBtns.forEach((btn) => {
  btn.addEventListener("click", async (e) => {
    const index = e.target.dataset.index;
    if (carrito[index].cantidad > 1) {
      carrito[index].cantidad -= 1;
      await guardarCarritoEnFirestore();
      renderCartPanel();
      updateCartCount();
    }
  });
});


// 🔹 Renderizar los productos cuando se abre el panel
floatingCartBtn?.addEventListener("click", () => {
  renderCartPanel();
});
});