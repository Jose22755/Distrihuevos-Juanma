// ../js/pedidos.js
import { auth, db } from "../js/firebase-config.js";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  serverTimestamp,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

// ------------------------------------------------------------
// CONFIGURACIÓN Y VARIABLES
// ------------------------------------------------------------
const pedidosContainer = document.getElementById("tabla-pedidos");
const formPedido = document.getElementById("form-pedido");

const ADMIN_EMAILS = ["admin@gmail.com"]; // 👈 Cambia esto a tus correos de admin
let usuarioActual = null;

// ------------------------------------------------------------
// AUTENTICACIÓN DE USUARIO
// ------------------------------------------------------------
onAuthStateChanged(auth, async (user) => {
  if (user) {
    usuarioActual = user;
    console.log("Usuario autenticado:", user.email);
    cargarPedidos();
  } else {
    window.location.href = "login.html"; // Redirige si no hay sesión
  }
});

// ------------------------------------------------------------
// CARGAR PEDIDOS EN TIEMPO REAL
// ------------------------------------------------------------
function cargarPedidos() {
  let pedidosQuery;
  if (ADMIN_EMAILS.includes(usuarioActual.email)) {
    pedidosQuery = query(collection(db, "orders")); // Todos los pedidos
  } else {
    pedidosQuery = query(
      collection(db, "orders"),
      where("clienteEmail", "==", usuarioActual.email)
    );
  }

  onSnapshot(pedidosQuery, (snapshot) => {
    pedidosContainer.innerHTML = "";
    if (snapshot.empty) {
      pedidosContainer.innerHTML =
        `<tr><td colspan="4" class="vacio">No hay pedidos registrados</td></tr>`;
      return;
    }

    snapshot.forEach((docu) => {
      const pedido = docu.data();
      const fila = document.createElement("tr");

      fila.innerHTML = `
        <td>${pedido.trackingId}</td>
        <td>${pedido.fecha}</td>
        <td>${pedido.cantidadProductos}</td>
        <td>
          <span class="estado ${pedido.estado.toLowerCase()}">${pedido.estado}</span>
        </td>
        ${ADMIN_EMAILS.includes(usuarioActual.email)
          ? `<td>
              <button class="btn-estado" data-id="${docu.id}" data-estado="En camino">🚚 En camino</button>
              <button class="btn-estado" data-id="${docu.id}" data-estado="Entregado">✅ Entregado</button>
            </td>`
          : pedido.estado === "Pendiente"
            ? `<td><button class="btn-cancelar" data-id="${docu.id}">Cancelar</button></td>`
            : `<td>-</td>`}
      `;

      pedidosContainer.appendChild(fila);
    });

    asignarEventos();
  });
}

// ------------------------------------------------------------
// ASIGNAR EVENTOS A LOS BOTONES
// ------------------------------------------------------------
function asignarEventos() {
  // Cancelar pedido
  document.querySelectorAll(".btn-cancelar").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      if (confirm("¿Seguro que deseas cancelar este pedido?")) {
        await updateDoc(doc(db, "orders", id), {
          estado: "Cancelado",
        });
        mostrarToast("Pedido cancelado correctamente", "warning");
      }
    });
  });

  // Cambiar estado (solo admins)
  document.querySelectorAll(".btn-estado").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const nuevoEstado = btn.dataset.estado;
      await updateDoc(doc(db, "orders", id), {
        estado: nuevoEstado,
      });
      mostrarToast(`Pedido actualizado a ${nuevoEstado}`, "success");
    });
  });
}

// ------------------------------------------------------------
// FORMULARIO DE CONFIRMACIÓN DE PEDIDO
// ------------------------------------------------------------
formPedido?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const carrito = JSON.parse(localStorage.getItem("carrito")) || [];
  if (carrito.length === 0) {
    mostrarToast("El carrito está vacío, no puedes finalizar la compra", "error");
    return;
  }

  const direccion = document.getElementById("direccion").value.trim();
  const metodoPago = document.getElementById("metodoPago").value;
  const observaciones = document.getElementById("observaciones").value.trim();

  const cantidadTotal = carrito.reduce((acc, item) => acc + item.cantidad, 0);

  const nuevoPedido = {
    clienteEmail: usuarioActual.email,
    fecha: new Date().toLocaleDateString(),
    cantidadProductos: cantidadTotal,
    estado: "Pendiente",
    direccion,
    metodoPago,
    observaciones,
    trackingId: generarTrackingID(),
    createdAt: serverTimestamp(),
  };

  try {
    await addDoc(collection(db, "orders"), nuevoPedido);
    localStorage.removeItem("carrito");
    mostrarToast("Pedido confirmado exitosamente 🎉", "success");

    // Crea notificación para enviar correo o WhatsApp
    await addDoc(collection(db, "notifications"), {
      tipo: "nuevoPedido",
      destinatario: usuarioActual.email,
      mensaje: `Tu pedido ${nuevoPedido.trackingId} fue confirmado con éxito.`,
      createdAt: serverTimestamp(),
    });

    formPedido.reset();
  } catch (err) {
    console.error("Error al guardar pedido:", err);
    mostrarToast("Error al confirmar el pedido", "error");
  }
});

// ------------------------------------------------------------
// FUNCIONES AUXILIARES
// ------------------------------------------------------------
function generarTrackingID() {
  const num = Math.floor(Math.random() * 90000) + 10000;
  return `PED-${num}`;
}

function mostrarToast(mensaje, tipo = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${tipo}`;
  toast.textContent = mensaje;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("visible");
  }, 10);

  setTimeout(() => {
    toast.classList.remove("visible");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
