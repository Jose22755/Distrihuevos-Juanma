// ../js/catalog.js
import { auth, db } from "../js/firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

document.addEventListener("DOMContentLoaded", async () => {

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
      const stockTexto = tieneStock ? `Stock: ${p.Stock}` : "Agotado";
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

      // ====== CONTADOR + / - ======
      const card = slide.querySelector(".card");
      const addBtn = card.querySelector(".btn-add");
      let stockActual = p.Stock;

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
      addBtn?.addEventListener("click", ()=>{
        if(stockActual === 0) return;

        const cantidadControl = card.querySelector(".cantidad-control span.cantidad");
        const cantidad = parseInt(cantidadControl.textContent);

        let cart = JSON.parse(localStorage.getItem("cart")) || [];
        const existente = cart.find(item=>item.id===p.id);
        if(existente) existente.cantidad += cantidad;
        else cart.push({id:p.id, cantidad});
        localStorage.setItem("cart", JSON.stringify(cart));
        updateCartCount();

        stockActual -= cantidad;
        const stockSpan = card.querySelector(".stock");
        if(stockActual <= 0){
          addBtn.disabled = true;
          addBtn.innerHTML = '<i class="bi bi-x-circle"></i> Agotado';
          stockSpan.textContent = "Sin stock";
          stockSpan.style.background = "linear-gradient(90deg, #e53935, #ef5350)";
        } else {
          stockSpan.textContent = `Stock: ${stockActual}`;
        }

        cantidadControl.textContent = 1;
        showGreenToast(`"${p.Nombre}" agregado al carrito ✅`);
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
  // BUSCADOR
  // ==========================
  const searchForm = document.getElementById("searchForm");
  const searchInput = document.getElementById("searchInput");

  searchForm?.addEventListener("submit", e=>{
    e.preventDefault();
    const term = searchInput.value.toLowerCase().trim();
    if(!term) return renderProductos(productosArray);

    const palabras = term.split(" ").filter(p=>p.length>0);
    const resultados = productosArray.filter(p=>{
      const nombre = (p.Nombre||"").toLowerCase();
      const descripcion = (p.Descripcion||"").toLowerCase();
      return palabras.every(palabra=>nombre.includes(palabra)||descripcion.includes(palabra));
    });

    renderProductos(resultados);
  });

  // ==========================
  // CARRITO
  // ==========================
  function updateCartCount(){
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const headerCount = document.querySelector(".header-right .cart-count");
    if(headerCount) headerCount.textContent = cart.length;
    const floatingCount = document.getElementById("cart-count");
    if(floatingCount) floatingCount.textContent = cart.length;
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
