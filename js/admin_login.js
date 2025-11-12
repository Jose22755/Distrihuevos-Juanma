import { auth, db } from "../js/firebase-config.js";
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";


const menuItems = document.querySelectorAll('.menu li');
const sections = document.querySelectorAll('.section');
const sidebar = document.querySelector('.sidebar');
const toggleBtn = document.querySelector('.toggle-btn');

// Mostrar sección según menú
menuItems.forEach(item => {
  item.addEventListener('click', () => {
    menuItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');

    sections.forEach(sec => sec.classList.remove('active'));
    document.getElementById(item.dataset.section).classList.add('active');
  });
});

// Mostrar la primera sección por defecto
menuItems[0].click();

// Toggle menú lateral
toggleBtn.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
});


// SALUDO AL ADMINISTRADOR
// SALUDO AL ADMINISTRADOR CON ANIMACIÓN
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const saludo = document.getElementById("saludo-admin");

    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        const nombre = data.Nombres || user.displayName || "Administrador";

        const hora = new Date().getHours();
        let mensaje = "Bienvenido";
        if (hora >= 5 && hora < 12) mensaje = "Buenos días";
        else if (hora >= 12 && hora < 19) mensaje = "Buenas tardes";
        else mensaje = "Buenas noches";

        // 🟠 Insertamos el saludo con estilo y clase animada
        saludo.innerHTML = `👋 ${mensaje}, Administrador <strong class="nombre-admin">${nombre}</strong>`;
        saludo.classList.add("saludo-animado");
      } else {
        saludo.innerHTML = `👋 Bienvenido, <strong class="nombre-admin">Administrador</strong>`;
        saludo.classList.add("saludo-animado");
      }
    } catch (error) {
      console.error("Error al cargar el nombre del admin:", error);
      saludo.innerHTML = `👋 Bienvenido, <strong class="nombre-admin">Administrador</strong>`;
      saludo.classList.add("saludo-animado");
    }
  } else {
    window.location.href = "login.html";
  }
});


// Referencia al botón
const logoutBtn = document.getElementById("logoutBtn");


// LOGICA DE CIERRE DE SESION
logoutBtn.addEventListener("click", async () => {
  // Mostramos el diálogo de confirmación
  Swal.fire({
    title: "¿Deseas cerrar sesión?",
    text: "Tu sesión actual se cerrará y volverás al inicio de sesión.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#198754", // verde al estilo de tus botones
    cancelButtonColor: "#dc3545",  // rojo
    confirmButtonText: "Sí, cerrar sesión",
    cancelButtonText: "Cancelar",
    background: "#fff",
    color: "#333",
    customClass: {
      popup: "rounded-4 shadow-lg",
      confirmButton: "fw-semibold",
      cancelButton: "fw-semibold",
    }
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        // Indicador de carga (opcional)
        Swal.fire({
          title: "Cerrando sesión...",
          text: "Por favor espera un momento",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });

        await signOut(auth);

        // Mensaje de éxito
        Swal.fire({
          icon: "success",
          title: "Sesión cerrada correctamente",
          text: "¡Hasta pronto, Administrador!",
          timer: 1800,
          showConfirmButton: false,
          background: "#fff",
          color: "#333",
        });

        setTimeout(() => {
          window.location.href = "login.html";
        }, 1800);
      } catch (error) {
        console.error("Error al cerrar sesión:", error);
        Swal.fire("Error", "No se pudo cerrar sesión. Intenta nuevamente.", "error");
      }
    }
  });
});

const formProducto = document.getElementById("formProducto");
const listaProductos = document.getElementById("listaProductos");

// === AGREGAR PRODUCTO ===
formProducto?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nombre = document.getElementById("nombreProducto").value.trim();
  const precio = parseFloat(document.getElementById("precioProducto").value);
  const stock = parseInt(document.getElementById("stockProducto").value);
  const descripcion = document.getElementById("descripcionProducto").value.trim();
  const imagenURL = document.getElementById("imagenProducto").value.trim() || "images/no-image.png";

  if (!nombre || isNaN(precio) || isNaN(stock)) {
    Swal.fire("Campos incompletos", "Por favor llena todos los campos requeridos.", "warning");
    return;
  }

  try {
    await addDoc(collection(db, "products"), {
      nombre,
      precio,
      stock,
      descripcion,
      imagenURL,
      fechaRegistro: new Date(),
    });

    Swal.fire({
      icon: "success",
      title: "Producto agregado",
      text: `${nombre} fue registrado exitosamente.`,
      timer: 1500,
      showConfirmButton: false
    });

    formProducto.reset();
  } catch (error) {
    console.error("Error al agregar producto:", error);
    Swal.fire("Error", "No se pudo agregar el producto.", "error");
  }
});

// === LISTAR PRODUCTOS EN TIEMPO REAL ===
onSnapshot(collection(db, "products"), (snapshot) => {
  listaProductos.innerHTML = "";

  snapshot.forEach((docu) => {
    const producto = docu.data();

    // --- Definimos color según la categoría ---
    let colorCategoria = "secondary";
    switch ((producto.Categoria || "").toUpperCase()) {
      case "AA":
        colorCategoria = "success";
        break;
      case "A":
        colorCategoria = "primary";
        break;
      case "B":
        colorCategoria = "warning";
        break;
      case "C":
        colorCategoria = "danger";
        break;
    }

    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>
        <img src="${producto.imagen || 'images/no-image.png'}" 
             alt="${producto.Nombre || 'Producto'}" 
             style="width:60px; height:60px; object-fit:cover; border-radius:10px;">
      </td>
      <td>${producto.Nombre || "Sin nombre"}</td>
      <td>
        <span class="badge bg-${colorCategoria} px-3 py-2">${producto.Categoria || "N/A"}</span>
      </td>
      <td>$${(Number(producto.Precio) || 0).toLocaleString("es-CO")}</td>
      <td>${producto.Stock ?? 0}</td>
      <td>${producto.Descripción || "Sin descripción"}</td>
      <td>
        <div class="acciones">
          <button class="btn-editar" data-id="${docu.id}">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn-eliminar" data-id="${docu.id}">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </td>
          `;

    listaProductos.appendChild(fila);
  });

  // === ELIMINAR PRODUCTO ===
  document.querySelectorAll(".eliminar").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const confirm = await Swal.fire({
        title: "¿Eliminar producto?",
        text: "Esta acción no se puede deshacer.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#dc3545",
        cancelButtonColor: "#6c757d"
      });

      if (confirm.isConfirmed) {
        await deleteDoc(doc(db, "products", id));
        Swal.fire("Eliminado", "El producto fue eliminado.", "success");
      }
    });
  });
});

/* VALIDACIONES PARA CADA CAMPO */
formProducto.addEventListener("submit", (e) => {
  e.preventDefault();
  
  let valido = true;

  // Obtener los valores
  const nombre = document.getElementById("nombreProducto").value.trim();
  const precio = document.getElementById("precioProducto").value.trim();
  const stock = document.getElementById("stockProducto").value.trim();
  const categoria = document.getElementById("categoriaProducto").value.trim();
  const imagen = document.getElementById("imagenProducto").value.trim();
  const descripcion = document.getElementById("descripcionProducto").value.trim();

  // Limpiar mensajes previos
  document.querySelectorAll(".error-msg").forEach(el => el.textContent = "");
  document.querySelectorAll(".form-control").forEach(el => el.classList.remove("is-invalid"));

  // Validaciones
  if (nombre === "") {
    mostrarError("nombre", "El nombre del producto es obligatorio");
    valido = false;
  }

  if (precio === "" || parseFloat(precio) <= 0) {
    mostrarError("precio", "Ingresa un precio válido");
    valido = false;
  }

  if (stock === "" || parseInt(stock) < 0) {
    mostrarError("stock", "El stock no puede estar vacío ni negativo");
    valido = false;
  }

  if (categoria === "") {
    mostrarError("categoria", "Debes ingresar una categoría");
    valido = false;
  }

  if (imagen === "" || !imagen.startsWith("http")) {
    mostrarError("imagen", "Ingresa una URL válida para la imagen");
    valido = false;
  }

  if (descripcion === "") {
    mostrarError("descripcion", "La descripción no puede estar vacía");
    valido = false;
  }

  if (!valido) return;

  // Si todo es válido, aquí puedes llamar a tu función para guardar el producto
  console.log("✅ Producto válido. Listo para guardar en Firestore.");
});

function mostrarError(campo, mensaje) {
  const input = document.getElementById(`${campo}Producto`);
  const error = document.getElementById(`error-${campo}`);
  if (input) input.classList.add("is-invalid");
  if (error) error.textContent = mensaje;
}
