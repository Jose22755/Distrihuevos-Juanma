import { auth, db } from "../js/firebase-config.js";
import {
  collection,
  query,
  where,
  updateDoc,
  doc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

const ADMIN_EMAILS = ["admin@gmail.com"];
let usuarioActual = null;

// Esperar que todo el DOM esté cargado
window.addEventListener("DOMContentLoaded", () => {
  const pedidosContainer = document.getElementById("bodyPedidos");
  const mensajeVacio = document.getElementById("mensajeVacio");

  if (!pedidosContainer) {
    console.error("❌ No se encontró el tbody con id='bodyPedidos'");
    return;
  }

  if (!mensajeVacio) {
    console.error("❌ No se encontró el div con id='mensajeVacio'");
    return;
  }

  // Escuchar autenticación
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    usuarioActual = user;
    console.log("✅ Usuario autenticado:", user.email);
    cargarPedidos(pedidosContainer, mensajeVacio);
  });
});

function cargarPedidos(pedidosContainer, mensajeVacio) {
  let pedidosQuery;

  // Si es admin ve todos los pedidos
  if (ADMIN_EMAILS.includes(usuarioActual.email)) {
    pedidosQuery = query(collection(db, "pedidos"));
  } else {
    pedidosQuery = query(
      collection(db, "pedidos"),
      where("usuario", "==", usuarioActual.uid)
    );
  }

  // Escucha en tiempo real
  onSnapshot(pedidosQuery, (snapshot) => {
    // Limpiar tabla
    pedidosContainer.innerHTML = "";

    if (snapshot.empty) {
      mensajeVacio.style.display = "block";
      pedidosContainer.innerHTML = `
        <tr>
          <td colspan="5" class="text-center">No hay pedidos registrados 🥚</td>
        </tr>`;
      return;
    }

    mensajeVacio.style.display = "none";

    snapshot.forEach((docu) => {
      const pedido = docu.data();
      const fila = document.createElement("tr");

      fila.innerHTML = `
        <td>${pedido.trackingId || "-"}</td>
        <td>${pedido.fecha || "-"}</td>
        <td>${pedido.cantidadProductos || 0}</td>
        <td>
          <span class="estado ${pedido.estado?.toLowerCase() || "pendiente"}">
            ${pedido.estado || "Pendiente"}
          </span>
        </td>
        <td>
          ${
            ADMIN_EMAILS.includes(usuarioActual.email)
              ? `
                <button class="btn-estado" data-id="${docu.id}" data-estado="En camino">🚚 En camino</button>
                <button class="btn-estado" data-id="${docu.id}" data-estado="Entregado">✅ Entregado</button>
              `
              : pedido.estado === "Pendiente"
              ? `<button class="btn-cancelar" data-id="${docu.id}">Cancelar</button>`
              : `<span>-</span>`
          }
        </td>
      `;

      pedidosContainer.appendChild(fila);
    });

    asignarEventos();
  });
}

// ------------------------------------------------------------
// BOTONES DE ACCIÓN
// ------------------------------------------------------------
function asignarEventos() {
  document.querySelectorAll(".btn-cancelar").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      if (confirm("¿Seguro que deseas cancelar este pedido?")) {
        await updateDoc(doc(db, "pedidos", id), { estado: "Cancelado" });
        mostrarToast("Pedido cancelado correctamente 🥚", "warning");
      }
    });
  });

  document.querySelectorAll(".btn-estado").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const nuevoEstado = btn.dataset.estado;
      await updateDoc(doc(db, "pedidos", id), { estado: nuevoEstado });
      mostrarToast(`Pedido actualizado a ${nuevoEstado}`, "success");
    });
  });
}

// ------------------------------------------------------------
// TOAST (notificación flotante)
// ------------------------------------------------------------
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
