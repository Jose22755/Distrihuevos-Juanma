// ../js/pedidos.js
import { auth, db } from "../js/firebase-config.js";
import {
  collection,
  addDoc,
  query,
  where,
  updateDoc,
  doc,
  serverTimestamp,
  onSnapshot,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

// ------------------------------------------------------------
// VARIABLES Y CONFIGURACIÓN
// ------------------------------------------------------------
const pedidosContainer = document.getElementById("bodyPedidos");
const formPedido = document.getElementById("form-pedido");
const mensajeVacio = document.getElementById("mensajeVacio");
const filtroSelect = document.getElementById("filtro");

const ADMIN_EMAILS = ["admin@gmail.com"];
let usuarioActual = null;




// ------------------------------------------------------------
// VERIFICAR AUTENTICACIÓN
// ------------------------------------------------------------
onAuthStateChanged(auth, async (user) => {
  if (user) {
    usuarioActual = user;
    console.log("✅ Usuario autenticado:", user.email);
    cargarPedidos();
  } else {
    window.location.href = "login.html";
  }
});


// ------------------------------------------------------------
// CARGAR PEDIDOS Y APLICAR FILTRO CON DATATABLES
// ------------------------------------------------------------
function cargarPedidos() {
  let pedidosQuery;

  const filtroEstado = filtroSelect?.value || "todos";

  if (ADMIN_EMAILS.includes(usuarioActual.email)) {
    pedidosQuery = query(collection(db, "pedidos"), orderBy("fecha", "desc"));
  } else {
    pedidosQuery = query(
      collection(db, "pedidos"),
      where("usuarioUID", "==", usuarioActual.uid),
      orderBy("fecha", "desc")
    );
  }

  onSnapshot(pedidosQuery, (snapshot) => {

    // 🔥 DESTROY ANTES DE RECONSTRUIR
    if ($.fn.DataTable.isDataTable('#tablaPedidos')) {
      $('#tablaPedidos').DataTable().clear().destroy();
    }

    pedidosContainer.innerHTML = "";

    if (snapshot.empty) {
      mensajeVacio.style.display = "block";
      return;
    } else {
      mensajeVacio.style.display = "none";
    }

    // 🔹 Convertimos y filtramos
    const pedidos = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    const pedidosFiltrados =
      filtroEstado === "todos"
        ? pedidos
        : pedidos.filter(
            (p) => p.estado?.toLowerCase() === filtroEstado.toLowerCase()
          );

    if (pedidosFiltrados.length === 0) {
      mensajeVacio.style.display = "block";
      return;
    }

    // 🔹 Mostrar los pedidos
    pedidosFiltrados.forEach((pedido) => {
      const fechaLegible = pedido.fecha
        ? new Date(pedido.fecha).toLocaleString("es-CO", {
            dateStyle: "short",
            timeStyle: "short",
          })
        : "Sin fecha";

      const fechaISO = pedido.fecha ? new Date(pedido.fecha).toISOString() : "";

      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td>${pedido.codigoPedido || "N/A"}</td>
        <td data-order="${fechaISO}">${fechaLegible}</td>
        <td>${pedido.total?.toLocaleString("es-CO", {
          style: "currency",
          currency: "COP",
        })}</td>
        <td>
          <span class="estado ${pedido.estado?.toLowerCase() || "pendiente"}">
            ${pedido.estado
              ? pedido.estado.charAt(0).toUpperCase() + pedido.estado.slice(1)
              : "Pendiente"}
          </span>
        </td>
        ${
          ADMIN_EMAILS.includes(usuarioActual.email)
            ? `<td>
                <button class="btn-estado" data-id="${pedido.id}" data-estado="entregado">✅ Entregado</button>
              </td>`
            : pedido.estado?.toLowerCase() === "pendiente"
            ? `<td><button class="btn-cancelar" data-id="${pedido.id}">Cancelar</button></td>`
            : `<td>-</td>`
        }
      `;
      pedidosContainer.appendChild(fila);
    });

    // 🔹 Reasignar eventos
    asignarEventos();

    // 🔥 RECREAR DATATABLES CADA VEZ QUE EL SNAPSHOT CAMBIA
    const tablaPedidos = $('#tablaPedidos').DataTable({
      pageLength: 10,
      lengthChange: false,
      searching: true,
      order: [[1, "desc"]],
      language: {
        search: "Buscador:",
        paginate: { next: "Siguiente", previous: "Anterior" },
        info: "Mostrando _START_ a _END_ de _TOTAL_ pedidos",
        emptyTable: "No hay pedidos disponibles"
      }
    });

    // 🔹 Conectar el input externo
    const inputBusqueda = document.getElementById("busqueda");
    inputBusqueda?.addEventListener("input", () => {
      tablaPedidos.search(inputBusqueda.value.trim()).draw();
    });

  });
}




// 🟢 Detectar cambios en el filtro
filtroSelect?.addEventListener("change", () => {
  cargarPedidos();
});



// ------------------------------------------------------------
// FUNCIONES DE EVENTOS
// ------------------------------------------------------------
function asignarEventos() {
  // 🔸 Cancelar pedido
  document.querySelectorAll(".btn-cancelar").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;

      mostrarConfirmacion("¿Deseas cancelar este pedido?", async () => {
        try {
          await updateDoc(doc(db, "pedidos", id), { estado: "cancelado" });
Swal.fire({
  icon: 'warning',
  title: 'Pedido cancelado',
  text: 'El pedido fue cancelado correctamente 🧺',
  confirmButtonColor: '#FFC107'
});
        } catch (err) {
          console.error("❌ Error al cancelar pedido:", err);
Swal.fire({
  icon: 'error',
  title: 'Error',
  text: 'Error al cancelar el pedido',
  confirmButtonColor: '#e53935'
});
        }
      });
    });
  });

  // 🔸 Cambiar estado (solo admins)
  document.querySelectorAll(".btn-estado").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const nuevoEstado = btn.dataset.estado;

      try {
        await updateDoc(doc(db, "pedidos", id), {
          estado: nuevoEstado.toLowerCase(),
        });
Swal.fire({
  icon: 'success',
  title: 'Pedido actualizado',
  text: `Pedido actualizado a "${nuevoEstado}" ✅`,
  confirmButtonColor: '#4CAF50'
});
      } catch (err) {
        console.error("❌ Error al actualizar estado:", err);
Swal.fire({
  icon: 'error',
  title: 'Error',
  text: 'Error al actualizar pedido',
  confirmButtonColor: '#e53935'
});
      }
    });
  });
}

document.getElementById("btnCrearPedido")?.addEventListener("click", () => {
  window.location.href = "productos.html"; // o donde se haga el pedido
});


// ------------------------------------------------------------
// FUNCIONES AUXILIARES
// ------------------------------------------------------------
function generarCodigoPedido() {
  const num = Math.floor(Math.random() * 900) + 100;
  return `PED-${num}`;
}

function mostrarToast(mensaje, tipo = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${tipo}`;
  toast.textContent = mensaje;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add("visible"), 10);
  setTimeout(() => {
    toast.classList.remove("visible");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ------------------------------------------------------------
// CONFIRMACIÓN PERSONALIZADA
// ------------------------------------------------------------
function mostrarConfirmacion(mensaje, callbackConfirmar) {
  const overlay = document.getElementById("confirmacionEliminar");
  const texto = document.getElementById("confirmText");
  const btnConfirmar = document.getElementById("btnConfirmar");
  const btnCancelar = document.getElementById("btnCancelar");

  texto.textContent = mensaje;
  overlay.style.display = "flex";

  const cerrar = () => (overlay.style.display = "none");

  btnConfirmar.onclick = async () => {
    cerrar();
    await callbackConfirmar();
  };

  btnCancelar.onclick = cerrar;
}
// -------------------------------------------------------------
// BUSQUEDA EN TIEMPO REAL
// -------------------------------------------------------------
function filtrarPorTracking(texto) {
  const filas = document.querySelectorAll("#bodyPedidos tr");
  const mensaje = document.getElementById("sinResultados");

  let coincidencias = 0;

  filas.forEach(fila => {
    const tracking = fila.querySelector("td:nth-child(1)")?.textContent.toLowerCase() || "";
    const fecha = fila.querySelector("td:nth-child(2)")?.textContent.toLowerCase() || "";
    const estado = fila.querySelector("td:nth-child(4)")?.textContent.toLowerCase() || "";

    if (
      tracking.includes(texto) ||
      fecha.includes(texto) ||
      estado.includes(texto)
    ) {
      fila.style.display = "";
      coincidencias++;
    } else {
      fila.style.display = "none";
    }
  });

  // Mostrar u ocultar mensaje
  mensaje.style.display = coincidencias === 0 ? "block" : "none";
}






