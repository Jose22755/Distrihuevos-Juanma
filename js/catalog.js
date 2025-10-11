// ../js/catalog.js
import { auth, db } from "../js/firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

document.addEventListener("DOMContentLoaded", async () => {

  // -------------------------
  // MENÚ HAMBURGUESA
  // -------------------------
  const menuWrapper = document.querySelector(".menu-wrapper");
  const hamburger = menuWrapper?.querySelector(".hamburger");
  const sideMenu = document.getElementById("sideMenu");
  let overlay = document.getElementById("menuOverlay");

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "menuOverlay";
    overlay.className = "menu-overlay";
    document.body.appendChild(overlay);
  }

  function openMenu() {
    hamburger?.classList.add("active");
    sideMenu?.classList.add("open");
    overlay?.classList.add("show");
  }

  function closeMenu() {
    hamburger?.classList.remove("active");
    sideMenu?.classList.remove("open");
    overlay?.classList.remove("show");

    const submenu = sideMenu?.querySelector(".submenu");
    if (submenu) submenu.classList.remove("open");
    const arrow = sideMenu?.querySelector(".bi-chevron-down");
    if (arrow) arrow.classList.remove("rotate");
  }

  function toggleMenu(e) {
    if (e) e.stopPropagation();
    if (sideMenu?.classList.contains("open")) closeMenu(); else openMenu();
  }

  if (menuWrapper) menuWrapper.addEventListener("click", toggleMenu);
  overlay.addEventListener("click", closeMenu);

  document.addEventListener("click", (ev) => {
    if (!sideMenu) return;
    if (!sideMenu.contains(ev.target) && !menuWrapper.contains(ev.target)) {
      if (sideMenu.classList.contains("open")) closeMenu();
    }
  });

  const perfilToggle = document.getElementById("perfilToggle") || sideMenu?.querySelector(".has-submenu > a");
  const submenuPerfil = document.getElementById("submenuPerfil") || sideMenu?.querySelector(".has-submenu .submenu");
  if (perfilToggle && submenuPerfil) {
    perfilToggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      submenuPerfil.classList.toggle("open");
      const arrow = perfilToggle.querySelector(".bi-chevron-down") || sideMenu.querySelector(".has-submenu .bi-chevron-down");
      if (arrow) arrow.classList.toggle("rotate");
    });
  }

  // -------------------------
  // CARRUSEL PRODUCTOS FIRESTORE
  // -------------------------
  const contenedor = document.getElementById("productos-container");
  let productosArray = [];

  if (contenedor) {
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
    } catch (error) {
      console.error("Error cargando productos:", error);
      contenedor.innerHTML = "<p>Error al cargar productos.</p>";
    }
  }

  // -------------------------
  // FUNCIONES DE RENDER
  // -------------------------
  function renderProductos(productos) {
    contenedor.innerHTML = ""; // <-- aquí usamos directamente #productos-container

    if (productos.length === 0) {
      contenedor.innerHTML = `<p class="text-center">No se encontraron productos.</p>`;
      return;
    }

    productos.forEach((p) => {
      const slide = document.createElement("div");
      slide.className = "swiper-slide";
      slide.innerHTML = `
        <div class="card" data-id="${p.id}">
          <img src="${p.imagen || 'https://cdn.pixabay.com/photo/2017/03/19/03/18/eggs-2151533_1280.jpg'}" alt="${p.Nombre}">
          <div class="card-content">
            <h3>${p.Nombre}</h3>
            <p>${p.Descripcion || ''}</p>
            <p class="price">$${p.Precio?.toLocaleString() || 0}</p>
            <p class="stock">Stock: ${p.Stock || 0}</p>
            <button class="btn-add"><i class="bi bi-cart-plus"></i> Agregar</button>
          </div>
        </div>
      `;
      contenedor.appendChild(slide);
    });

    if (window.swiperProductos) window.swiperProductos.destroy(true, true);

    window.swiperProductos = new Swiper(".productosSwiper", {
  loop: productos.length > 1,
  grabCursor: true,
  slidesPerView: 3,
  spaceBetween: 30,
  centeredSlides: productos.length === 1, // <-- esto centra el slide si es único
  autoplay: { delay: 3000, disableOnInteraction: false },
  speed: 800,
  pagination: { el: ".swiper-pagination", clickable: true, dynamicBullets: true },
  breakpoints: {
    1024: { slidesPerView: 3, centeredSlides: productos.length === 1 },
    768: { slidesPerView: 2, centeredSlides: productos.length === 1 },
    480: { slidesPerView: 1, centeredSlides: true },
  },
});
  }

  // -------------------------
  // BUSCADOR
  // -------------------------
  const searchForm = document.getElementById("searchForm");
  const searchInput = document.getElementById("searchInput");

  searchForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const term = searchInput.value.toLowerCase().trim();
    if (!term) return renderProductos(productosArray);

    const palabras = term.split(" ").filter(p => p.length > 0);

    const resultados = productosArray.filter(p => {
      const nombre = (p.Nombre || "").toLowerCase();
      const descripcion = (p.Descripcion || "").toLowerCase();
      return palabras.every(palabra => nombre.includes(palabra) || descripcion.includes(palabra));
    });

    renderProductos(resultados);
  });

  // -------------------------
  // CARRITO (localStorage)
  // -------------------------
  function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const cartCount = document.getElementById("cart-count");
    if (cartCount) cartCount.textContent = cart.length;
  }
  updateCartCount();

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-add");
    if (btn) {
      const card = btn.closest(".card");
      const id = card?.dataset?.id;
      if (id) {
        let cart = JSON.parse(localStorage.getItem("cart")) || [];
        cart.push(id);
        localStorage.setItem("cart", JSON.stringify(cart));
        updateCartCount();
        alert("Producto agregado al carrito ✅");
      }
    }
  });

  // -------------------------
  // AUTENTICACIÓN (UI)
  // -------------------------
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
        if (spinnerOverlay) spinnerOverlay.querySelector("p").textContent = "¡Sesión cerrada correctamente ✅";
        setTimeout(() => (window.location.href = "login.html"), 1000);
      } catch (err) {
        console.error("Logout error:", err);
        if (spinnerOverlay) spinnerOverlay.style.display = "none";
        alert("No se pudo cerrar sesión. Intenta nuevamente.");
      }
    });
  }

});
