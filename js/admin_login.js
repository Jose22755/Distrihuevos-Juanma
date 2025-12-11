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
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

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
  if (Nombre === "") { mostrarError("nombre", "El nombre del producto es obligatorio"); valido = false; }
  if (Precio === "" || parseFloat(Precio) <= 0) { mostrarError("precio", "Ingresa un precio válido"); valido = false; }
  if (Stock === "" || parseInt(Stock) < 0) { mostrarError("stock", "El stock no puede estar vacío ni negativo"); valido = false; }
  if (Categoria === "") { mostrarError("categoria", "Debes ingresar una categoría"); valido = false; }
  if (imagen === "" || !imagen.startsWith("http")) { mostrarError("imagen", "Ingresa una URL válida para la imagen"); valido = false; }
  if (Descripción === "") { mostrarError("descripcion", "La descripción no puede estar vacía"); valido = false; }

  if (!valido) return;

  try {
    const productoRef = doc(db, "products", Nombre);

    // ✅ Solo verificar duplicado si NO estamos editando
    if (!window.productoEditando) {
      const productoSnap = await getDoc(productoRef);
      if (productoSnap.exists()) {
        Swal.fire("Duplicado", "Ya existe un producto con ese nombre.", "warning");
        return;
      }
    }

    // Si estamos editando, usamos el ID del producto que estamos editando
    const idAUsar = window.productoEditando || Nombre;

    await setDoc(doc(db, "products", idAUsar), {
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
      title: window.productoEditando ? "Producto actualizado" : "Producto agregado",
      text: `${Nombre} ${window.productoEditando ? "fue actualizado" : "fue registrado"} exitosamente.`,
      timer: 1500,
      showConfirmButton: false
    });

    formProducto.reset();
    window.productoEditando = null;
    const btnAgregar = document.getElementById("btnAgregarProducto");
    if (btnAgregar) {
      btnAgregar.innerHTML = `<i class="bi bi-plus-circle me-2"></i> Agregar Producto`;
      btnAgregar.classList.remove("modo-edicion");
    }
    const btnCancelar = document.getElementById("btnCancelarEdicion");
    if (btnCancelar) btnCancelar.style.display = "none";

  } catch (error) {
    console.error("Error al agregar o actualizar producto:", error);
    Swal.fire("Error", "No se pudo procesar el producto.", "error");
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

onSnapshot(collection(db, "products"), (snapshot) => {
  const tablaProductos = document.getElementById("tablaProductos");
  tablaProductos.querySelector("tbody").innerHTML = "";

  snapshot.forEach((docu) => {
    const producto = docu.data();

    let colorCategoria = "secondary";
    switch ((producto.Categoria || "").toUpperCase()) {
      case "AA": colorCategoria = "success"; break;
      case "A": colorCategoria = "primary"; break;
      case "B": colorCategoria = "warning"; break;
      case "C": colorCategoria = "danger"; break;
    }

    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td><img src="${producto.imagen || 'images/no-image.png'}" style="width:60px; height:60px; object-fit:cover; border-radius:10px;"></td>
      <td>${producto.Nombre || "Sin nombre"}</td>
      <td><span class="badge bg-${colorCategoria} px-3 py-2">${producto.Categoria || "N/A"}</span></td>
      <td>$${(Number(producto.Precio) || 0).toLocaleString("es-CO")}</td>
      <td>${producto.Stock ?? 0}</td>
      <td>${producto.Descripción || "Sin descripción"}</td>
      <td>
        <div class="acciones">
          <button class="btn-editar" data-id="${docu.id}"><i class="bi bi-pencil"></i></button>
          <button class="btn-eliminar" data-id="${docu.id}"><i class="bi bi-trash"></i></button>
        </div>
      </td>
    `;
    tablaProductos.querySelector("tbody").appendChild(fila);
  });
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


// ==========================================
// 🔍 BUSCADOR UNIVERSAL SEGÚN SECCIÓN VISIBLE
// ==========================================
const buscador = document.getElementById("buscadorProductos");

if (buscador) {
  buscador.addEventListener("input", () => {

    const q = buscador.value
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const seccionActiva = document.querySelector(".section.active")?.id;

    // ============================
    // 🔍 PEDIDOS
    // ============================
    if (seccionActiva === "pedidos") {
      const filas = document.querySelectorAll("#listaPedidos tr");

      filas.forEach(fila => {
        const texto = fila.innerText
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");

        fila.style.display = texto.includes(q) ? "" : "none";
      });
    }

    // ============================
    // 🔍 PRODUCTOS
    // ============================
    else if (seccionActiva === "productos") {
      const filas = document.querySelectorAll("#listaProductos tr");

      filas.forEach(fila => {
        const contenido = fila.innerText
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");

        fila.style.display = contenido.includes(q) ? "" : "none";
      });
    }

    // ============================
    // 🔍 CLIENTES
    // ============================
    else if (seccionActiva === "clientes") {
      const filas = document.querySelectorAll("#listaClientes tr");

      filas.forEach(fila => {
        const contenido = fila.innerText
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");

        fila.style.display = contenido.includes(q) ? "" : "none";
      });
    }

    // ============================
    // 🔍 VENTAS (TABLA HISTÓRICA)
    // ============================
    else if (seccionActiva === "ventas") {
      const filas = document.querySelectorAll("#historialVentasTabla tbody tr");

      filas.forEach(fila => {
        const texto = fila.innerText
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");

        fila.style.display = texto.includes(q) ? "" : "none";
      });
    }

  });
}



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


async function obtenerNombreCompleto(uid) {
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);

    if(!snap.exists()) return null;

    const d = snap.data();

    return d.Nombres + " " + d.Apellidos;
    
  } catch(err){
    console.error("error obteniendo nombre:", err);
    return null;
  }
}


// ===============================
// 📌 Cargar pedidos en tiempo REAL
// ===============================
function cargarPedidos() {
  const pedidosRef = collection(db, "pedidos");

  onSnapshot(pedidosRef, async (snap) => {

  const pedidosPromises = snap.docs.map(async (docu) => {
    const data = docu.data();
    let nombreCompleto = "";

    if (data.usuarioUID) {
      nombreCompleto = await obtenerNombreCompleto(data.usuarioUID);
    }

    return {
      id: docu.id,
      ...data,
      nombreUsuario: (nombreCompleto ?? "").replace("undefined","").trim() || "Sin nombre",
    };
  });

    const pedidos = await Promise.all(pedidosPromises);


    mostrarPedidos(pedidos); // 🔥 ACTUALIZA LA TABLA AUTOMÁTICAMENTE
  });
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
        <td>$${Number(pedido.total || 0).toLocaleString("es-CO")}</td>
        <td>
          ${pedido.comprobanteURL 
              ? `<button class="btn btn-sm btn-primary btn-verComprobante" data-url="${pedido.comprobanteURL}">Ver comprobante</button>` 
              : "Sin comprobante"}
        </td>
        <td class="detalles-col">
          <button class="btn-verDetalle" data-id="${pedido.id}">
            Ver detalles
          </button>
        </td>
      `;

      listaPedidos.appendChild(tr);

      // Modal comprobante
const modalComprobante = new bootstrap.Modal(document.getElementById("modalComprobante"));
const imagenComprobante = document.getElementById("imagenComprobante");
// Inicializar modal

// Forzar que la X cierre el modal
document.querySelector("#modalComprobante .btn-close").addEventListener("click", () => {
  modalComprobante.hide();
});


tr.querySelectorAll(".btn-verComprobante").forEach(btn => {
  btn.addEventListener("click", () => {
    const url = btn.dataset.url;
    if(url){
      imagenComprobante.src = url;
      modalComprobante.show();
    }
  });
});

      const selectEstado = tr.querySelector(".estadoPedido");

      // Aplicar color inicial
      aplicarColorEstado(selectEstado, pedido.estado);

      // Cambiar estado
// Cambiar estado
selectEstado.addEventListener("change", async (e) => {
  const nuevoEstado = e.target.value;

  try {

    let updateData = { estado: nuevoEstado };

    // 🟢 Si se entrega → actualizar fecha a HOY para que cuente en ventas
    if (nuevoEstado === "entregado") {
      updateData.fecha = new Date().toISOString();
    }

    // 🟡 Si se cancela → no toca la fecha, así NO suma en ventas
    if (nuevoEstado === "cancelado") {
      // no cambiar fecha
    }

    await updateDoc(doc(db, "pedidos", pedido.id), updateData);

    aplicarColorEstado(selectEstado, nuevoEstado);

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
        <div class="detalle-producto" style="text-align:center; margin-bottom:5px;">
          <span><strong>${item.nombre}</strong></span><br>
          <span>Cantidad: ${item.cantidad}</span><br>
          <span>Precio: $${Number(item.precio || 0).toLocaleString("es-CO")}</span>
        </div>
      `).join("")
    : "<p>No hay productos registrados.</p>";

  detallePedidoContent.innerHTML = `
    <div style="text-align:center; color:#000;">
      <p><strong>Código:</strong> ${pedido.codigoPedido || "Sin código"}</p>
      <p><strong>Usuario:</strong> ${pedido.nombreUsuario || pedido.usuario || "Desconocido"}</p>
      <p><strong>Fecha:</strong> ${pedido.fecha}</p>
      <p><strong>Estado:</strong> ${pedido.estado}</p>
      <p><strong>Método de Pago:</strong> ${pedido.metodoPago || "No registrado"}</p>
      <p><strong>Comprobante:</strong></p>
      ${pedido.comprobanteURL 
          ? `<img src="${pedido.comprobanteURL}" style="width:120px; border-radius:5px;">` 
          : "<span>Sin comprobante</span>"}

      <h5 class="titulo-productos mt-3 mb-2">Productos</h5>
      ${productosHTML}

      <p class="detalle-total">
        <span class="total-label"><strong>Total:</strong></span><br>
        <span class="total-valor">$${Number(pedido.total || 0).toLocaleString("es-CO")}</span>
      </p>
    </div>
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

// ==========================================
// 📌 Gestión de Clientes
// ==========================================
const listaClientes = document.getElementById("listaClientes");
const formCliente = document.getElementById("formCliente");
const btnAgregarCliente = document.getElementById("btnAgregarCliente");
const btnCancelarCliente = document.getElementById("btnCancelarEdicionCliente");
let clienteEditando = null; // variable global para saber si estamos editando

// === Cargar clientes desde Firebase ===
async function cargarClientes() {
  listaClientes.innerHTML = ""; // limpiar tabla

  try {
    const clientesSnapshot = await getDocs(collection(db, "users"));
    clientesSnapshot.forEach(doc => {
      const cliente = doc.data();
      const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${(cliente.Nombres || "") + " " + (cliente.Apellidos || "")}</td>
      <td>${cliente["Correo Electronico"] || "-"}</td>
      <td>${cliente.Telefono || "-"}</td>
      <td>${cliente.Direccion || "-"}</td>
<td>${cliente.rol || "usuario"}</td>
      <td>${cliente.fecha_registro ? new Date(cliente.fecha_registro.seconds * 1000).toLocaleString() : "-"}</td>
      <td class="text-center">
        <button class="btn-editar btn btn-sm btn-primary" data-id="${doc.id}">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn-eliminar btn btn-sm btn-danger" data-id="${doc.id}">
          <i class="bi bi-trash"></i>
        </button>
      </td>
      <td class="detalles-col">
        <button class="btn-verDetalle" data-id="${doc.id}">
          Ver detalles
        </button>
      </td>
    `;
      listaClientes.appendChild(tr);
    });



    const buscador = document.getElementById("buscadorProductos");


    // Lógica para ver detalles
    document.querySelectorAll(".btn-verDetalle").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const docRef = doc(db, "users", id);
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          Swal.fire("Error", "Cliente no encontrado.", "error");
          return;
        }
        const c = snap.data();
        const modalTitle = document.getElementById("modalTitle");
        if(modalTitle) modalTitle.textContent = "Detalles del cliente";

detallePedidoContent.innerHTML = `
  <div style="text-align:center; color:#000;">
    <p><strong>Nombre:</strong> ${(c.Nombres || "") + " " + (c.Apellidos || "")}</p>
    <p><strong>Correo:</strong> ${c["Correo Electronico"] || "-"}</p>
    <p><strong>Teléfono:</strong> ${c.Telefono || "-"}</p>
    <p><strong>Dirección:</strong> ${c.Direccion || "-"}</p>
<p><strong>Rol:</strong> ${c.rol || "usuario"}</p>
    <p><strong>Fecha de Registro:</strong> ${c.fecha_registro ? new Date(c.fecha_registro.seconds * 1000).toLocaleString() : "-"}</p>
  </div>
`;

        detalleModal.show();
      });
    });

  } catch (error) {
    console.error("Error cargando clientes:", error);
  }
}

// ===============================
// Listener para botón "Nuevo Cliente"
document.getElementById("btnNuevoCliente").addEventListener("click", () => {
  // ... tu lógica para mostrar el formulario
});

// ===============================
// FILTRO POR ROL
const filtroRol = document.getElementById("filtroRol");

filtroRol.addEventListener("change", () => {
  const valor = filtroRol.value.toLowerCase();
  const filas = listaClientes.querySelectorAll("tr");

  filas.forEach(tr => {
    const rol = tr.querySelector("td:nth-child(5)").textContent.toLowerCase(); // columna Rol ahora es la 6
    if (valor === "todos" || rol === valor) {
      tr.style.display = ""; // mostrar fila
    } else {
      tr.style.display = "none"; // ocultar fila
    }
  });
});


// === Mostrar formulario y llenar datos al editar ===
listaClientes.addEventListener("click", async (e) => {
  const btn = e.target.closest(".btn-editar, .btn-eliminar");
  if (!btn) return;
  const id = btn.dataset.id;
  if (!id) return;

  // EDITAR
  if (btn.classList.contains("btn-editar")) {
    try {
      const docRef = doc(db, "users", id);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        Swal.fire("Error", "Cliente no encontrado.", "error");
        return;
      }
      const c = snap.data();

      // Mostrar formulario
      formCliente.style.display = "block";
      formCliente.scrollIntoView({ behavior: "smooth", block: "start" });

      // Llenar inputs
      document.getElementById("nombreCliente").value = c.Nombres || "";
      document.getElementById("apellidoCliente").value = c.Apellidos || "";
      document.getElementById("correoCliente").value = c["Correo Electronico"] || "";
      document.getElementById("telefonoCliente").value = c.Telefono || "";
      document.getElementById("direccionCliente").value = c.Direccion || "";
      document.getElementById("rolCliente").value = c.rol || "cliente";

      // Cambiar botón principal a actualizar
      btnAgregarCliente.textContent = "Actualizar Cliente";
      btnAgregarCliente.classList.add("modo-edicion");

      // Mostrar botón de cancelar
      btnCancelarCliente.style.display = "inline-block";

      // Marcar que estamos editando
      clienteEditando = id;

    } catch (err) {
      console.error("Error cargando cliente para editar:", err);
      Swal.fire("Error", "No se pudo cargar el cliente.", "error");
    }
  }

  // ELIMINAR
  if (btn.classList.contains("btn-eliminar")) {
    const confirm = await Swal.fire({
      title: "¿Eliminar cliente?",
      text: "Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc3545",
      cancelButtonColor: "#6c757d"
    });

    if (confirm.isConfirmed) {
      try {
        await deleteDoc(doc(db, "users", id));
        Swal.fire("Eliminado", "El cliente fue eliminado.", "success");
        cargarClientes();
      } catch (err) {
        console.error("Error eliminando cliente:", err);
        Swal.fire("Error", "No se pudo eliminar el cliente.", "error");
      }
    }
  }
});

// === Cancelar edición ===
btnCancelarCliente.addEventListener("click", () => {
  formCliente.reset();
  formCliente.style.display = "none";
  clienteEditando = null;
  btnAgregarCliente.textContent = "Agregar Cliente";
  btnAgregarCliente.classList.remove("modo-edicion");
  btnCancelarCliente.style.display = "none";
});

// === Agregar / Actualizar cliente ===
const passwordInput = document.getElementById("passwordCliente");
const passwordHelp = document.getElementById("passwordHelp");
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;

// Listeners fuera del submit
passwordInput.addEventListener("focus", () => {
  passwordHelp.style.display = "block";
});

// Listener en tiempo real
passwordInput.addEventListener("input", () => {
  if(passwordRegex.test(passwordInput.value)){
    passwordHelp.style.color = "green";
    passwordHelp.textContent = "Contraseña válida ✔";
  } else {
    passwordHelp.style.color = "red";
    passwordHelp.textContent = "Contraseña: mínimo 8 caracteres, mayúscula, minúscula, número y símbolo (!@#$%^&*)";
  }
});

formCliente.addEventListener("submit", async (e) => {
  e.preventDefault();

  const Nombres = document.getElementById("nombreCliente").value.trim();
  const Apellidos = document.getElementById("apellidoCliente").value.trim();
  const Correo = document.getElementById("correoCliente").value.trim();
  const Telefono = document.getElementById("telefonoCliente").value.trim();
  const Direccion = document.getElementById("direccionCliente").value.trim();
  const Rol = document.getElementById("rolCliente").value;
  const Password = passwordInput.value.trim();

  // Validaciones básicas
  if (!Nombres || !Apellidos || !Correo || (!clienteEditando && !Password)) {
    Swal.fire("Error", "Nombres, Apellidos, Correo y Contraseña son obligatorios", "warning");
    return;
  }

  // Validación de contraseña si hay
  if (Password && !passwordRegex.test(Password)) {
    Swal.fire("Error", "Contraseña: mínimo 8 caracteres, mayúscula, minúscula, número y símbolo (!@#$%^&*)", "warning");
    return;
  }

  // Todo OK, ocultamos mensaje de ayuda
  passwordHelp.style.display = "none";

try {
  let idAUsar = clienteEditando || Correo;

  // Datos a guardar en Firestore
  const clienteData = {
    Nombres,
    Apellidos,
    "Correo Electronico": Correo,
    Telefono,
    Direccion,
    rol: Rol,
    fecha_registro: new Date()
  };

  if (!clienteEditando) {
    // ============================
    // CREAR USUARIO EN AUTH (nuevo cliente)
    // ============================
    const userCredential = await createUserWithEmailAndPassword(auth, Correo, Password);
    const user = userCredential.user;
    idAUsar = user.uid; // usar UID generado por Auth
  }

  // Guardar/actualizar en Firestore
  await setDoc(doc(db, "users", idAUsar), clienteData);

  Swal.fire({
    icon: "success",
    title: clienteEditando ? "Cliente actualizado" : "Cliente agregado",
    timer: 1500,
    showConfirmButton: false
  });

  formCliente.reset();
  formCliente.style.display = "none";
  clienteEditando = null;
  btnAgregarCliente.textContent = "Agregar Cliente";
  btnAgregarCliente.classList.remove("modo-edicion");
  btnCancelarCliente.style.display = "none";

  cargarClientes();

} catch (err) {
  console.error("Error agregando/actualizando cliente:", err);
  Swal.fire("Error", err.message || "No se pudo guardar el cliente", "error");
}
});


const togglePass = document.querySelector(".toggle-pass");

togglePass.addEventListener("click", () => {
  const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
  passwordInput.setAttribute("type", type);
});


// === Inicializar ===
cargarClientes();

// ===============================
// Listener para botón "Nuevo Cliente"
// ===============================
document.getElementById("btnNuevoCliente").addEventListener("click", () => {
  document.getElementById("formCliente").style.display = "block";
  document.getElementById("btnCancelarEdicionCliente").style.display = "none";
  btnAgregarCliente.textContent = "Agregar Cliente";

  // Limpiar campos
  document.getElementById("nombreCliente").value = "";
  document.getElementById("apellidoCliente").value = "";
  document.getElementById("correoCliente").value = "";
  document.getElementById("telefonoCliente").value = "";
  document.getElementById("direccionCliente").value = "";
  document.getElementById("rolCliente").value = "usuario"; // valor interno correcto
  document.getElementById("passwordCliente").value = ""; // limpiar contraseña
});






