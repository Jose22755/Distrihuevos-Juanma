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
  bancolombia: "../html/images/CodigoQR_prueba.jpg"
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
// CALCULAR TOTAL
// ---------------------------------------------------------
function actualizarTotales() {
  subtotal = carrito.reduce((acc, i) => acc + i.precio * i.cantidad, 0);
  impuesto = Math.round(subtotal * 0.19);
  total = subtotal + impuesto;

  paymentSubtotal.textContent = `$${subtotal.toLocaleString()}`;
  paymentImpuesto.textContent = `$${impuesto.toLocaleString()}`;
  paymentTotal.textContent = `$${total.toLocaleString()}`;
}

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
    📞 <strong>Número:</strong> 317432XXXX 
    <span class="copy-icon" id="copiarNumero" style="cursor:pointer; font-size:16px;">📋</span>
  </p>

  <!-- MONTO -->
  <p class="text-center" style="font-size:16px; margin-bottom:20px;">
    💰 <strong>Monto:</strong> <span id="montoTexto"></span> 
    <span class="copy-icon" id="copiarMonto" style="cursor:pointer; font-size:16px;">📋</span>
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


  // Botón personalizado para subir comprobante
  const btnSubir = document.getElementById("btnSubirComprobante");
  const inputComprobante = document.getElementById("comprobantePago");
  const nombreComprobante = document.getElementById("nombreComprobante");

  btnSubir.addEventListener("click", () => inputComprobante.click());
inputComprobante.addEventListener("change", () => {
  const archivo = inputComprobante.files[0];
  nombreComprobante.textContent = archivo?.name || "";

  if (!archivo) return;

  const tipo = archivo.type;

  if (!tipo.startsWith("image/")) {
    Swal.fire({
      icon: "error",
      title: "Formato no permitido",
      text: "Solo puedes subir imágenes (JPG, PNG, etc).",
    });

    inputComprobante.value = "";
    nombreComprobante.textContent = "";
    return;
  }
});

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
    return Swal.fire({ icon: "warning", title: "Sube tu comprobante", text: "Debes subir el comprobante de pago antes de confirmar el pedido." });
  }
  const archivoComprobante = comprobanteInput.files[0];
  const storage = getStorage();
  const storageRef = ref(storage, `comprobantes/${usuarioActual}_${Date.now()}_${archivoComprobante.name}`);
  const snapshot = await uploadBytes(storageRef, archivoComprobante);
  urlComprobante = await getDownloadURL(snapshot.ref);
}
  // ---------------------------------------------------------
  // 🔥 Validación REAL del pago (antes la querías reactivar)
  // ---------------------------------------------------------
  if (metodoSel !== "efectivo" && !metodoPagoValidado) {
    return Swal.fire({
      icon: "warning",
      title: "Confirma el pago",
      text: "Debes abrir Nequi o Bancolombia para validar el pago 📱"
    });
  }

  try {
    const pedidosRef = collection(db, "pedidos");
    const q = query(pedidosRef, orderBy("pedidoNumero", "desc"), limit(1));
    const snapshot = await getDocs(q);

    let nuevoNumero = 1;

    if (!snapshot.empty) {
      const ultimo = snapshot.docs[0].data();
      nuevoNumero = (ultimo.pedidoNumero && ultimo.pedidoNumero < 100000) 
        ? ultimo.pedidoNumero + 1 
        : 1;
    }

    const codigoPedido = `PED-${nuevoNumero}`;

    await setDoc(doc(db, "pedidos", codigoPedido), {
      pedidoNumero: nuevoNumero,
      codigoPedido,
      usuario: usuarioActual,
      items: carrito,
      subtotal,
      impuesto,
      total,
      metodoPago: metodoSel,
      urlComprobante: urlComprobante || "",
      estado: "pendiente",
      fecha: new Date().toISOString()
    });


    await setDoc(doc(db, "carritos", usuarioActual), { items: [] });
    carrito = [];
    actualizarTotales();

    paymentContainer.classList.remove("show");
    setTimeout(() => (paymentContainer.style.display = "none"), 200);

    Swal.fire({
      icon: "success",
      title: "Pedido creado 🎉",
      text: `Tu pedido fue registrado correctamente. Número: ${codigoPedido}`
    }).then(() => window.location.href = "cart.html");

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
