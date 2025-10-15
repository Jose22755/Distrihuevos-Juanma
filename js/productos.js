// =========================
// 🛒 MANEJO DEL CARRITO
// =========================
const cartBtn = document.querySelector(".cart-btn");       // Header
const cartPanel = document.getElementById("cartPanel");    // Panel de carrito
const closeCartBtn = document.getElementById("closeCart");
const cartList = document.querySelector(".cart-list");    
const cartBadgeHeader = document.querySelector(".cart-count"); // Header
const cartBadgeFloating = document.getElementById("cart-count"); // Flotante
const totalElem = document.querySelector(".cart-summary .total");
const clearCartBtn = document.querySelector(".clear-cart");

// =========================
// 📦 Cargar carrito desde localStorage
// =========================
let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

// =========================
// Mostrar / ocultar carrito
// =========================
cartBtn?.addEventListener("click", () => cartPanel?.classList.toggle("open"));
closeCartBtn?.addEventListener("click", () => cartPanel?.classList.remove("open"));

// =========================
// 🟢 TOAST VERDE
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
      transform: "translate(-50%, -50%) scale(0.8)",
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
      textAlign: "center"
    });
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.style.display = "flex";
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translate(-50%, -50%) scale(1)";
  });

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translate(-50%, -50%) scale(0.9)";
    setTimeout(() => toast.style.display = "none", 400);
  }, duration);
}

// =========================
// 🥚 AGREGAR PRODUCTOS DESDE CARDS
// =========================
document.querySelectorAll(".card").forEach(card => {
  const addBtn = card.querySelector(".btn-add");
  const stockSpan = card.querySelector(".stock");
  let stock = parseInt(stockSpan.dataset.stock || stockSpan.textContent.replace(/\D/g, "")) || 0;

  // Crear contador interno solo si no existe
  if (!card.querySelector(".cantidad-control")) {
    const control = document.createElement("div");
    control.classList.add("cantidad-control");
    control.innerHTML = `<button class="menos">-</button>
                         <span class="cantidad">1</span>
                         <button class="mas">+</button>`;
    const cantidadEl = control.querySelector(".cantidad");
    let cantidad = 1;
    card.querySelector(".card-content").insertBefore(control, addBtn);

    control.querySelector(".mas").addEventListener("click", () => {
      if (cantidad < stock) cantidadEl.textContent = ++cantidad;
    });
    control.querySelector(".menos").addEventListener("click", () => {
      if (cantidad > 1) cantidadEl.textContent = --cantidad;
    });
  }

  // Crear botón Ver Detalles solo si no existe
  if (!card.querySelector(".btn-detalle")) {
    const btnDetalle = document.createElement("a");
    btnDetalle.className = "btn-detalle";
    btnDetalle.href = `product_detail.html?id=${card.dataset.id}`;
    btnDetalle.textContent = "Ver más detalles";
    card.querySelector(".card-content").appendChild(btnDetalle);
  }

  // Botón agregar
  addBtn?.addEventListener("click", () => {
    if (stock === 0) return;

    const nombre = card.querySelector("h3").textContent;
    const precioTexto = card.querySelector(".price").textContent;
    const precio = parseFloat(precioTexto.replace("$", "").replace(".", "").replace(",", "."));
    const imagen = card.querySelector("img").src;

    const cantidadControl = card.querySelector(".cantidad-control span.cantidad");
    const cantidad = parseInt(cantidadControl.textContent);

    const existente = carrito.find(p => p.nombre === nombre);
    if (existente) {
      existente.cantidad += cantidad;
    } else {
      carrito.push({ nombre, precio, imagen, cantidad });
    }

    // Reducir stock
    stock -= cantidad;
    if (stock <= 0) {
      addBtn.disabled = true;
      addBtn.innerHTML = '<i class="bi bi-x-circle"></i> Agotado';
      stockSpan.style.backgroundColor = "#e53935";
      stockSpan.textContent = "Sin stock";
    } else {
      stockSpan.textContent = `Stock: ${stock}`;
    }

    // Reiniciar contador
    cantidadControl.textContent = 1;

    actualizarCarrito();
    showGreenToast(`"${nombre}" agregado al carrito ✅`);
  });
});

// =========================
// 🔄 ACTUALIZAR CARRITO
// =========================
function actualizarCarrito() {
  localStorage.setItem("carrito", JSON.stringify(carrito));

  const cantidadTotal = carrito.reduce((sum, p) => sum + p.cantidad, 0);

  // Actualizar bolita header
  if (cartBadgeHeader) cartBadgeHeader.textContent = cantidadTotal;

  // Actualizar bolita flotante
  if (cartBadgeFloating) {
    cartBadgeFloating.textContent = cantidadTotal;
    cartBadgeFloating.animate([
      { transform: "scale(1)" },
      { transform: "scale(1.3)" },
      { transform: "scale(1)" }
    ], { duration: 300, easing: "ease-out" });
  }

  // Actualizar panel de carrito
  if (!cartList) return;
  cartList.innerHTML = carrito.length === 0 ? "<p>No hay productos aún.</p>" : "";

  carrito.forEach((p, index) => {
    const item = document.createElement("div");
    item.className = "cart-item";
    item.style.display = "flex";
    item.style.alignItems = "center";
    item.style.justifyContent = "space-between";
    item.style.marginBottom = "10px";

    item.innerHTML = `
      <img src="${p.imagen}" alt="${p.nombre}" style="width:50px;height:50px;border-radius:8px;object-fit:cover;">
      <div style="flex:1;margin-left:10px;">
        <p style="margin:0;font-weight:500;">${p.nombre}</p>
        <small>$${p.precio.toLocaleString()}</small>
      </div>
      <div style="display:flex;align-items:center;gap:5px;">
        <button class="menos" style="border:none;background:#eee;border-radius:5px;padding:2px 6px;cursor:pointer;">-</button>
        <span>${p.cantidad}</span>
        <button class="mas" style="border:none;background:#eee;border-radius:5px;padding:2px 6px;cursor:pointer;">+</button>
      </div>
      <button class="eliminar" style="border:none;background:transparent;color:#d9534f;cursor:pointer;font-size:1rem;">✕</button>
    `;

    item.querySelector(".mas").addEventListener("click", () => { p.cantidad++; actualizarCarrito(); });
    item.querySelector(".menos").addEventListener("click", () => { p.cantidad > 1 ? p.cantidad-- : carrito.splice(index, 1); actualizarCarrito(); });
    item.querySelector(".eliminar").addEventListener("click", () => { carrito.splice(index, 1); actualizarCarrito(); });

    cartList.appendChild(item);
  });

  // Total
  const total = carrito.reduce((sum, p) => sum + p.precio * p.cantidad, 0);
  if (totalElem) totalElem.textContent = `$${total.toLocaleString()}`;
}

// =========================
// Limpiar carrito
// =========================
clearCartBtn?.addEventListener("click", () => {
  carrito = [];
  actualizarCarrito();

  document.querySelectorAll(".card").forEach(card => {
    const addBtn = card.querySelector(".btn-add");
    const stockSpan = card.querySelector(".stock");
    const stockInicial = parseInt(stockSpan.dataset.stock) || 0;
    stockSpan.textContent = `Stock: ${stockInicial}`;
    stockSpan.style.backgroundColor = "#4CAF50";
    addBtn.disabled = false;
    addBtn.innerHTML = '<i class="bi bi-cart-plus"></i> Agregar';
  });
});

// =========================
// 🟢 FILTRO POR CATEGORÍAS
// =========================
document.querySelectorAll(".cat-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const categoria = btn.dataset.cat.toLowerCase();
    document.querySelectorAll(".card").forEach(prod => {
      prod.style.display = (categoria === "todos" || prod.dataset.cat.toLowerCase() === categoria) ? "block" : "none";
    });
  });
});

// =========================
// Inicializar contador del carrito al cargar
// =========================
actualizarCarrito();
