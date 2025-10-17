// ../js/catalog.js
import { auth, db } from "../js/firebase-config.js";
import {collection, getDocs, doc, getDoc, setDoc, updateDoc, onSnapshot} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";


let carrito = [];
let usuarioUID = null;

document.addEventListener("DOMContentLoaded", async () => {

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
  const docRef = doc(db, "carritos", usuarioUID);
  await updateDoc(docRef, { items: carrito });
}



const cartBtn = document.querySelector(".cart-btn");
const cartPanel = document.getElementById("cart-panel");
const closeCartBtn = document.getElementById("close-cart");
const cartBadgeHeader = document.querySelector(".cart-count");
const cartBadgeFloating = document.getElementById("cart-count");


  // ==========================
  // ELEMENTOS DEL SPINNER
  // ==========================
  const spinner = document.getElementById("productos-spinner");
  const contenedor = document.getElementById("productos-container");

  function showSpinner() {
    if (spinner) spinner.style.display = "flex";
  }

  function hideSpinner() {
    if (spinner) spinner.style.display = "none";
  }

  // ==========================
  // MENÚ HAMBURGUESA
  // ==========================
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

  function openMenu() { hamburger?.classList.add("active"); sideMenu?.classList.add("open"); overlay?.classList.add("show"); }
  function closeMenu() { hamburger?.classList.remove("active"); sideMenu?.classList.remove("open"); overlay?.classList.remove("show"); 
    const submenu = sideMenu?.querySelector(".submenu"); if (submenu) submenu.classList.remove("open");
    const arrow = sideMenu?.querySelector(".bi-chevron-down"); if (arrow) arrow.classList.remove("rotate");
  }
  function toggleMenu(e) { if(e) e.stopPropagation(); sideMenu?.classList.contains("open") ? closeMenu() : openMenu(); }

  if(menuWrapper) menuWrapper.addEventListener("click", toggleMenu);
  overlay.addEventListener("click", closeMenu);

  const perfilToggle = document.getElementById("perfilToggle") || sideMenu?.querySelector(".has-submenu > a");
  const submenuPerfil = document.getElementById("submenuPerfil") || sideMenu?.querySelector(".has-submenu .submenu");
  if(perfilToggle && submenuPerfil){
    perfilToggle.addEventListener("click", (e)=>{
      e.preventDefault();
      e.stopPropagation();
      submenuPerfil.classList.toggle("open");
      const arrow = perfilToggle.querySelector(".bi-chevron-down") || sideMenu.querySelector(".has-submenu .bi-chevron-down");
      if(arrow) arrow.classList.toggle("rotate");
    });
  }

  // ==========================
  // CARGA DE PRODUCTOS
  // ==========================
  showSpinner();
  let productosArray = [];

  try {
    const querySnapshot = await getDocs(collection(db, "products"));
    if(querySnapshot.empty) {
      contenedor.innerHTML = "<p>No hay productos disponibles.</p>";
    } else {
      querySnapshot.forEach(doc=>{
        const p = doc.data();
        p.id = doc.id;
        productosArray.push(p);
      });
      renderProductos(productosArray);
    }
  } catch(err) {
    console.error("Error cargando productos:", err);
    contenedor.innerHTML = "<p>Error al cargar productos.</p>";
  } finally {
    hideSpinner();
  }

  // ==========================
  // FUNCIONES DE RENDER
  // ==========================
  function renderProductos(productos){
  contenedor.innerHTML = "";
  if(productos.length === 0){
    contenedor.innerHTML = `<p class="text-center">No se encontraron productos.</p>`;
    return;
  }

  productos.forEach(p=>{
    const slide = document.createElement("div");
    slide.className = "swiper-slide";

    const tieneStock = p.Stock > 0;
    let stockActual = p.Stock;

    const stockTexto = tieneStock ? `Stock: ${stockActual}` : "Agotado";
    const stockColor = tieneStock ? "linear-gradient(90deg, #4CAF50, #81C784)" : "linear-gradient(90deg, #e53935, #ef5350)";
    const btnTexto = tieneStock ? "Agregar" : "Sin productos";
    const btnColor = tieneStock ? "linear-gradient(90deg, #4CAF50, #66bb6a)" : "linear-gradient(90deg, #9e9e9e, #bdbdbd)";
    const btnDisabled = tieneStock ? "" : "disabled";

    slide.innerHTML = `
      <div class="card" data-id="${p.id}">
        <img src="${p.imagen || "https://cdn.pixabay.com/photo/2017/03/19/03/18/eggs-2151533_1280.jpg"}" alt="${p.Nombre}">
        <div class="card-content">
          <h3>${p.Nombre}</h3>
          <p>${p.Descripción || ""}</p>
          <p class="price">$${p.Precio?.toLocaleString() || 0}</p>
          <p class="stock" style="background:${stockColor};">${stockTexto}</p>
          <button class="btn-add" style="background:${btnColor};" ${btnDisabled}><i class="bi bi-cart-plus"></i> ${btnTexto}</button>
        </div>
      </div>
    `;

    contenedor.appendChild(slide);

    const card = slide.querySelector(".card");
    const addBtn = card.querySelector(".btn-add");

    // ====== CONTADOR + / - ======
    if(!card.querySelector(".cantidad-control") && tieneStock){
      const control = document.createElement("div");
      control.classList.add("cantidad-control");
      control.innerHTML = `<button class="menos">-</button><span class="cantidad">1</span><button class="mas">+</button>`;
      const cantidadEl = control.querySelector(".cantidad");
      let cantidad = 1;
      card.querySelector(".card-content").insertBefore(control, addBtn);

      control.querySelector(".mas").addEventListener("click", ()=>{ if(cantidad<stockActual) cantidadEl.textContent = ++cantidad; });
      control.querySelector(".menos").addEventListener("click", ()=>{ if(cantidad>1) cantidadEl.textContent = --cantidad; });
    }

    // ====== BOTÓN VER DETALLES ======
    if(!card.querySelector(".btn-detalle")){
      const btnDetalle = document.createElement("a");
      btnDetalle.className = "btn-detalle";
      btnDetalle.href = `product_detail.html?id=${p.id}`;
      btnDetalle.textContent = "Ver más detalles";
      card.querySelector(".card-content").appendChild(btnDetalle);
    }

    // ====== BOTÓN AGREGAR ======
addBtn?.addEventListener("click", async () => {
  if (stockActual === 0) return;

  // 🔹 Tomar la cantidad seleccionada
  const cantidad = parseInt(card.querySelector(".cantidad").textContent);

  // 🔹 Actualizar carrito local primero
  const existente = carrito.find((item) => item.id === p.id);
  if (existente) {
    existente.cantidad += cantidad;
  } else {
    carrito.push({
      id: p.id,
      nombre: p.Nombre,
      precio: p.Precio,
      imagen: p.imagen,
      cantidad
    });
  }

  // 🔹 Actualizar la bolita de carrito y animación
  updateCartCount();

  // 🔹 Mostrar toast verde
  showGreenToast(`"${p.Nombre}" agregado al carrito ✅`);

  // 🔹 Guardar en Firestore después (no bloquea la UI)
  await guardarCarritoEnFirestore();

  // 🔹 Actualizar panel si está abierto
  if (document.querySelector(".cart-panel.open")) {
    renderCartPanel();
  }

  // 🔹 Actualizar stock visual
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

  // 🔹 Reiniciar contador de cantidad
  card.querySelector(".cantidad").textContent = 1;
});



  });

  // ====== REINICIAR SWIPER ======
  if(window.swiperProductos) window.swiperProductos.destroy(true,true);
  window.swiperProductos = new Swiper(".productosSwiper",{
    loop: productos.length>1,
    grabCursor:true,
    slidesPerView:3,
    spaceBetween:30,
    centeredSlides:productos.length===1,
    autoplay:{delay:3000, disableOnInteraction:false},
    speed:800,
    pagination:{el:".swiper-pagination", clickable:true, dynamicBullets:true},
    breakpoints:{
      1024:{slidesPerView:3, centeredSlides:productos.length===1},
      768:{slidesPerView:2, centeredSlides:productos.length===1},
      480:{slidesPerView:1, centeredSlides:true},
    }
  });
}

  // ==========================
// 🟢 BARRA DE BÚSQUEDA ULTRA EXACTA
// ==========================
const searchInput = document.getElementById("searchInput");

function normalizarTexto(texto) {
  return (texto || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

let palabrasBusqueda = [];

if (searchInput) {
  searchInput.addEventListener("input", () => {
    const valor = normalizarTexto(searchInput.value);
    palabrasBusqueda = valor === "" ? [] : valor.split(/\s+/);

    // Filtrar productos
    const filtrados = productosArray.filter((p) => {
      const nombre = normalizarTexto(p.Nombre || "");
      const palabrasNombre = nombre.split(/\s+/);
      return palabrasBusqueda.every((palabra) => palabrasNombre.includes(palabra));
    });

    // Mostrar resultados o mensaje
    if (filtrados.length === 0) {
  contenedor.innerHTML = `
    <div style="
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      font-size: 1.4rem;
      font-weight: 600;
      color: #444;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      width: 100%;
    ">
      <span style="font-size:2rem;">⚠️</span>
      <span>Producto no disponible</span>
    </div>
  `;
} else {
      renderProductos(filtrados);
    }
  });
}

  // ==========================
  // CARRITO
  // ==========================
  function updateCartCount() {
  const headerCount = document.querySelector(".header-right .cart-count");
  const floatingCount = document.getElementById("cart-count");
  const cantidadTotal = carrito.reduce((acc, item) => acc + item.cantidad, 0);
  if(headerCount) headerCount.textContent = cantidadTotal;
  if(floatingCount) floatingCount.textContent = cantidadTotal;
}

  updateCartCount();

  // ==========================
  // TOAST VERDE
  // ==========================
  function showGreenToast(message="Producto agregado ✅", duration=2000){
    let toast = document.getElementById("toast-message");
    if(!toast){
      toast = document.createElement("div");
      toast.id = "toast-message";
      toast.style.position="fixed";
      toast.style.top="50%";
      toast.style.left="50%";
      toast.style.transform="translate(-50%,-50%) scale(0.8)";
      toast.style.background="#4CAF50";
      toast.style.color="#fff";
      toast.style.padding="16px 24px";
      toast.style.borderRadius="12px";
      toast.style.fontSize="1.1rem";
      toast.style.fontWeight="600";
      toast.style.boxShadow="0 4px 10px rgba(0,0,0,0.2)";
      toast.style.display="none";
      toast.style.transition="opacity 0.4s ease, transform 0.4s ease";
      toast.style.zIndex="9999";
      document.body.appendChild(toast);
    }

    toast.textContent=message;
    toast.style.display="flex";
    toast.style.opacity="0";
    requestAnimationFrame(()=>{ toast.style.opacity="1"; toast.style.transform="translate(-50%,-50%) scale(1)"; });

    setTimeout(()=>{
      toast.style.opacity="0";
      toast.style.transform="translate(-50%,-50%) scale(0.9)";
      setTimeout(()=>{ toast.style.display="none"; },400);
    }, duration);
  }

  // ==========================
  // AUTENTICACIÓN
  // ==========================
  const logoutBtn = document.getElementById("logoutBtn");
  const userNameElement = document.getElementById("userName");

  onAuthStateChanged(auth,user=>{
    if(user){
      const name = user.displayName||user.email?.split("@")[0]||"Usuario";
      if(userNameElement) userNameElement.textContent=name;
    }else{
      if(userNameElement) userNameElement.textContent="Usuario";
    }
  });

  if(logoutBtn){
    const spinnerOverlay = document.getElementById("logout-spinner");
    logoutBtn.addEventListener("click", async ()=>{
      try{
        if(spinnerOverlay) spinnerOverlay.style.display="flex";
        await new Promise(res=>setTimeout(res,700));
        await signOut(auth);
        if(spinnerOverlay) spinnerOverlay.querySelector("p").textContent="¡Sesión cerrada correctamente ✅";
        setTimeout(()=>window.location.href="login.html",1000);
      }catch(err){
        console.error("Logout error:",err);
        if(spinnerOverlay) spinnerOverlay.style.display="none";
      }
    });
  }

});

  // =========================
// 🛒 PANEL LATERAL CARRITO (AJUSTADO)
// =========================
const floatingCartBtn = document.getElementById("floating-cart");
const cartPanelNuevo = document.getElementById("cart-panel");
const closeCartNuevo = document.getElementById("close-cart");
const overlay = document.getElementById("cart-overlay");
const goToCartBtn = document.getElementById("go-to-cart");

// 🔹 Abrir panel al hacer clic en el carrito flotante
floatingCartBtn?.addEventListener("click", (e) => {
  e.preventDefault(); // Evita ir a cart.html
  cartPanelNuevo?.classList.add("open");
  overlay?.classList.add("active");
});

// 🔹 Cerrar panel
closeCartNuevo?.addEventListener("click", () => {
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
            <span>Cant: ${item.cantidad}</span>
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
