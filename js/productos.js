// ../js/productos.js
import { auth, db } from "../js/firebase-config.js";
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

document.addEventListener("DOMContentLoaded", async () => {

  // =========================
  // CONTENEDORES / ELEMENTOS
  // =========================
  const contenedor = document.getElementById("productos-container");
  const spinner = document.getElementById("productos-spinner");
  const cartBtn = document.querySelector(".cart-btn");
  const cartPanel = document.getElementById("cart-panel");
  const closeCartBtn = document.getElementById("close-cart");
  const cartBadgeHeader = document.querySelector(".cart-count");
  const cartBadgeFloating = document.getElementById("cart-count");
  const floatingCartBtn = document.getElementById("floating-cart");
  const closeCart = document.getElementById("close-cart");
  const overlay = document.getElementById("cart-overlay");
  const goToCartBtn = document.getElementById("go-to-cart");

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
  if (contenedor && contenedor.parentElement) contenedor.parentElement.insertBefore(loadingMessage, contenedor);

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

  // =========================
  // DATOS EN MEMORIA
  // =========================
  let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
  let productosArray = [];
  let usuarioUID = null;
  let stockCache = {}; // cache local de stock
  let renderizando = false;

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
  // CARGA DE PRODUCTOS (Firestore)
  // =========================
  showSpinner();
  if (loadingMessage) loadingMessage.style.display = "block";
  if (contenedor) contenedor.style.display = "none";

  try {
    const q = await getDocs(collection(db, "products"));
    if (q.empty) {
      contenedor.innerHTML = "<p>No hay productos disponibles.</p>";
    } else {
      productosArray = [];
      q.forEach(docSnap => {
        const p = docSnap.data();
        p.id = docSnap.id;
        productosArray.push(p);
        stockCache[p.id] = p.Stock ?? 0;
      });
      renderProductos(productosArray);
    }
  } catch (err) {
    console.error("Error cargando productos:", err);
    contenedor.innerHTML = "<p>Error al cargar productos.</p>";
  } finally {
    hideSpinner();
    setTimeout(() => {
      if (loadingMessage) loadingMessage.style.display = "none";
      if (contenedor) contenedor.style.display = "grid";
    }, 800);
  }

  // =========================
  // RENDER PRODUCTOS (con delegación de eventos para btn-add)
  // =========================
  function renderProductos(productos) {
    if (!contenedor) return;
    if (renderizando) return;
    renderizando = true;

    contenedor.classList.remove("fade-in");
    contenedor.classList.add("fade-out");

    setTimeout(() => {
      // limpiar contenedor
      contenedor.innerHTML = "";

      if (!productos || productos.length === 0) {
        contenedor.innerHTML = "<p>No se encontraron productos.</p>";
        renderizando = false;
        contenedor.classList.remove("fade-out");
        contenedor.classList.add("fade-in");
        return;
      }

      productos.forEach(p => {
        const card = document.createElement("div");
        card.className = "card";
        card.dataset.id = p.id;
        card.dataset.cat = (p.Categoria || "general").toLowerCase();

        const tieneStock = (p.Stock ?? 0) > 0;
        const stockTexto = tieneStock ? `Stock: ${p.Stock}` : "Agotado";
        const stockColor = tieneStock ? "linear-gradient(90deg,#4CAF50,#81C784)" : "linear-gradient(90deg,#e53935,#ef5350)";
        const btnTexto = tieneStock ? "Agregar" : "Sin productos";
        const btnColor = tieneStock ? "linear-gradient(90deg,#4CAF50,#66bb6a)" : "linear-gradient(90deg,#9e9e9e,#bdbdbd)";

        card.innerHTML = `
          <img src="${p.imagen || 'https://cdn.pixabay.com/photo/2017/03/19/03/18/eggs-2151533_1280.jpg'}" alt="${p.Nombre}">
          <div class="card-content">
            <h3>${p.Nombre}</h3>
            <p>${p.Descripción || ""}</p>
            <p class="price">$${p.Precio?.toLocaleString() || 0}</p>
            <p class="stock" style="background:${stockColor};">${stockTexto}</p>
            <div class="card-controls">
              <div class="cantidad-control" data-product-id="${p.id}">
                <button class="menos">-</button>
                <span class="cantidad">1</span>
                <button class="mas">+</button>
              </div>
              <button class="btn-add" data-product-id="${p.id}" style="background:${btnColor}" ${tieneStock ? "" : "disabled"}>
                <i class="bi bi-cart-plus"></i> ${btnTexto}
              </button>
            </div>
            <a class="btn-detalle" href="product_detail.html?id=${p.id}">Ver más detalles</a>
          </div>
        `;

        contenedor.appendChild(card);

        // Inicializar stock local variable para control por card
        stockCache[p.id] = stockCache[p.id] ?? (p.Stock ?? 0);
      });

      // Delegación para controles de cantidad (mas/menos)
      contenedor.querySelectorAll(".cantidad-control").forEach(control => {
        const productId = control.dataset.productId;
        const cantidadEl = control.querySelector(".cantidad");
        let cantidad = 1;

        control.querySelector(".mas")?.addEventListener("click", () => {
          const stockActual = stockCache[productId] ?? 0;
          if (cantidad < stockActual) {
            cantidad++;
            if (cantidadEl) cantidadEl.textContent = cantidad;
          }
        });

        control.querySelector(".menos")?.addEventListener("click", () => {
          if (cantidad > 1) {
            cantidad--;
            if (cantidadEl) cantidadEl.textContent = cantidad;
          }
        });
      });

      // Delegación única: manejar clicks en botones "Agregar"
      // Para evitar duplicación de handlers, siempre usar un único listener en el contenedor
      // y filtrar por el selector .btn-add
      // Antes de añadirlo, quitamos cualquier listener previo idéntico (protección)
      // Nota: no existe forma directa de eliminar listener anonymous — usamos atributo data para bloqueo
      if (!contenedor._hasAddDelegate) {
        contenedor.addEventListener("click", async (e) => {
          const btn = e.target.closest && e.target.closest(".btn-add");
          if (!btn) return;
          e.preventDefault();

          const productId = btn.dataset.productId;
          if (!productId) return;

          // Buscamos card y cantidad seleccionada
          const card = document.querySelector(`.card[data-id="${productId}"]`);
          if (!card) return;

          const cantidadEl = card.querySelector(".cantidad");
          const cantidad = parseInt(cantidadEl?.textContent || "1", 10) || 1;

          // Lock por botón: evitar doble-click rápido
          if (btn.dataset.locked === "1") return;
          btn.dataset.locked = "1";
          btn.disabled = true;
          btn.style.opacity = "0.7";

          try {
            // Obtener producto desde productosArray
            const producto = productosArray.find(x => x.id === productId);
            const stockActual = stockCache[productId] ?? (producto?.Stock ?? 0);

            if ((stockActual ?? 0) <= 0) {
              showGreenToast("Sin stock disponible ❌");
              return;
            }

            const take = Math.min(cantidad, stockActual);

            // Añadir/actualizar carrito
            const existente = carrito.find(item => item.id === productId);
            if (existente) {
              existente.cantidad = existente.cantidad + take;
            } else {
              carrito.push({
                id: productId,
                nombre: producto?.Nombre || "Producto",
                precio: producto?.Precio || 0,
                imagen: producto?.imagen || "",
                cantidad: take
              });
            }

            // Actualizar cache y Firestore stock
            const nuevoStock = Math.max((stockActual ?? 0) - take, 0);
            stockCache[productId] = nuevoStock;

            // Actualizar productosArray para mantener coherencia en futuras operaciones
            const idx = productosArray.findIndex(x => x.id === productId);
            if (idx !== -1) productosArray[idx].Stock = nuevoStock;

            // Persistir carrito local y remoto
            localStorage.setItem("carrito", JSON.stringify(carrito));
            actualizarCarrito();
            renderCartPanel();
            showGreenToast(`"${producto?.Nombre || 'Producto'}" agregado al carrito ✅`);
            if (usuarioUID) await guardarCarritoEnFirestore();

            // Actualizar Firestore de stock (no se espera, pero se espera aquí para consistencia)
            try {
              await updateDoc(doc(db, "products", productId), { Stock: nuevoStock });
            } catch (err) {
              console.error("Error actualizando stock en Firestore:", err);
            }

            // Actualizar visual del card
            actualizarStockCard(productId, nuevoStock);

            // reset contador visual a 1
            if (cantidadEl) cantidadEl.textContent = "1";
          } catch (err) {
            console.error("Error manejando agregar:", err);
          } finally {
            // unlock
            delete btn.dataset.locked;
            btn.disabled = false;
            btn.style.opacity = "1";
          }
        });
        contenedor._hasAddDelegate = true;
      }

      contenedor.classList.remove("fade-out");
      contenedor.classList.add("fade-in");
      renderizando = false;
    }, 300);
  } // end renderProductos

  // =========================
  // SINCRONIZACIÓN CARRITO CON FIRESTORE
  // =========================
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      usuarioUID = user.uid;
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

  // =========================
  // VACIAR CARRITO / CHECKOUT
  // =========================
  const clearCartBtn = document.getElementById("clear-cart");
  clearCartBtn?.addEventListener("click", async () => {
    // Antes de vaciar reponemos stocks en Firestore (opcional, según tu lógica)
    try {
      for (const item of carrito) {
        const productoRef = doc(db, "products", item.id);
        // Obtener stock actual y sumarle item.cantidad
        const snap = await getDoc(productoRef);
        let stockActual = snap.exists() ? (snap.data().Stock ?? 0) : (stockCache[item.id] ?? 0);
        stockActual += item.cantidad;
        await updateDoc(productoRef, { Stock: stockActual });
        stockCache[item.id] = stockActual;
        const idx = productosArray.findIndex(p => p.id === item.id);
        if (idx !== -1) productosArray[idx].Stock = stockActual;
        actualizarStockCard(item.id, stockActual);
      }
    } catch (err) {
      console.error("Error reponiendo stock al vaciar carrito:", err);
    }

    carrito = [];
    localStorage.setItem("carrito", JSON.stringify(carrito));
    await guardarCarritoEnFirestore();
    renderCartPanel();
    actualizarCarrito();
    showGreenToast("Carrito vaciado 🗑️");
  });

  const checkoutBtn = document.getElementById("checkout");
  checkoutBtn?.addEventListener("click", () => {
    if (carrito.length === 0) {
      alert("Tu carrito está vacío 😅");
      return;
    }
    window.location.href = "checkout.html";
  });

  async function guardarCarritoEnFirestore() {
    if (!usuarioUID) return;
    const docRef = doc(db, "carritos", usuarioUID);
    try {
      await setDoc(docRef, { items: carrito }, { merge: true });
    } catch (err) {
      console.error("Error guardando carrito:", err);
    }
  }

  // =========================
  // ACTUALIZAR CARRITO (contador)
  // =========================
  function actualizarCarrito() {
    localStorage.setItem("carrito", JSON.stringify(carrito));
    const cantidadTotal = carrito.reduce((sum, p) => sum + (p.cantidad || 0), 0);
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
  function updateCartCount() { actualizarCarrito(); } // compat

  // =========================
  // FILTROS / BÚSQUEDA
  // =========================
  let categoriaActiva = "todos";
  let palabrasBusqueda = [];

  function normalizarTexto(texto) {
    return (texto || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
  }

  function filtrarYRenderizar() {
    const cont = document.querySelector("#productos-container");
    const filtrados = productosArray.filter((producto) => {
      const nombre = normalizarTexto(producto.Nombre || "");
      const categoria = normalizarTexto(producto.Categoria || "");
      const cumpleCategoria = categoriaActiva === "todos" || categoria === categoriaActiva || new RegExp(`\\b${categoriaActiva}\\b`, "i").test(nombre);
      if (!cumpleCategoria) return false;
      if (palabrasBusqueda.length === 0) return true;
      const palabrasNombre = nombre.split(/\s+/);
      return palabrasBusqueda.every((palabra) => palabrasNombre.includes(palabra));
    });

    if (!cont) return;
    if (filtrados.length === 0) {
      cont.innerHTML = `<div style="text-align:center;padding:40px;font-size:1.2rem;font-weight:600;color:#444;">⚠️ Producto no disponible</div>`;
    } else {
      renderProductos(filtrados);
    }
  }

  // botones categoría
  const catBtns = document.querySelectorAll(".cat-btn");
  catBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      catBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      categoriaActiva = normalizarTexto(btn.dataset.cat || "todos");
      filtrarYRenderizar();
    });
  });
  const todosBtn = document.querySelector('.cat-btn[data-cat="todos"]');
  if (todosBtn) todosBtn.classList.add("active");

  const inputBusqueda = document.querySelector("#busqueda");
  if (inputBusqueda) {
    inputBusqueda.addEventListener("input", () => {
      const valor = normalizarTexto(inputBusqueda.value);
      palabrasBusqueda = valor === "" ? [] : valor.split(/\s+/);
      filtrarYRenderizar();
    });
  }

  // =========================
  // AUTH HEADER (nombre y logout que redirige)
  // =========================
  const logoutBtn = document.getElementById("logoutBtn");
  const userNameElement = document.getElementById("userName");

  onAuthStateChanged(auth, (user) => {
    if (user) {
      const name = user.displayName || user.email?.split("@")[0] || "Usuario";
      if (userNameElement) userNameElement.textContent = `Hola, ${name}`;
    } else {
      if (userNameElement) userNameElement.textContent = "Hola, Usuario";
    }
  });

  logoutBtn?.addEventListener("click", () => {
    window.location.href = "index.html";
  });

  // =========================
  // PANEL LATERAL CARRITO (abrir/cerrar)
  // =========================
  floatingCartBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    cartPanel?.classList.add("open");
    overlay?.classList.add("active");
    renderCartPanel();
  });

  closeCart?.addEventListener("click", () => {
    cartPanel?.classList.remove("open");
    overlay?.classList.remove("active");
  });

  overlay?.addEventListener("click", () => {
    cartPanel?.classList.remove("open");
    overlay?.classList.remove("active");
  });

  goToCartBtn?.addEventListener("click", () => {
    window.location.href = "cart.html";
  });

  // =========================
  // RENDER PANEL CARRITO (delegación de eventos)
  // =========================
  function renderCartPanel() {
    const cartItemsContainer = document.getElementById("cart-items");
    const subtotalEl = document.getElementById("cart-subtotal");
    const totalEl = document.getElementById("cart-total");
    if (!cartItemsContainer) return;

    if (!carrito || carrito.length === 0) {
      cartItemsContainer.innerHTML = `<p class="empty-cart">Tu carrito está vacío 🛍️</p>`;
      if (subtotalEl) subtotalEl.textContent = "$0";
      if (totalEl) totalEl.textContent = "$0";
      cartItemsContainer.onclick = cartItemsContainer.onclick || (() => {});
      return;
    }

    let html = "";
    let subtotal = 0;
    carrito.forEach((item, index) => {
      const itemTotal = (item.precio || 0) * (item.cantidad || 0);
      subtotal += itemTotal;
      html += `
        <div class="cart-item" data-index="${index}">
          <img src="${item.imagen || 'https://cdn.pixabay.com/photo/2017/03/19/03/18/eggs-2151533_1280.jpg'}" alt="${item.nombre}" class="cart-item-img">
          <div class="cart-item-info">
            <h4>${item.nombre}</h4>
            <p><span class="precio-label">Precio:</span> $${(item.precio || 0).toLocaleString()}</p>
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

    cartItemsContainer.innerHTML = html;
    if (subtotalEl) subtotalEl.textContent = `$${subtotal.toLocaleString()}`;
    if (totalEl) totalEl.textContent = `$${subtotal.toLocaleString()}`;

    // Delegación: un único listener para el contenedor del carrito
    cartItemsContainer.onclick = async (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const idxAttr = btn.dataset.index;
      if (typeof idxAttr === "undefined") return;
      const idx = parseInt(idxAttr, 10);
      const item = carrito[idx];
      if (!item) return;

      // + (aumentar)
      if (btn.classList.contains("plus")) {
        const productoRef = doc(db, "products", item.id);
        let stockActual = stockCache[item.id] ?? (productosArray.find(p => p.id === item.id)?.Stock ?? 0);
        if (stockActual <= 0) {
          showGreenToast("Sin stock disponible ❌");
          return;
        }
        item.cantidad += 1;
        stockActual -= 1;
        stockCache[item.id] = stockActual;
        try { await updateDoc(productoRef, { Stock: stockActual }); } catch (err) { console.error(err); }
        localStorage.setItem("carrito", JSON.stringify(carrito));
        setTimeout(() => guardarCarritoEnFirestore(), 0);
        actualizarStockCard(item.id, stockActual);
        renderCartPanel();
        actualizarCarrito();
        return;
      }

      // - (disminuir)
      if (btn.classList.contains("minus")) {
        const productoRef = doc(db, "products", item.id);
        let stockActual = stockCache[item.id] ?? (productosArray.find(p => p.id === item.id)?.Stock ?? 0);
        stockActual += 1;
        if (item.cantidad > 1) item.cantidad -= 1;
        else carrito.splice(idx, 1);
        stockCache[item.id] = stockActual;
        try { await updateDoc(productoRef, { Stock: stockActual }); } catch (err) { console.error(err); }
        localStorage.setItem("carrito", JSON.stringify(carrito));
        setTimeout(() => guardarCarritoEnFirestore(), 0);
        renderCartPanel();
        actualizarStockCard(item.id, stockActual);
        actualizarCarrito();
        return;
      }

      // eliminar
      if (btn.classList.contains("remove-item")) {
        try {
          const productoRef = doc(db, "products", item.id);
          const productoSnap = await getDoc(productoRef);
          let stockActual = productoSnap.exists() ? (productoSnap.data().Stock ?? 0) : (stockCache[item.id] ?? 0);
          stockActual += item.cantidad;
          await updateDoc(productoRef, { Stock: stockActual });
          stockCache[item.id] = stockActual;
          const idxProd = productosArray.findIndex(p => p.id === item.id);
          if (idxProd !== -1) productosArray[idxProd].Stock = stockActual;

          carrito.splice(idx, 1);
          localStorage.setItem("carrito", JSON.stringify(carrito));
          await guardarCarritoEnFirestore();

          actualizarStockCard(item.id, stockActual);
          actualizarCarrito();
          renderCartPanel();
          showGreenToast("Producto eliminado del carrito 🗑️");
        } catch (err) {
          console.error("Error al eliminar producto:", err);
        }
        return;
      }
    };
  } // end renderCartPanel

  // =========================
  // ACTUALIZAR STOCK EN CARDS
  // =========================
  function actualizarStockCard(idProducto, nuevoStock) {
    const card = document.querySelector(`.card[data-id="${idProducto}"]`);
    if (!card) return;
    const stockSpan = card.querySelector(".stock");
    const addBtn = card.querySelector(".btn-add");

    if (stockSpan) {
      stockSpan.textContent = nuevoStock > 0 ? `Stock: ${nuevoStock}` : "Agotado";
      stockSpan.style.background = nuevoStock > 0 ? "linear-gradient(90deg,#4CAF50,#81C784)" : "linear-gradient(90deg,#e53935,#ef5350)";
    }

    if (addBtn) {
      if (nuevoStock <= 0) {
        addBtn.disabled = true;
        addBtn.innerHTML = '<i class="bi bi-x-circle"></i> Agotado';
        addBtn.style.background = "linear-gradient(90deg,#9e9e9e,#bdbdbd)";
      } else {
        addBtn.disabled = false;
        addBtn.innerHTML = '<i class="bi bi-cart-plus"></i> Agregar';
        addBtn.style.background = "linear-gradient(90deg,#4CAF50,#66bb6a)";
      }
    }
  }

}); // end DOMContentLoaded
