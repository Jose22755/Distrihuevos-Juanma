import { auth, db } from "../js/firebase-config.js";
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc
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

// === AGREGAR PRODUCTO (CON VALIDACIONES) ===
formProducto?.addEventListener("submit", async (e) => {
  e.preventDefault();

  let valido = true;

  const Nombre = document.getElementById("nombreProducto").value.trim();
  const Precio = document.getElementById("precioProducto").value.trim();
  const Stock = document.getElementById("stockProducto").value.trim();
  const Categoria = document.getElementById("categoriaProducto").value.trim();
  const imagen = document.getElementById("imagenProducto").value.trim();
  const Descripción = document.getElementById("descripcionProducto").value.trim();

  // Limpiar mensajes previos
  document.querySelectorAll(".error-msg").forEach(el => el.textContent = "");
  document.querySelectorAll(".form-control").forEach(el => el.classList.remove("is-invalid"));

  // Validaciones
  if (Nombre === "") {
    mostrarError("nombre", "El nombre del producto es obligatorio");
    valido = false;
  }
  if (Precio === "" || parseFloat(Precio) <= 0) {
    mostrarError("precio", "Ingresa un precio válido");
    valido = false;
  }
  if (Stock === "" || parseInt(Stock) < 0) {
    mostrarError("stock", "El stock no puede estar vacío ni negativo");
    valido = false;
  }
  if (Categoria === "") {
    mostrarError("categoria", "Debes ingresar una categoría");
    valido = false;
  }
  if (imagen === "" || !imagen.startsWith("http")) {
    mostrarError("imagen", "Ingresa una URL válida para la imagen");
    valido = false;
  }
  if (Descripción === "") {
    mostrarError("descripcion", "La descripción no puede estar vacía");
    valido = false;
  }

  if (!valido) return;

  try {
  // Referencia al documento con el nombre del producto como ID
    const productoRef = doc(db, "products", Nombre);

    // Verificar si ya existe un documento con ese nombre
    const productoSnap = await getDoc(productoRef);
    if (productoSnap.exists()) {
      Swal.fire("Duplicado", "Ya existe un producto con ese nombre.", "warning");
      return;
    }

    // Crear el documento usando el nombre como ID
    await setDoc(productoRef, {
      Categoria,
      Descripción,
      Nombre,
      Precio: parseFloat(Precio),
      Stock: parseInt(Stock),
      imagen,
      fecha_registro: new Date()
    });

    Swal.fire({
      icon: "success",
      title: "Producto agregado",
      text: `${Nombre} fue registrado exitosamente.`,
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

  // === EVENTOS DE EDITAR ===
// Listener robusto por delegación: captura clicks en los botones de editar dentro de la tabla
const productosListContainer = document.getElementById("listaProductos");

productosListContainer.addEventListener("click", async (event) => {
  const btn = event.target.closest(".btn-editar, .editar");
  if (!btn) return; // si no es un botón editar, salir

  const id = btn.dataset.id;
  if (!id) {
    console.error("Botón editar sin data-id");
    return;
  }

  try {
    const ref = doc(db, "products", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      Swal.fire("Error", "Producto no encontrado.", "error");
      return;
    }

    const data = snap.data();

    // Rellenar formulario (usa tus ids de inputs)
    document.getElementById("nombreProducto").value = data.Nombre || "";
    document.getElementById("precioProducto").value = data.Precio ?? "";
    document.getElementById("stockProducto").value = data.Stock ?? "";
    document.getElementById("categoriaProducto").value = data.Categoria || "";
    document.getElementById("imagenProducto").value = data.imagen || "";
    document.getElementById("descripcionProducto").value = data.Descripción || "";

    // Marcar que estamos editando este producto
    window.productoEditando = id;

    // Cambiar el botón a modo edición
    const btnAgregar = document.getElementById("btnAgregarProducto");
    if (btnAgregar) {
      btnAgregar.innerHTML = `<i class="bi bi-pencil-square me-2"></i> Actualizar Producto`;
      btnAgregar.classList.add("modo-edicion");
      btnCancelar.style.display = "inline-block"; // mostrar botón de cancelar
    }

    // Asegurar que la sección del formulario esté activa (tu sección tiene id="productos")
    document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
    const seccionProductos = document.getElementById("productos");
    if (seccionProductos) seccionProductos.classList.add("active");

    // Actualizar menú lateral (si lo usas)
    document.querySelectorAll('.menu li').forEach(li => li.classList.remove('active'));
    const menuItem = document.querySelector('[data-section="productos"]');
    if (menuItem) menuItem.classList.add('active');

    // Scroll suave al formulario y enfoque en el primer campo
    const form = document.getElementById("formProducto");
    if (form) {
      form.scrollIntoView({ behavior: "smooth", block: "start" });
      // pequeños delay para que el scroll termine antes de focus (opcional)
      setTimeout(() => {
        const firstInput = document.getElementById("nombreProducto");
        if (firstInput) firstInput.focus();
      }, 450);
    }
  } catch (err) {
    console.error("Error al cargar producto para editar:", err);
    Swal.fire("Error", "No se pudo cargar el producto para editar.", "error");
  }
});


// Botón cancelar edición
const btnAgregar = document.getElementById("btnAgregarProducto");
const btnCancelar = document.getElementById("btnCancelarEdicion");

if (btnCancelar) {
  btnCancelar.addEventListener("click", () => {
    // Limpiar el formulario
    formProducto.reset();
    window.productoEditando = null;

    // Volver el botón principal al modo "Agregar"
    btnAgregar.innerHTML = `<i class="bi bi-plus-circle me-2"></i> Agregar Producto`;
    btnAgregar.classList.remove("modo-edicion");

    // Ocultar el botón de cancelar
    btnCancelar.style.display = "none";

    // Mensaje opcional
    Swal.fire({
      icon: "info",
      title: "Edición cancelada",
      text: "Puedes agregar un nuevo producto ahora.",
      timer: 1500,
      showConfirmButton: false
    });
  });
}


  // === EVENTOS DE ELIMINAR ===
  document.querySelectorAll(".btn-eliminar").forEach((btn) => {
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


// ------------------------------------------------------------
// 🔍 BUSCADOR DE PRODUCTOS EN TIEMPO REAL
// ------------------------------------------------------------

// Esperar que el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  const buscador = document.getElementById("buscadorProductos");
  const tabla = document.getElementById("tablaProductos");
  const filas = tabla?.getElementsByTagName("tr");

  if (buscador && filas) {
    buscador.addEventListener("input", (e) => {
      const texto = e.target.value.toLowerCase().trim();

      // Recorremos todas las filas de la tabla (excepto el encabezado)
      for (let i = 1; i < filas.length; i++) {
        const fila = filas[i];
        const columnas = fila.getElementsByTagName("td");
        let coincide = false;

        // Revisamos si alguna celda contiene el texto del buscador
        for (let j = 0; j < columnas.length; j++) {
          const celdaTexto = columnas[j].innerText.toLowerCase();
          if (celdaTexto.includes(texto)) {
            coincide = true;
            break;
          }
        }

        // Mostrar u ocultar la fila según coincidencia
        fila.style.display = coincide ? "" : "none";
      }
    });
  }
});


function mostrarError(campo, mensaje) {
  const input = document.getElementById(`${campo}Producto`);
  const error = document.getElementById(`error-${campo}`);
  if (input) input.classList.add("is-invalid");
  if (error) error.textContent = mensaje;
}


/* Logica para la gestion de PRODUCTOS */
const listaPedidos = document.getElementById("listaPedidos");
const filtroEstado = document.getElementById("filtroEstado");
const detalleModal = new bootstrap.Modal(document.getElementById("modalDetallePedido"));
window.detalleModal = detalleModal;
const detallePedidoContent = document.getElementById("detallePedidoContent");

// ===============================
// 📌 Cargar pedidos
// ===============================
async function cargarPedidos() {
  const snap = await getDocs(collection(db, "pedidos"));
  const pedidos = [];

  for (const docu of snap.docs) {
    const data = docu.data();

    let nombreCompleto = data.usuario; // primero usar lo que ya existe
    if (!nombreCompleto && data.usuarioUID) {
      nombreCompleto = await obtenerNombreCompleto(data.usuarioUID);
    }
    if (!nombreCompleto) nombreCompleto = "Nombre no disponible";

    pedidos.push({
      id: docu.id,
      ...data,
      nombreUsuario: nombreCompleto
    });
  }

  mostrarPedidos(pedidos);
}


// ===============================
// 📌 Función para aplicar colores al select
// ===============================
function aplicarColorEstado(select, estado) {
  select.classList.remove(
    "estado-pendiente",
    "estado-entregado",
    "estado-cancelado"
  );

  if (estado === "pendiente") select.classList.add("estado-pendiente");
  if (estado === "entregado") select.classList.add("estado-entregado");
  if (estado === "cancelado") select.classList.add("estado-cancelado");
}

// ===============================
// 📌 Mostrar pedidos en tabla
// ===============================
function mostrarPedidos(pedidos) {
  listaPedidos.innerHTML = "";
  const estadoFiltro = filtroEstado.value;

  pedidos
    .filter(p => estadoFiltro === "todos" || p.estado === estadoFiltro)
    .sort((a, b) => b.pedidoNumero - a.pedidoNumero)
    .forEach(pedido => {

      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${pedido.codigoPedido}</td>
        <td>${pedido.nombreUsuario}</td>
        <td>${pedido.fecha}</td>
        <td>
          <select class="form-select form-select-sm estadoPedido">
            <option value="pendiente" ${pedido.estado === "pendiente" ? "selected" : ""}>Pendiente</option>
            <option value="entregado" ${pedido.estado === "entregado" ? "selected" : ""}>Entregado</option>
            <option value="cancelado" ${pedido.estado === "cancelado" ? "selected" : ""}>Cancelado</option>
          </select>
        </td>
        <td>$${pedido.total}</td>
        <td class="detalles-col">
          <button class="btn-verDetalle" data-id="${pedido.id}">
            Ver detalles
          </button>
        </td>
      `;

      listaPedidos.appendChild(tr);

      const selectEstado = tr.querySelector(".estadoPedido");

      // Aplicar color inicial
      aplicarColorEstado(selectEstado, pedido.estado);

      // Cambiar estado
      selectEstado.addEventListener("change", async (e) => {
        const nuevoEstado = e.target.value;

        try {
          await updateDoc(doc(db, "pedidos", pedido.id), { estado: nuevoEstado });

          aplicarColorEstado(selectEstado, nuevoEstado); // Actualizar color

          // Toast igual al de productos
          Swal.fire({
            toast: true,
            position: "top-end",
            icon: "success",
            title: "Estado actualizado",
            text: `Nuevo estado: ${nuevoEstado}`,
            showConfirmButton: false,
            timer: 1400,
          });

        } catch (err) {
          Swal.fire({
            toast: true,
            position: "top-end",
            icon: "error",
            title: "Error",
            text: "No se pudo actualizar el estado",
            showConfirmButton: false,
            timer: 1500
          });
        }
      });

      // Ver detalles
      tr.querySelector(".btn-verDetalle").addEventListener("click", () => {
        mostrarDetallePedido(pedido);
      });
    });
}

// ===============================
// 📌 Modal detalles
// ===============================
function mostrarDetallePedido(pedido) {
  const productosHTML = pedido.items?.length
  
    ? pedido.items.map(item => `
        <div class="detalle-producto">
          <span><strong>${item.nombre}</strong></span>
          <span>Cantidad: ${item.cantidad}</span>
          <span>Precio: $${Number(item.precio || 0).toLocaleString("es-CO")}</span>
        </div>
      `).join("")
    : "<p>No hay productos registrados.</p>";

  detallePedidoContent.innerHTML = `
    <p><strong>Código:</strong> ${pedido.codigoPedido || "Sin código"}</p>
    <p><strong>Usuario:</strong> ${pedido.nombreUsuario || pedido.usuario || "Desconocido"}</p>
    <p><strong>Fecha:</strong> ${pedido.fecha}</p>
    <p><strong>Estado:</strong> ${pedido.estado}</p>
    <p><strong>Método de Pago:</strong> ${pedido.metodoPago || "No registrado"}</p>
    <p><strong>Referencia Pago:</strong> ${pedido.referenciaPago || "---"}</p>

    <h5 class="titulo-productos mt-3 mb-2">Productos</h5>
    ${productosHTML}

    <p class="detalle-total">
      <span class="total-label">Total:</span>
      <span class="total-valor">$${Number(pedido.total || 0).toLocaleString("es-CO")}</span>
    </p>
  `;

  detalleModal.show();
}


// ===============================
// 📌 Filtro
// ===============================
filtroEstado.addEventListener("change", cargarPedidos);

// ===============================
// 📌 Inicio
// ===============================
cargarPedidos();
