// ../js/product_detail.js
import { auth, db } from "../js/firebase-config.js";
import { doc, getDoc, setDoc, addDoc, updateDoc, onSnapshot, increment, collection, getDocs, query, limit } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

document.addEventListener("DOMContentLoaded", async () => {
  const productImageEl = document.getElementById("product-image");
  const nameEl = document.getElementById("product-name");
  const descEl = document.getElementById("product-description");
  const priceEl = document.getElementById("product-price");
  const qtyInput = document.getElementById("qty");
  const addCartBtn = document.querySelector(".add-cart");
  const buyNowBtn = document.querySelector(".buy-now");
  const categoryEl = document.getElementById("product-category");
  const stockEl = document.getElementById("product-stock");

  if (!productImageEl || !nameEl || !descEl || !priceEl || !qtyInput || !addCartBtn || !buyNowBtn) return;

  const params = new URLSearchParams(window.location.search);
  const productoId = params.get("id");

  if (!productoId) {
    nameEl.textContent = "No se recibió el ID del producto.";
    return;
  }

  nameEl.textContent = "Cargando producto...";

  try {
    const docRef = doc(db, "products", productoId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      nameEl.textContent = "Producto no encontrado.";
      return;
    }

        // ⬇️ ⬇️ ⬇️ PEGA AQUÍ LA FUNCIÓN COMPLETA ⬇️ ⬇️ ⬇️
    function cargarImagenesProducto(imagenes) {
      const mainImage = document.getElementById("main-image");
      const thumbsContainer = document.getElementById("thumbs-container");

      if (!mainImage || !thumbsContainer) return;

      mainImage.src = imagenes[0];

      thumbsContainer.innerHTML = "";

      imagenes.forEach((img, index) => {
        const thumb = document.createElement("img");
        thumb.src = img;

        if (index === 0) thumb.classList.add("active");

        thumb.addEventListener("click", () => {
          mainImage.src = img;
          document.querySelectorAll(".image-thumbs img")
                  .forEach(t => t.classList.remove("active"));
          thumb.classList.add("active");
        });

        thumbsContainer.appendChild(thumb);
      });
    }

    // PRODUCTO
    const producto = docSnap.data();
    let stock = producto.Stock ?? 0;

    // ------------------------------------------
// 🔥 BENEFICIOS DEL PRODUCTO
// ------------------------------------------
// ------------------------------------------
// 🔥 BENEFICIOS DEL PRODUCTO
// ------------------------------------------
const beneficiosContainer = document.querySelector(".nutritional-cards");

if (beneficiosContainer) {

  // Array de beneficios por defecto con iconos
  const beneficiosPorDefecto = [
    { 
      titulo: "Proteínas de alta calidad", 
      descripcion: "Los huevos contienen proteínas completas con todos los aminoácidos esenciales, ideales para el desarrollo muscular y energía.",
    },
    { 
      titulo: "Vitaminas esenciales", 
      descripcion: "Ricos en vitaminas A, D, E y B12, importantes para la visión, el sistema inmunológico, la salud de los huesos y la piel.",
    },
    { 
      titulo: "Minerales importantes", 
      descripcion: "Aportan hierro, fósforo, zinc y selenio, que apoyan la formación de glóbulos rojos, la salud ósea y funciones antioxidantes.",
    },
    { 
      titulo: "Grasas saludables", 
      descripcion: "Incluyen ácidos grasos insaturados y lecitina que favorecen la salud cerebral y cardiovascular.",
    },
    { 
      titulo: "Colina", 
      descripcion: "Fuente natural de colina, esencial para la memoria, el cerebro y el sistema nervioso.",
    },
    { 
      titulo: "Saciedad y control de peso", 
      descripcion: "Su combinación de proteínas y grasas ayuda a sentirse lleno por más tiempo, favoreciendo el control del apetito.",
    },
    { 
      titulo: "Antioxidantes", 
      descripcion: "Contienen luteína y zeaxantina, que protegen la vista y ayudan a prevenir daños oxidativos en las células.",
    }
  ];

  async function crearBeneficios(productoId) {
    const docRef = doc(db, "products", productoId);
    try {
      await setDoc(docRef, { beneficios: beneficiosPorDefecto }, { merge: true });
      console.log("Beneficios guardados en Firestore ✅");
    } catch (err) {
      console.error("No se pudo guardar los beneficios en Firestore:", err);
    }
  }

  async function renderizarBeneficios(producto) {
    onAuthStateChanged(auth, async (user) => {
      if (user && !producto.beneficios) {
        await crearBeneficios(productoId);
        producto.beneficios = beneficiosPorDefecto;
      }

      const listaBeneficios = producto.beneficios || beneficiosPorDefecto;
      beneficiosContainer.innerHTML = "";

      listaBeneficios.forEach(b => {
        const card = document.createElement("div");
        card.classList.add("card");
        card.innerHTML = `
          <h3>${b.titulo}</h3>
          <p>${b.descripcion}</p>
        `;
        beneficiosContainer.appendChild(card);
      });
    });
  }

  renderizarBeneficios(producto);
}

// =====================
// 🔥 RESEÑAS DESDE FIRESTORE CON SWEETALERT (sin botón)
// =====================
const reviewsContainer = document.getElementById("reviews-container");
const reviewForm = document.getElementById("review-form");

// ==========================
// VALIDACIÓN EN TIEMPO REAL
// ==========================
const textInput = document.getElementById("review-text");
const errorName = document.getElementById("error-name");
const errorText = document.getElementById("error-text");


textInput.addEventListener("input", () => {
  if (textInput.value.trim() === "") {
    errorText.textContent = "⚠️ Escribe tu reseña antes de enviar";
    textInput.classList.add("error-shake");
  } else {
    errorText.textContent = "";
    textInput.classList.remove("error-shake");
  }
});




reviewForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const texto = document.getElementById('review-text').value.trim();
  const errorText = document.getElementById('error-text');

  // limpiar mensajes
  errorText.innerHTML = "";

  // sacar nombre del usuario de firebase
  let nombre = "Usuario";

  const user = auth.currentUser;
  if(user){
    nombre = user.displayName || "Usuario";
  }

  let valido = true;

  if(texto === ""){
    errorText.textContent = "⚠️ Escribe tu reseña antes de enviar";
    valido = false;
  }

  if(!valido) return;

  try {

    await addDoc(collection(db, "products", productoId, "reviews"), {
      nombre,
      texto,
      fecha: new Date()
    });

    Swal.fire({
      icon: 'success',
      title: 'Reseña agregada',
      text: 'Gracias por tu comentario!',
      timer: 2000,
      showConfirmButton: false
    });

    reviewForm.reset();

  } catch(err) {
    console.error(err);
  }

});


if (reviewsContainer && reviewForm && productoId) {

  const reviewsColRef = collection(db, "products", productoId, "reviews");

  // 🔥 escuchar cambios en tiempo real
onSnapshot(reviewsColRef, () => {
  renderReviews();
});



  // Función para renderizar reseñas
async function renderReviews() {
  reviewsContainer.innerHTML = "";
  const snapshot = await getDocs(reviewsColRef);
  const reviewsData = [];

  snapshot.forEach(doc => {
    reviewsData.push(doc.data());
  });

  // Si no hay reseñas, mostrar mensaje grande
  if (reviewsData.length === 0) {
    reviewsContainer.innerHTML = `
      <p class="no-reviews" style="
        text-align: center;
        color: #555;
        padding: 32px;
        font-size: 1.5rem;
        font-style: italic;
        font-weight: 600;
      ">
        Aún no hay comentarios para este producto.
      </p>
    `;
    return; // salir de la función
  }

  // ordenar por fecha descendente (más recientes primero)
  reviewsData.sort((a, b) => b.fecha - a.fecha);

  // tomar solo los 2 más recientes
  const ultimas2 = reviewsData.slice(0, 2);

  ultimas2.forEach(data => {
    const card = document.createElement("div");
    card.classList.add("review-card");
    card.innerHTML = `
      <div class="review-avatar">
        ${data.nombre.charAt(0).toUpperCase()}
      </div>

      <div class="review-content">
        <p class="author">${data.nombre}</p>
        <p class="text">${data.texto}</p>
      </div>
    `;
    reviewsContainer.appendChild(card);
  });
}


  // Render inicial

  // Evento para agregar nueva reseña

}

  
    // ------------------------------------------
    // 🔥 FUNCIÓN PARA DESCONTAR EN FIRESTORE
    // ------------------------------------------
    async function descontarStockEnFirestore(cantidadTomada) {
      try {
        await updateDoc(doc(db, "products", productoId), {
          Stock: increment(-cantidadTomada)
        });
      } catch (e) {
        console.error("Error al descontar stock:", e);
      }
    }
// ------------------------------------------
// RENDER DE DATOS
// ------------------------------------------
// Actualizar solo la imagen principal sin borrar el HTML
const mainImg = document.getElementById("main-image");
if (mainImg) {
  mainImg.src = producto.imagen || "https://cdn.pixabay.com/photo/2017/03/19/03/18/eggs-2151533_1280.jpg";
}

// Miniaturas


// 🔥 Cargar miniaturas (si tienes más imágenes en Firestore)
const imagenes = [
  producto.imagen,
  producto.imagen2,
  producto.imagen3
].filter(img => img); // quita los null

cargarImagenesProducto(imagenes);

nameEl.textContent = producto.Nombre;



descEl.innerHTML = `
  <span class="descripcion-label">Descripción:</span> 
  <span class="descripcion-valor">${producto.Descripción || ''}</span>
`;

categoryEl.innerHTML = `
  <span class="categoria-label">Categoría:</span> 
  <span class="categoria-valor">${producto.Categoria || "No definida"}</span>
`;

priceEl.innerHTML = `
  <span class="price-label">Precio:</span> 
  <span class="price-valor monto">$${producto.Precio?.toLocaleString() || 0}</span>
`;

// ------------------------------------------
// 🔥 STOCK + BARRA + TEXTO 0/1000
// ------------------------------------------
const STOCK_MAX = 1000;
const stockActual = Number(producto.Stock ?? 0);

// Render HTML
stockEl.innerHTML = `
  <div class="stock-top">
    <div class="stock-left">
      <span class="stock-label">Stock:</span> 
      <span class="stock-valor">${stockActual}</span>
    </div>
    <span class="stock-maximo" id="stock-maximo-text">
      ${stockActual}/${STOCK_MAX}
    </span>
  </div>

  <div class="stock-indicador">
    <div class="stock-barra" id="stock-barra"></div>
  </div>
`;
// Llamamos a la función que actualiza el semáforo
actualizarSemaforo(stockActual);

// ------------------------------------------
// FUNCION SEMÁFORO
// ------------------------------------------
function actualizarSemaforo(stock) {
  const barra = document.getElementById("stock-barra");
  const texto = document.getElementById("stock-maximo-text");

  if (!barra || !texto) return;

  // Calcular porcentaje
  const porcentaje = Math.min((stock / STOCK_MAX) * 100, 100);

  // Ajustar barra
  barra.style.width = porcentaje + "%";

  // Actualizar texto arriba por si quieres cambiar el máximo después
  texto.textContent = `${stock}/${STOCK_MAX}`;

  // Colores según cantidad
  if (porcentaje >= 70) {
    barra.style.background = "var(--verde)";
  } else if (porcentaje >= 30) {
    barra.style.background = "var(--amarillo)";
  } else {
    barra.style.background = "var(--rojo)";
  }
}


    // ------------------------------------------
    // CONTROLES DE CANTIDAD
    // ------------------------------------------
    const cantidadControl = document.querySelector(".cantidad-control");
    const btnMas = cantidadControl.querySelector(".plus");
    const btnMenos = cantidadControl.querySelector(".minus");
    const qtyEl = cantidadControl.querySelector("#qty");

    let cantidad = 1;

    const actualizarBotones = () => {
      qtyEl.textContent = cantidad;
      btnMenos.disabled = cantidad <= 1;
      btnMas.disabled = cantidad >= stock;
    };

    btnMas.addEventListener("click", () => {
      if (cantidad < stock) {
        cantidad++;
        actualizarBotones();
      }
    });

    btnMenos.addEventListener("click", () => {
      if (cantidad > 1) {
        cantidad--;
        actualizarBotones();
      }
    });

    actualizarBotones();

    const actualizarStock = () => {
        // actualizar solo el número
  const valor = stockEl.querySelector(".stock-valor");
  if (valor) valor.textContent = stock;

  // actualizar barra
  actualizarSemaforo(stock);

      if (stock <= 0) {
        addCartBtn.textContent = "Agotado ❌";
        addCartBtn.classList.add("agotado");
        buyNowBtn.disabled = true;
        btnMas.disabled = true;
        btnMenos.disabled = true;
      } else {
        addCartBtn.textContent = "Agregar al carrito";
        addCartBtn.classList.remove("agotado");
        buyNowBtn.disabled = false;
        btnMas.disabled = false;
        btnMenos.disabled = cantidad <= 1;
      }
    };

    actualizarStock();

    // ------------------------------------------
    // CARRITO
    // ------------------------------------------
    let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    let usuarioUID = null;

    onAuthStateChanged(auth, (user) => {
      usuarioUID = user ? user.uid : null;
    });

    async function guardarCarritoFirestore() {
      if (!usuarioUID) return;
      const docRefCarrito = doc(db, "carritos", usuarioUID);
      await setDoc(docRefCarrito, { items: carrito }, { merge: true });
    }

// ------------------------------------------------------------
// BOTÓN: AGREGAR AL CARRITO
// ------------------------------------------------------------
addCartBtn.addEventListener("click", async () => {

  // prevenir clicks dobles
  addCartBtn.disabled = true;

if (stock <= 0) {
  Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'error',
    title: 'Producto agotado ❌',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    background: '#f44336',
    color: '#fff'
  });
  addCartBtn.disabled = false;
  return;
}

  const take = Math.min(cantidad, stock);

  let existe = carrito.find(p => p.id === productoId);

  if (existe) {
    existe.cantidad += take;
  } else {
    carrito.push({
      id: productoId,
      nombre: producto.Nombre,
      precio: producto.Precio,
      imagen: producto.imagen || "",
      cantidad: take
    });
  }

  stock -= take;

  await descontarStockEnFirestore(take);

  actualizarStockVisual(stock);
  cantidad = 1;
  actualizarBotones();
  actualizarStock();

  localStorage.setItem("carrito", JSON.stringify(carrito));
  guardarCarritoFirestore();

Swal.fire({
  icon: 'success',
  title: '¡Listo!',
  text: 'Producto agregado al carrito',
  timer: 2000,
  showConfirmButton: false
});

  addCartBtn.disabled = false;
});

console.log("¿Existe buyNowBtn?:", buyNowBtn);
console.log("ID real del botón:", document.getElementById("buyNowBtn"));
console.log("¿El script está cargado?: LLEGÓ AL SCRIPT");

// ------------------------------------------------------------
// BOTÓN: COMPRAR AHORA
// ------------------------------------------------------------
buyNowBtn.addEventListener("click", async () => {

  buyNowBtn.disabled = true;

  // 🔥 Validación infalible: sin stock → sí o sí muestra alerta
  if (!stock || stock === 0) {
    Swal.fire({
      icon: "error",
      title: "Sin stock",
      text: "Este producto ya no está disponible 😢",
      timer: 2000,
      showConfirmButton: false
    });

    buyNowBtn.disabled = false;
    return;
  }

  // SI HAY STOCK → COMPRAR
  const take = Math.min(1, stock);

  let existe = carrito.find(p => p.id === productoId);

  if (existe) {
    existe.cantidad += take;
  } else {
    carrito.push({
      id: productoId,
      nombre: producto.Nombre,
      precio: producto.Precio,
      imagen: producto.imagen || "",
      cantidad: take
    });
  }

  stock -= take;

  await descontarStockEnFirestore(take);
  actualizarStockVisual(stock);
  cantidad = 1;
  actualizarBotones();
  actualizarStock();

  localStorage.setItem("carrito", JSON.stringify(carrito));
  guardarCarritoFirestore();

  window.location.href = "cart.html";

});



// ------------------------------------------------------------
// FUNCION PARA ACTUALIZAR BARRA Y TEXTO DE STOCK
// ------------------------------------------------------------
function actualizarStockVisual(stock) {
  const barra = document.getElementById("stock-barra");
  const texto = document.getElementById("stock-maximo-text");
  if (!barra || !texto) return;

  const porcentaje = Math.min((stock / STOCK_MAX) * 100, 100);
  barra.style.width = porcentaje + "%";
  texto.textContent = `${stock}/${STOCK_MAX}`;

  // Colores tipo semáforo
  if (stock > STOCK_MAX * 0.5) {
    barra.style.background = "var(--verde)";
  } else if (stock > STOCK_MAX * 0.2) {
    barra.style.background = "var(--amarillo)";
  } else {
    barra.style.background = "var(--rojo)";
  }
}


  } catch (err) {
    console.error("Error cargando producto:", err);
    nameEl.textContent = "Ocurrió un error al cargar el producto.";
  }


// ------------------------------------------
// 🔥 PRODUCTOS RELACIONADOS
// ------------------------------------------
const relacionadosGrid = document.getElementById("relacionados-grid");

if (relacionadosGrid) {
  async function cargarProductosRelacionados() {
    try {
      const productosCol = collection(db, "products");
      const q = query(productosCol, limit(10));
      const snapshot = await getDocs(q);

      relacionadosGrid.innerHTML = "";

      let count = 0;
      const tarjetasArray = [];

      snapshot.forEach(doc => {
        if (doc.id === productoId) return;
        if (count >= 3) return;
        count++;

        const producto = doc.data();
        const tarjeta = document.createElement("div");
        tarjeta.classList.add("tarjeta-relacionada");

        tarjeta.innerHTML = `
          <img src="${producto.imagen || 'https://cdn.pixabay.com/photo/2017/03/19/03/18/eggs-2151533_1280.jpg'}" alt="${producto.Nombre}">
          <h4>${producto.Nombre}</h4>

          <p class="price-rel">
            $${producto.Precio?.toLocaleString() || 0}
          </p>

          <button class="add-cart" onclick="agregarCarrito('${doc.id}', '${producto.Nombre}', ${producto.Precio}, '${producto.imagen || ''}')">
            <i class="bi bi-cart-plus"></i>Agregar
          </button>

          <a href="product_detail.html?id=${doc.id}" class="ver-detalles-btn">
            Ver detalles
          </a>
        `;

        relacionadosGrid.appendChild(tarjeta);
        tarjetasArray.push(tarjeta);
      });

      // FILTRADO
      const inputBusqueda = document.getElementById("busqueda");
      const btnBuscar = document.querySelector(".btn-search");

      if (inputBusqueda) {

        function filtrarProductos(alertSiNoHay = false) {
          const valor = inputBusqueda.value.toLowerCase();
          let primerVisible = null;

          tarjetasArray.forEach(tarjeta => {
            const nombre = tarjeta.querySelector("h4")?.textContent.toLowerCase() || "";
            if (nombre.includes(valor)) {
              tarjeta.style.display = "block";
              if (!primerVisible) primerVisible = tarjeta;
              tarjeta.classList.add("resaltado");
            } else {
              tarjeta.style.display = "none";
              tarjeta.classList.remove("resaltado");
            }
          });

          if (primerVisible) {
            primerVisible.scrollIntoView({ behavior: "smooth", block: "start" });
            setTimeout(() => primerVisible.classList.remove("resaltado"), 2000);
          } else if (alertSiNoHay && valor.trim() !== "") {
            Swal.fire({
              icon: 'info',
              title: 'No se encontraron productos',
              timer: 2000,
              showConfirmButton: false
            });
          }
        }

        // Filtrado en tiempo real mientras escribe (sin alert)
        inputBusqueda.addEventListener("input", () => filtrarProductos(false));

        // Filtrado al presionar ENTER (con alert si no encuentra)
        inputBusqueda.addEventListener("keypress", e => {
          if (e.key === "Enter") {
            e.preventDefault();
            filtrarProductos(true);
          }
        });

        // Filtrado al hacer click en lupa (con alert si no encuentra)
        if (btnBuscar) {
          btnBuscar.addEventListener("click", e => {
            e.preventDefault();
            filtrarProductos(true);
          });
        }
      }

    } catch (err) {
      console.error("Error cargando productos relacionados:", err);
    }
  }

  cargarProductosRelacionados();
}



// ------------------------------------------------------------
// Función global para agregar al carrito desde los relacionados
// ------------------------------------------------------------
window.agregarCarrito = function(id, nombre, precio, imagen) {
  const carrito = JSON.parse(localStorage.getItem("carrito")) || [];
  const existe = carrito.find(p => p.id === id);
  if (existe) {
    existe.cantidad += 1;
  } else {
    carrito.push({ id, nombre, precio, imagen, cantidad: 1 });
  }
  localStorage.setItem("carrito", JSON.stringify(carrito));
  Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'success',
    title: `${nombre} agregado al carrito ✅`,
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true,
    background: '#4CAF50',
    color: '#fff'
  });
};



});

function showToast(message = "", color = "green", duration = 3000) {
  let toast = document.getElementById("toast-message");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast-message";
    Object.assign(toast.style, {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%) scale(0.8)",
      maxWidth: "90%",
      minWidth: "200px",
      padding: "16px 28px",
      borderRadius: "12px",
      boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
      color: "#fff",
      fontSize: "1.1rem",
      fontWeight: "600",
      textAlign: "center",
      zIndex: "9999",
      display: "none",
      opacity: "0",
      pointerEvents: "none",
      transition: "opacity 0.4s ease, transform 0.4s ease",
    });
    document.body.appendChild(toast);
  }

  // Colores
  switch(color) {
    case "grey":
      toast.style.background = "#555";
      break;
    case "green":
      toast.style.background = "#4CAF50";
      break;
    case "red":
      toast.style.background = "#E53935";
      break;
    default:
      toast.style.background = color;
  }

  // Reset
  toast.style.transition = "none";
  toast.style.opacity = "0";
  toast.style.transform = "translate(-50%, -50%) scale(0.8)";
  toast.style.display = "flex";
  toast.textContent = message;

  // Animación de entrada
  requestAnimationFrame(() => {
    toast.style.transition = "opacity 0.4s ease, transform 0.4s ease";
    toast.style.opacity = "1";
    toast.style.transform = "translate(-50%, -50%) scale(1)";
  });

  // Animación de salida
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translate(-50%, -50%) scale(0.8)";
    setTimeout(() => {
      toast.style.display = "none";
    }, 400);
  }, duration);
}

