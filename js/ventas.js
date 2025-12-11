// ventas.js
import { db } from "../js/firebase-config.js";
import { collection, onSnapshot, getDocs } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

(() => {
  // ===== DOM =====
  const totalVentasEl = document.getElementById("ventas_totalVentas");
  const totalPedidosEl = document.getElementById("ventas_totalPedidos");
  const totalProductosEl = document.getElementById("ventas_totalProductos");
  const totalClientesEl = document.getElementById("ventas_totalClientes");

  const graficoVentasEl = document.getElementById("ventas_graficoVentas");
  const graficoVentasDiariasEl = document.getElementById("ventas_graficoVentasDiarias");
  const top5ProductosEl = document.getElementById("ventas_top5Productos");

  const historialVentasEl = document.getElementById("historialVentasDiarias");
  const tablaPedidosDiaEl = document.getElementById("tablaPedidosDia");
  const modalDiaTitulo = document.getElementById("modalDiaTitulo");
  const tablaHistorialEl = document.getElementById("historialVentasTabla")?.querySelector("tbody");

  let chartVentas = null;
  let chartVentasDiarias = null;
  let chartHistorial = null;

  const ventasPorProducto = {};
  const ventasUltimos7Dias = {};
  const historialVentas = {}; // { "YYYY-MM-DD": [pedido1,...] }

  let productosValidos = new Set(); // productos existentes hoy

  // ===== Cards clickeables =====
  const cardVentas    = document.querySelector("#ventas .bg-gradient-ventas");
  const cardPedidos   = document.querySelector("#ventas .bg-gradient-pedidos");
  const cardProductos = document.querySelector("#ventas .bg-gradient-productos");
  const cardClientes  = document.querySelector("#ventas .bg-gradient-clientes");

  function mostrarSeccion(id) {
    document.querySelectorAll(".section").forEach(sec => sec.classList.remove("active"));
    const s = document.getElementById(id);
    if (s) s.classList.add("active");
    s?.scrollIntoView({ behavior: "smooth" });

    document.querySelectorAll(".menu li").forEach(li => li.classList.remove("active"));
    const menuItem = document.querySelector(`.menu li[data-section="${id}"]`);
    if (menuItem) menuItem.classList.add("active");
  }

  if (cardVentas)    cardVentas.addEventListener("click", () => mostrarSeccion("ventas"));
  if (cardPedidos)   cardPedidos.addEventListener("click", () => mostrarSeccion("pedidos"));
  if (cardProductos) cardProductos.addEventListener("click", () => mostrarSeccion("productos"));
  if (cardClientes)  cardClientes.addEventListener("click", () => mostrarSeccion("clientes"));

  // ===== Fechas últimos 7 días (orden fijo) =====
  const dias7 = [];
  for (let i = 6; i >= 0; i--) {
    const f = new Date();
    f.setDate(f.getDate() - i);
    const diaStr = f.getFullYear() + "-" + String(f.getMonth() + 1).padStart(2, "0") + "-" + String(f.getDate()).padStart(2, "0");
    dias7.push(diaStr);
    ventasUltimos7Dias[diaStr] = 0;
  }

  // ---------------- utility: parsear fechas firestore/string/date ----------------
  function parseFechaToDate(fecha) {
    if (!fecha) return null;
    if (typeof fecha === "object" && fecha.seconds !== undefined) return new Date(fecha.seconds * 1000);
    if (typeof fecha === "object" && typeof fecha.toDate === "function") return fecha.toDate();
    if (typeof fecha === "string") {
      const d = new Date(fecha);
      if (!isNaN(d)) return d;
    }
    if (fecha instanceof Date) return fecha;
    return null;
  }

  function formatDateKey(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  // ===== Normalizar nombres =====
  const normalizarNombre = nombre => nombre.trim().toLowerCase().replace(/\s+/g, " ");

 // ===== Cargar productos válidos =====
let mapaProductos = {}; // normalizado => nombre exacto de la BD

const cargarProductosValidos = async () => {
  const productosCol = collection(db, "products");
  const snapshot = await getDocs(productosCol);
  snapshot.forEach(doc => {
    const data = doc.data();
    const nombreReal = data.Nombre; // nombre exacto en BD
    const nombreNorm = normalizarNombre(nombreReal);
    mapaProductos[nombreNorm] = nombreReal; // guardamos en el mapa
    productosValidos.add(nombreNorm); // también llenamos el set
  });
};

  // ===== Funciones gráficos =====
  function actualizarGraficoVentas() {
    const etiquetas = Object.keys(ventasPorProducto);
    const cantidades = Object.values(ventasPorProducto);
    const colores = etiquetas.map((_, i) => `hsl(${i * 360 / Math.max(1, etiquetas.length)}, 70%, 50%)`);
    if (!graficoVentasEl) return;

    if (chartVentas) {
      chartVentas.data.labels = etiquetas;
      chartVentas.data.datasets[0].data = cantidades;
      chartVentas.data.datasets[0].backgroundColor = colores;
      chartVentas.update();
    } else {
      chartVentas = new Chart(graficoVentasEl, {
        type: "bar",
        data: { labels: etiquetas, datasets: [{ label: "Unidades vendidas", data: cantidades, backgroundColor: colores }] },
        options: { responsive: true, scales: { y: { beginAtZero:true, grace: '10%' } }, plugins: { legend:{display:false}, datalabels:{anchor:'end',align:'end',color:'#000',font:{weight:'bold'},formatter:v=>v}} },
        plugins: [ChartDataLabels]
      });
    }
  }

  function actualizarTop5() {
    const top = Object.entries(ventasPorProducto).sort((a,b)=>b[1]-a[1]).slice(0,5);
    if (!top5ProductosEl) return;
    top5ProductosEl.innerHTML = "";
    top.forEach(([nombre, cant]) => {
      const li = document.createElement("li");
      li.className = "list-group-item d-flex justify-content-between align-items-center";
      li.textContent = nombre;
      const span = document.createElement("span");
      span.className = "badge bg-primary rounded-pill";
      span.textContent = cant;
      li.appendChild(span);
      top5ProductosEl.appendChild(li);
    });
  }

  function actualizarGraficoUltimos7Dias() {
    const etiquetas = dias7.slice();
    const cantidades = etiquetas.map(d => ventasUltimos7Dias[d] || 0);
    if (!graficoVentasDiariasEl) return;

    if (chartVentasDiarias) {
      chartVentasDiarias.data.labels = etiquetas;
      chartVentasDiarias.data.datasets[0].data = cantidades;
      chartVentasDiarias.update();
    } else {
      chartVentasDiarias = new Chart(graficoVentasDiariasEl, {
        type: "bar",
        data: { labels: etiquetas, datasets: [{ label: "Ventas últimos 7 días ($)", data: cantidades, backgroundColor: "#0d6efd" }] },
        options: { responsive:true, scales:{y:{beginAtZero:true,grace:'10%'}}, plugins:{legend:{display:false}, datalabels:{anchor:'end',align:'end',color:'#000',font:{weight:'bold'},formatter:v=>`$${Number(v).toLocaleString("es-CO")}`,offset:-4}} },
        plugins: [ChartDataLabels]
      });
    }
  }

  function actualizarHistorialVentas() {
    const etiquetas = Object.keys(historialVentas).sort();
    const cantidades = etiquetas.map(dia => historialVentas[dia].reduce((sum, p) => sum + Number(p.total||0),0));
    if (!historialVentasEl) return;

    if (chartHistorial) {
      chartHistorial.data.labels = etiquetas;
      chartHistorial.data.datasets[0].data = cantidades;
      chartHistorial.update();
    } else {
      chartHistorial = new Chart(historialVentasEl, {
        type:"bar",
        data:{labels:etiquetas,datasets:[{label:"Ventas por día ($)",data:cantidades,backgroundColor:"#198754"}]},
        options:{responsive:true,scales:{y:{beginAtZero:true,grace:'10%'}},plugins:{legend:{display:false}, datalabels:{anchor:'end',align:'end',color:'#000',font:{weight:'bold'},formatter:v=>`$${Number(v).toLocaleString("es-CO")}`,offset:-4}},onClick:(evt,items)=>{if(items.length>0){const index=items[0].index;const dia=etiquetas[index];mostrarPedidosDia(dia);}} },
        plugins:[ChartDataLabels]
      });
    }
  }

  function convertirFecha(fecha) {
    const d = parseFechaToDate(fecha);
    return d ? d.toLocaleString("es-CO") : "Sin fecha";
  }

  function mostrarPedidosDia(dia) {
    const pedidos = historialVentas[dia] || [];
    modalDiaTitulo.textContent = `Pedidos del día ${dia}`;
    tablaPedidosDiaEl.innerHTML = "";
    pedidos.forEach(p => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.id}</td>
        <td>${p.nombreUsuario || p.cliente || "Sin nombre"}</td>
        <td>${convertirFecha(p.fecha)}</td>
        <td>$${Number(p.total||0).toLocaleString("es-CO")}</td>
        <td>${(p.items||[]).map(i=>`${i.nombre} (${i.cantidad})`).join(", ")}</td>
      `;
      tablaPedidosDiaEl.appendChild(tr);
    });
    new bootstrap.Modal(document.getElementById("modalPedidosDia")).show();
  }

function actualizarTablaHistorial() {
  if (!tablaHistorialEl) return;

  // Crear array de filas para DataTables
  const filas = [];
const dias = Object.keys(historialVentas).sort((a,b)=>new Date(b) - new Date(a));

  dias.forEach(dia => {
    const pedidos = historialVentas[dia];
    const totalDia = pedidos.reduce((sum,p)=>sum+Number(p.total||0),0);
    const totalProductos = pedidos.reduce((sum,p)=>sum+(p.items?.reduce((s,i)=>s+Number(i.cantidad||0),0)||0),0);
    const clientesUnicos = new Set(pedidos.map(p=>p.cliente||p.uid)).size;
    const promedio = pedidos.length>0 ? totalDia/pedidos.length : 0;

    // Botones HTML
// Botones HTML (uno encima del otro)
const acciones = `
  <div class="d-flex flex-column gap-1">
    <button class="btn btn-sm btn-success verPedidosDia">Ver pedidos</button>
  </div>
`;


    filas.push([
      dia,
      `$${totalDia.toLocaleString("es-CO")}`,
      pedidos.length,
      `$${promedio.toLocaleString("es-CO")}`,
      totalProductos,
      clientesUnicos,
      acciones
    ]);
  });

  // Destruir tabla anterior si existe
  if ($.fn.DataTable.isDataTable('#historialVentasTabla')) {
    $('#historialVentasTabla').DataTable().destroy();
  }

  // Limpiar tbody
  tablaHistorialEl.innerHTML = "";

  // Inicializar DataTable con las filas actualizadas
window.tablaHistorialDataTable = $("#historialVentasTabla").DataTable({
    data: filas,
    columns: [
      { title: "Día" },
      { title: "Total ($)" },
      { title: "Pedidos" },
      { title: "Promedio ($)" },
      { title: "Productos" },
      { title: "Clientes" },
      { title: "Acciones", orderable:false }
    ],
    order: [[0, 'desc']], // <--- aquí se fuerza la primera columna a descendente
    pageLength: 10,
    lengthMenu: [5,10,20,50],
    searching: false,
    autoWidth: false,
    language: { url:'https://cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json' },
    columnDefs: [{ className: "text-center", targets: "_all" }]
  });

  // Asignar eventos a botones de cada fila
  $('#historialVentasTabla tbody').off('click'); // eliminar listeners previos
  $('#historialVentasTabla tbody').on('click', '.verPedidosDia', function() {
    const fila = window.tablaHistorialDataTable.row($(this).parents('tr')).data();
    const dia = fila[0]; // primer columna = día
    mostrarPedidosDia(dia);
  });
  $('#historialVentasTabla tbody').on('click', '.descargarPDFDia', function() {
    const fila = window.tablaHistorialDataTable.row($(this).parents('tr')).data();
    const dia = fila[0];
    exportarPDFDia(dia);
  });
}


  // ===== Firestore en tiempo real =====
  const init = async () => {
    await cargarProductosValidos();

    onSnapshot(collection(db,"pedidos"), snap => {
      let sumaVentas=0,totalProdVendidos=0,totalPedidos=0;
      Object.keys(ventasPorProducto).forEach(k=>delete ventasPorProducto[k]);
      Object.keys(ventasUltimos7Dias).forEach(k=>ventasUltimos7Dias[k]=0);
      Object.keys(historialVentas).forEach(k=>delete historialVentas[k]);

      snap.forEach(doc=>{
        const p = doc.data();
        totalPedidos++;

        sumaVentas+=Number(p.total||0);

        (p.items||[])
        .forEach(i => {
          const nombrePedido = i.Nombre || i.nombre || "Sin nombre";
          const nombreNorm = normalizarNombre(nombrePedido);

          // ignoramos si no está en productos actuales
          if (!mapaProductos[nombreNorm]) return;

          const nombreReal = mapaProductos[nombreNorm]; // nombre oficial de BD
          const cantidad = Number(i.cantidad || i.Cantidad || 0);

          // Guardamos usando el nombre oficial
          ventasPorProducto[nombreReal] = (ventasPorProducto[nombreReal] || 0) + cantidad;
          totalProdVendidos += cantidad;
        });



        const fechaObj = parseFechaToDate(p.fecha) || new Date();
        const fechaStr = formatDateKey(fechaObj);

        if(!historialVentas[fechaStr]) historialVentas[fechaStr]=[];
        historialVentas[fechaStr].push({id:doc.id,...p});

        if(ventasUltimos7Dias.hasOwnProperty(fechaStr)){
          ventasUltimos7Dias[fechaStr]+=Number(p.total||0);
        }
      });

      totalVentasEl.textContent = sumaVentas.toLocaleString("es-CO");
      totalPedidosEl.textContent = totalPedidos;
      totalProductosEl.textContent = totalProdVendidos;

      actualizarGraficoVentas();
      actualizarTop5();
      actualizarGraficoUltimos7Dias();
      actualizarHistorialVentas();
      actualizarTablaHistorial();
    });

    onSnapshot(collection(db,"users"), snap => {
      totalClientesEl.textContent = snap.size;
    });
  };

  init();

  // ===== Funciones PDF =====
// ===== Funciones PDF =====
function exportarPDFDia(dia) {
  const pedidos = historialVentas[dia];
  if (!pedidos || pedidos.length === 0) {
    Swal.fire("Sin datos", "Este día no tiene pedidos registrados.", "info");
    return;
  }

  let contenedor = document.getElementById("pdfContent");
  if (!contenedor) {
    contenedor = document.createElement("div");
    contenedor.id = "pdfContent";
    document.body.appendChild(contenedor);
  }

  contenedor.style.display = "block";
  contenedor.innerHTML = generarHTMLReporte(dia, pedidos);

  const opt = {
    margin: 10,
    filename: `reporte_${dia}.pdf`,
    html2canvas: {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff", // ← OBLIGATORIO
      logging: false
    },
    jsPDF: {
      unit: "mm",
      format: "a4",
      orientation: "portrait"
    }
  };

  setTimeout(async () => {
    await new Promise(r => setTimeout(r, 300)); // asegura render visual

    html2pdf().set(opt).from(contenedor).save().then(() => {
      contenedor.style.display = "none";
      contenedor.innerHTML = "";
    });
  }, 100);
}



function generarHTMLReporte(dia, pedidos) {
  let rows = "";

  pedidos.forEach(p => {
    const fecha = convertirFecha(p.fecha);
    const cliente = p.cliente || p.nombreUsuario || "Sin nombre";
    const total = Number(p.total || 0).toLocaleString("es-CO");
    const items = (p.items || []).map(i => `${i.Nombre || i.nombre} (${i.cantidad})`).join(", ");

    rows += `
      <tr>
        <td>${p.id}</td>
        <td>${cliente}</td>
        <td>${fecha}</td>
        <td>$${total}</td>
        <td>${items}</td>
      </tr>`;
  });

  const totalDia = pedidos.reduce((acc, p) => acc + Number(p.total || 0), 0)
                          .toLocaleString("es-CO");

  return `
    <div style="
      font-family: sans-serif;
      width: 100%;
      max-width: 750px;
      margin: 0 auto;
      padding: 20px;
      background: #ffffff;
      box-sizing: border-box;
    ">

      <h2 style="text-align:center; margin-bottom:20px;">
        Reporte del día ${dia}
      </h2>

      <table style="width:100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="background:#f0f0f0;">
            <th style="border:1px solid #000; padding:6px;">ID</th>
            <th style="border:1px solid #000; padding:6px;">Cliente</th>
            <th style="border:1px solid #000; padding:6px;">Fecha</th>
            <th style="border:1px solid #000; padding:6px;">Total</th>
            <th style="border:1px solid #000; padding:6px;">Productos</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <h3 style="margin-top:25px; text-align:right;">
        Total del día: $${totalDia}
      </h3>
    </div>`;
}

})();
