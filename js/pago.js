import { auth, db } from "../js/firebase-config.js";
import { doc, setDoc, getDoc, collection, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js";

// ---------------------------------------------------------
// REFERENCIAS HTML
// ---------------------------------------------------------
const paymentContainer = document.getElementById("paymentContainer");
const closePayment = document.getElementById("closePayment");
const paymentMethodContainer = document.getElementById("paymentMethod");
const paymentSubtotal = document.getElementById("paymentSubtotal");
const paymentImpuesto = document.getElementById("paymentImpuesto");
const paymentTotal = document.getElementById("paymentTotal");
const confirmPayment = document.getElementById("confirmPayment");
const radiosPago = document.querySelectorAll('input[name="pago"]');
const btnVerDetalles = document.getElementById("btnVerDetalles");

// ---------------------------------------------------------
// VARIABLES
// ---------------------------------------------------------
let metodoPagoValidado = false;
let carrito = [];
let usuarioActual = null;
let subtotal = 0;
let impuesto = 0;
let total = 0;




// ---------------------------------------------------------
// QR REALES (por ahora siguen siendo imágenes)
// ---------------------------------------------------------
const qrURLs = {
  nequi: "../html/images/nequiQR.png",
  bancolombia: "../html/images/BancolombiaQR.png"
};

// ---------------------------------------------------------
// DETECTAR USUARIO
// ---------------------------------------------------------
onAuthStateChanged(auth, async (user) => {
  if (user) {
    usuarioActual = user.uid;
    await cargarCarrito();
    actualizarTotales();
    mostrarMetodoPagoSeleccionado();
  } else {
    usuarioActual = null;
    carrito = [];
  }
});

// ---------------------------------------------------------
// Cargar carrito desde Firestore
// ---------------------------------------------------------
async function cargarCarrito() {
  if (!usuarioActual) return;
  const carritoDoc = doc(db, "carritos", usuarioActual);
  const carritoSnap = await getDoc(carritoDoc);
  carrito = carritoSnap.exists() ? carritoSnap.data().items || [] : [];
}

// ---------------------------------------------------------
// ABRIR PANEL DE PAGO
// ---------------------------------------------------------
export function abrirPago() {
  const checkoutPanel = document.getElementById("checkoutContainer");

  if (checkoutPanel?.classList.contains("show")) {
    checkoutPanel.classList.remove("show");
    setTimeout(() => (checkoutPanel.style.display = "none"), 250);
  }

  if (carrito.length === 0) {
    Swal.fire({
      icon: "warning",
      title: "Carrito vacío",
      text: "Agrega productos antes de pagar 🥚",
    });
    return;
  }

  paymentContainer.style.display = "flex";
  setTimeout(() => paymentContainer.classList.add("show"), 10);
  actualizarTotales();
  mostrarMetodoPagoSeleccionado();
  metodoPagoValidado = false;
}

// ---------------------------------------------------------
// CERRAR PANEL
// ---------------------------------------------------------
closePayment.addEventListener("click", () => {
  paymentContainer.classList.remove("show");
  setTimeout(() => (paymentContainer.style.display = "none"), 250);
});

// ---------------------------------------------------------
// CALCULAR TOTAL SIN SUMAR IVA (solo para mostrar)
// ---------------------------------------------------------
function actualizarTotales() {
  // Subtotal = suma de productos
  subtotal = carrito.reduce((acc, i) => acc + i.precio * i.cantidad, 0);

  // IVA solo como variable interna, lista para usar si se necesita
  impuesto = Math.round(subtotal * 0.19);

  // Total real SIN IVA
  total = subtotal; // <- Aquí quitamos la suma del impuesto

  // Actualizar interfaz
  if (paymentSubtotal) paymentSubtotal.textContent = `$${subtotal.toLocaleString()}`;
  if (paymentImpuesto) paymentImpuesto.textContent = `$0`; // mostramos cero o podemos ocultar
  if (paymentTotal) paymentTotal.textContent = `$${total.toLocaleString()}`;

  // Actualizar monto dinámico en panel de QR si ya existe
  const montoTexto = document.getElementById("montoTexto");
  if (montoTexto) montoTexto.textContent = `$${total.toLocaleString()}`;

  const textoMontoPagar = document.getElementById("textoMontoPagar");
  if (textoMontoPagar) textoMontoPagar.textContent = `$${total.toLocaleString()}`;
}

// ---------- Registrar listeners del comprobante UNA sola vez (inicialización) ----------
function initComprobanteListeners() {
  const btnSubir = document.getElementById("btnSubirComprobante");
  const inputComprobante = document.getElementById("comprobantePago");
  const nombreComprobante = document.getElementById("nombreComprobante");

  if (!btnSubir || !inputComprobante || !nombreComprobante) {
    // Si por alguna razón aún no están en el DOM, intentamos más tarde (opcional)
    document.addEventListener("DOMContentLoaded", initComprobanteListeners, { once: true });
    return;
  }

  // Asegurarnos de remover listeners previos (por si se recarga el módulo)
  btnSubir.replaceWith(btnSubir.cloneNode(true));
  const newBtnSubir = document.getElementById("btnSubirComprobante");

  newBtnSubir.addEventListener("click", (e) => {
    e.preventDefault();
    // limpiamos valor anterior para forzar 'change' aunque sea el mismo archivo
    inputComprobante.value = "";
    inputComprobante.click();
  });

  inputComprobante.addEventListener("change", () => {
    const archivo = inputComprobante.files[0];
    nombreComprobante.textContent = archivo?.name || "";

    if (!archivo) return;

    if (!archivo.type.startsWith("image/")) {
      Swal.fire({
        icon: "error",
        title: "Formato no permitido",
        text: "Solo puedes subir imágenes (JPG, PNG, etc).",
      });
      inputComprobante.value = "";
      nombreComprobante.textContent = "";
      return;
    }

    // aquí procesa el archivo (p. ej. subir a Cloudinary), pero NO dispares input.click de nuevo
  });
};


// ---------------------------------------------------------
// MOSTRAR MÉTODO DE PAGO + QR + ANIMACIÓN
// ---------------------------------------------------------
function mostrarMetodoPagoSeleccionado() {
  let metodo = "nequi";
  radiosPago.forEach(r => { if (r.checked) metodo = r.value; });

  metodoPagoValidado = false;

  if (metodo === "efectivo") {
    paymentMethodContainer.innerHTML = `
      <p class="text-center">💵 Pagarás en efectivo al momento de la entrega.</p>
    `;
    return;
  }

  // Inserta el contenido dinámico en el panel
paymentMethodContainer.innerHTML = `
  <p class="text-center" style="font-size: 15px; margin-top:10px; margin-bottom:10px;">
    💰 <strong>Debes pagar exactamente:</strong> <span id="textoMontoPagar"></span>
  </p>

  <p class="text-center" style="font-size: 15px; margin-bottom:10px;">
    Por favor transfiere el valor total antes de confirmar el pedido.
  </p>

  <p class="text-center" style="font-size: 15px; margin-bottom:15px;">
    Recuerda que deberás subir el comprobante del pago.
  </p>

  <p class="text-center">📱 Transfiere el total a <strong>${metodo === "nequi" ? "Nequi" : "Bancolombia"}</strong></p>

  <!-- IMAGEN QR -->
  <div style="text-align:center; margin-bottom:20px;">
    <img src="${qrURLs[metodo]}" 
      class="qr-img"
      style="width:220px; height:220px; border-radius:15px; box-shadow:0 6px 15px rgba(0,0,0,0.25); animation: fadeInScale .4s ease-out;">
  </div>

  <!-- NÚMERO DE CUENTA / TELEFONO -->
<p class="text-center" style="font-size:16px; margin-bottom:15px;">
  📞 <strong>Número:</strong> 3212864555 
  <i class="fa-regular fa-copy copy-icon" id="copiarNumero" style="color:#000000; cursor:pointer;" title="Copiar"></i>
</p>

  <!-- MONTO -->
<p class="text-center" style="font-size:16px; margin-bottom:20px;">
  💰 <strong>Monto:</strong> <span id="montoTexto"></span> 
  <i class="fa-regular fa-copy copy-icon" id="copiarMonto" style="color:#000000; cursor:pointer;" title="Copiar"></i>
</p>

  <!-- Subir comprobante -->
  <div style="text-align:center; margin-top:10px;">
    <label 
      for="comprobantePago"
      id="btnSubirComprobante"
      style="
        padding:8px 14px;
        background:#444;
        color:white;
        border-radius:6px;
        cursor:pointer;
        font-size:14px;
        display:inline-block;
        transition:0.2s;
      "
      onmouseover="this.style.background='#333'"
      onmouseout="this.style.background='#444'"
    >
      📎 Subir comprobante
    </label>

    <input 
      type="file" 
      id="comprobantePago" 
      accept="image/*"
      style="display:none;"
    >

    <p id="nombreComprobante" style="margin-top:6px; font-size:14px; color:#555;"></p>
  </div>

  <!-- Botón abrir Nequi/Bancolombia -->
  <button id="btnAbrir${metodo}" class="confirm-btn mt-3" style="display:block; margin:auto;">
    Abrir ${metodo === "nequi" ? "Nequi" : "Bancolombia"}
  </button>
`;

  // 2️⃣ Mostrar monto dinámico
  const montoTexto = document.getElementById("montoTexto");
  if (montoTexto) montoTexto.textContent = `$${total.toLocaleString()}`;

  const textoMontoPagar = document.getElementById("textoMontoPagar");
  if (textoMontoPagar) textoMontoPagar.textContent = `$${total.toLocaleString()}`;

  // 3️⃣ Copiar número
// Copiar número
const copiarNumero = document.getElementById("copiarNumero");
copiarNumero?.addEventListener("click", () => {
  const numero = "317432XXXX"; // reemplaza con tu número real
  navigator.clipboard.writeText(numero)
    .then(() => {
      Swal.fire({
        icon: "success",
        title: "Número copiado ✅",
        toast: true,
        position: "top-end",
        timer: 2000,
        showConfirmButton: false
      });
    })
    .catch(() => {
      Swal.fire({
        icon: "error",
        title: "No se pudo copiar",
        toast: true,
        position: "top-end",
        timer: 2000,
        showConfirmButton: false
      });
    });
});

// Copiar monto
const copiarMonto = document.getElementById("copiarMonto");
copiarMonto?.addEventListener("click", () => {
  const monto = total.toLocaleString();
  navigator.clipboard.writeText(monto)
    .then(() => {
      Swal.fire({
        icon: "success",
        title: "Monto copiado ✅",
        toast: true,
        position: "top-end",
        timer: 2000,
        showConfirmButton: false
      });
    })
    .catch(() => {
      Swal.fire({
        icon: "error",
        title: "No se pudo copiar",
        toast: true,
        position: "top-end",
        timer: 2000,
        showConfirmButton: false
      });
    });
});

  // Actualiza el monto en tiempo real
  document.getElementById("textoMontoPagar").textContent = `$${total.toLocaleString()}`;

  // Botón abrir QR
// 🔥 Botón abrir Nequi/Bancolombia con intento de abrir APP
const btn = document.getElementById(`btnAbrir${metodo}`);
btn?.addEventListener("click", () => {
  metodoPagoValidado = true;

  if (metodo === "nequi") {
    // Intentar abrir app Nequi
    window.location.href = "nequi://";

    // Fallback al sitio web
    setTimeout(() => {
      window.open("https://transfers.nequi.com.co/", "_blank");
    }, 800);

    return;
  }

  if (metodo === "bancolombia") {
    // Intentar abrir app Bancolombia
    window.location.href = "bancolombia://";

    // Fallback
    setTimeout(() => {
      window.open("https://bancolombia.com/", "_blank");
    }, 800);

    return;
  }
});

initComprobanteListeners();

}

radiosPago.forEach(radio => radio.addEventListener("change", mostrarMetodoPagoSeleccionado));

// ---------------------------------------------------------
// CONFIRMAR PAGO (validación de QR ACTIVADA)
// ---------------------------------------------------------
confirmPayment.addEventListener("click", async () => {
  if (!usuarioActual) {
    return Swal.fire({ 
      icon: "info", 
      title: "Inicia sesión", 
      text: "Debes iniciar sesión para pagar 😅" 
    });
  }

  if (carrito.length === 0) {
    return Swal.fire({ 
      icon: "warning", 
      title: "Carrito vacío", 
      text: "Agrega productos antes de pagar 🥚" 
    });
  }

  const metodoSel = [...radiosPago].find(r => r.checked)?.value;

  let urlComprobante = "";


// 1️⃣ Validar que haya comprobante si no es efectivo
// El bloque de subida a Storage se repite `if (metodoSel !== "efectivo")` dos veces.
// Puedes unir validación + subida para que quede más limpio:
if (metodoSel !== "efectivo") {
  const comprobanteInput = document.getElementById("comprobantePago");
  if (!comprobanteInput?.files?.length) {
    return Swal.fire({
      icon: "warning",
      title: "Sube tu comprobante",
      text: "Debes subir el comprobante de pago antes de confirmar el pedido."
    });
  }

  const archivoComprobante = comprobanteInput.files[0];
  const formData = new FormData();
  formData.append("file", archivoComprobante);
  formData.append("upload_preset", "distribuevos_unsigned"); // ← el que creaste en Cloudinary

  const cloudinaryURL = "https://api.cloudinary.com/v1_1/dcpgkqoae/image/upload";

  const response = await fetch(cloudinaryURL, {
    method: "POST",
    body: formData
  });

  const data = await response.json();
  urlComprobante = data.secure_url; // ← esta es la URL que guardas en Firestore
}

  try {
    const pedidosRef = collection(db, "pedidos");
    const q = query(pedidosRef, orderBy("pedidoNumero", "desc"), limit(1));
    const snapshot = await getDocs(q); 

let nuevoNumero = 1;

if (!snapshot.empty) {
  const ultimo = snapshot.docs[snapshot.docs.length - 1].data();
  nuevoNumero = (ultimo.pedidoNumero ?? 0) + 1;
}

    const codigoPedido = `PED-${nuevoNumero}`;

      // 📌 Obtener nombre real del user
const userRef = doc(db, "users", usuarioActual);
  const userSnap = await getDoc(userRef);

  let nombreUsuario = "";

 if (userSnap.exists()) {
  const data = userSnap.data();

  nombreUsuario = data.Nombres;
  
  if (data.Apellidos) {
    nombreUsuario += " " + data.Apellidos;
  }
}

await setDoc(doc(db, "pedidos", codigoPedido), {
  pedidoNumero: nuevoNumero,
  codigoPedido,
  usuarioUID: usuarioActual,
  nombreUsuario,
  items: carrito,
  total,
  metodoPago: metodoSel,
  estado: "pendiente",
  fecha: new Date().toISOString(),
  comprobanteURL: urlComprobante // ← aquí va la URL de Cloudinary
});

    await setDoc(doc(db, "carritos", usuarioActual), { items: [] });
    carrito = [];
    actualizarTotales();

    paymentContainer.classList.remove("show");
    setTimeout(() => (paymentContainer.style.display = "none"), 200);

    Swal.fire({
      icon: "success",
      title: "Pedido finalizado",
      text: `Tu pedido fue registrado correctamente. Número: ${codigoPedido}`
    }).then(() => window.location.href = "pedidos.html");

  } catch (error) {
    console.error(error);
    Swal.fire({ 
      icon: "error", 
      title: "Error", 
      text: "Ocurrió un error, intenta nuevamente." 
    });
  }
});

// ---------------------------------------------------------
// ABRIR CHECKOUT DESDE OTRO PANEL
// ---------------------------------------------------------
btnVerDetalles?.addEventListener("click", () => {
  paymentContainer.classList.remove("show");
  setTimeout(() => (paymentContainer.style.display = "none"), 250);
  document.dispatchEvent(new Event("abrirCheckoutForce"));
});

// Permitir que checkout.js abra panel de pago
document.addEventListener("abrirPanelPago", abrirPago);

// ---------------------------------------------------------
// ANIMACIÓN QR
// ---------------------------------------------------------
const style = document.createElement("style");
style.innerHTML = `
@keyframes fadeInScale {
  from { opacity: 0; transform: scale(0.7); }
  to   { opacity: 1; transform: scale(1); }
}`;
document.head.appendChild(style);
