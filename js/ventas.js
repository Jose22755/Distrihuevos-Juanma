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
  // Tabla de historial de ventas por día
  const tablaHistorialEl = document.getElementById("historialVentasTabla")?.querySelector("tbody");

  let chartVentas = null;
  let chartVentasDiarias = null;
  let chartHistorial = null;
  let tablaHistorialVentas = null;

  const ventasPorProducto = {};
  const ventasUltimos7Dias = {};
  const historialVentas = {}; // { "2025-11-29": [pedido1, pedido2, ...] }

  // ===== Cards clickeables =====
// seleccionar cada card dentro de la sección ventas
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

  // ===== Fechas últimos 7 días =====
  const dias7 = [];
  for (let i = 6; i >= 0; i--) {
    const f = new Date();
    f.setDate(f.getDate() - i);
    const diaStr = f.toISOString().slice(0,10);
    dias7.push(diaStr);
    ventasUltimos7Dias[diaStr] = 0;
  }

  // ===== Funciones gráficos =====
  function actualizarGraficoVentas() {
    const etiquetas = Object.keys(ventasPorProducto);
    const cantidades = Object.values(ventasPorProducto);
    const colores = etiquetas.map((_, i) => `hsl(${i * 360 / etiquetas.length}, 70%, 50%)`);

    if (!graficoVentasEl) return;

    if (chartVentas) {
      chartVentas.data.labels = etiquetas;
      chartVentas.data.datasets[0].data = cantidades;
      chartVentas.update();
    } else {
      chartVentas = new Chart(graficoVentasEl, {
        type: "bar",
        data: {
          labels: etiquetas,
          datasets: [{
            label: "Unidades vendidas",
            data: cantidades,
            backgroundColor: colores
          }]
        },
        options: {
          responsive: true,
          scales: { y: { beginAtZero:true, grace: '10%' } },
          plugins: {
            legend: { display:false },
            datalabels: { anchor:'end', align:'end', color:'#000', font:{weight:'bold'}, formatter:v=>v }
          }
        },
        plugins: [ChartDataLabels]
      });
    }
  }

  function actualizarTop5() {
    const top = Object.entries(ventasPorProducto)
      .sort((a,b)=>b[1]-a[1])
      .slice(0,5);
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
    // Generar etiquetas de los últimos 7 días (local)
    const hoy = new Date();
    const etiquetas = [];
    for (let i = 6; i >= 0; i--) {
        const f = new Date(hoy);
        f.setDate(f.getDate() - i);
        const diaStr = f.getFullYear() + "-" +
                       String(f.getMonth() + 1).padStart(2, "0") + "-" +
                       String(f.getDate()).padStart(2, "0");
        etiquetas.push(diaStr);
        // Asegurarse de que ventasUltimos7Dias tenga la propiedad
        if (!(diaStr in ventasUltimos7Dias)) ventasUltimos7Dias[diaStr] = 0;
    }

    const cantidades = etiquetas.map(d => ventasUltimos7Dias[d] || 0);

    if (!graficoVentasDiariasEl) return;

    if (chartVentasDiarias) {
        chartVentasDiarias.data.labels = etiquetas;
        chartVentasDiarias.data.datasets[0].data = cantidades;
        chartVentasDiarias.update();
    } else {
        chartVentasDiarias = new Chart(graficoVentasDiariasEl, {
            type: "bar",
            data: {
                labels: etiquetas,
                datasets: [{
                    label: "Ventas últimos 7 días ($)",
                    data: cantidades,
                    backgroundColor: "#0d6efd"
                }]
            },
            options: {
                responsive: true,
                scales: { y: { beginAtZero:true, grace:'10%' } },
                plugins: {
                    legend: { display:false },
                    datalabels: {
                        anchor:'end',
                        align:'end',
                        color:'#000',
                        font:{weight:'bold'},
                        formatter:v=>Number(v).toLocaleString("es-CO"),
                        offset:-4
                    }
                }
            },
            plugins: [ChartDataLabels]
        });
    }
}

  function actualizarHistorialVentas() {
    const etiquetas = Object.keys(historialVentas).sort();
    const cantidades = etiquetas.map(dia => historialVentas[dia].reduce((sum, p) => sum + Number(p.total||0), 0));

    if (!historialVentasEl) return;

    if (chartHistorial) {
      chartHistorial.data.labels = etiquetas;
      chartHistorial.data.datasets[0].data = cantidades;
      chartHistorial.update();
    } else {
      chartHistorial = new Chart(historialVentasEl, {
        type: "bar",
        data: {
          labels: etiquetas,
          datasets: [{
            label: "Ventas por día ($)",
            data: cantidades,
            backgroundColor: "#198754"
          }]
        },
        options: {
          responsive:true,
          scales: { y: { beginAtZero:true, grace:'10%' } },
          plugins: {
            legend: { display:false },
            datalabels: { anchor:'end', align:'end', color:'#000', font:{weight:'bold'}, formatter:v=>Number(v).toLocaleString("es-CO"), offset:-4 }
          },
          onClick: (evt, items) => {
            if (items.length > 0) {
              const index = items[0].index;
              const dia = etiquetas[index];
              mostrarPedidosDia(dia);
            }
          }
        },
        plugins:[ChartDataLabels]
      });
    }
  }

  function mostrarPedidosDia(dia) {
    const pedidos = historialVentas[dia] || [];
    modalDiaTitulo.textContent = `Pedidos del día ${dia}`;
    tablaPedidosDiaEl.innerHTML = "";
    pedidos.forEach(p => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.id}</td>
<td>${p.cliente || p.nombreUsuario || "Sin nombre"}</td>
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

  const dias = Object.keys(historialVentas).sort((a,b)=>b.localeCompare(a)); // más reciente arriba
  tablaHistorialEl.innerHTML = "";

  dias.forEach(dia => {
    const pedidos = historialVentas[dia];
    const totalDia = pedidos.reduce((sum, p) => sum + Number(p.total || 0), 0);
    const totalProductos = pedidos.reduce((sum, p) => sum + (p.items?.reduce((s,i)=>s+Number(i.cantidad||0),0) || 0), 0);
    const clientesUnicos = new Set(pedidos.map(p => p.cliente)).size;
    const promedio = pedidos.length > 0 ? totalDia / pedidos.length : 0;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="text-center">${dia}</td>
      <td class="text-center">$${totalDia.toLocaleString("es-CO")}</td>
      <td class="text-center">${pedidos.length}</td>
      <td class="text-center">$${promedio.toLocaleString("es-CO")}</td>
      <td class="text-center">${totalProductos}</td>
      <td class="text-center">${clientesUnicos}</td>
<td class="text-center d-flex flex-column gap-1">
    <button class="btn btn-sm btn-success verPedidosDia">Ver pedidos</button>
    <button class="btn btn-sm btn-danger descargarPDFDia">
        <i class="bi bi-file-earmark-pdf"></i> PDF
    </button>
</td>
    `;
tr.querySelector(".descargarPDFDia").addEventListener("click", () => {
    exportarPDFDia(dia);
});
    tablaHistorialEl.appendChild(tr);
  });

  // Inicializar o actualizar DataTable
  if (!window.tablaHistorialDataTable) {
    window.tablaHistorialDataTable = $("#historialVentasTabla").DataTable({
      pageLength: 10,
      lengthMenu: [5, 10, 20, 50],
      searching: false, // <-- Esto quita el buscador
      language: { url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json' },
      columnDefs: [
        { className: "text-center", targets: "_all" } // centrar todas las columnas
      ]
    });
  } else {
    window.tablaHistorialDataTable.clear().draw();
    window.tablaHistorialDataTable.rows.add($("#historialVentasTabla tbody tr")).draw();
  }
}

  // ===== Firestore en tiempo real =====
  onSnapshot(collection(db,"pedidos"), snap => {
    let sumaVentas=0, totalProdVendidos=0, totalPedidos=0;
    Object.keys(ventasPorProducto).forEach(k=>ventasPorProducto[k]=0);
    Object.keys(ventasUltimos7Dias).forEach(k=>ventasUltimos7Dias[k]=0);
    Object.keys(historialVentas).forEach(k=>delete historialVentas[k]);

    snap.forEach(doc => {
      const p = doc.data();
      totalPedidos++;

      // Totales
      sumaVentas += Number(p.total||0);
      (p.items||[]).forEach(i => {
        const nombre = i.nombre||"Sin nombre";
        ventasPorProducto[nombre] = (ventasPorProducto[nombre]||0)+Number(i.cantidad||0);
        totalProdVendidos += Number(i.cantidad||0);
      });

      // Historial de ventas por día
let f;
if (p.fecha?.seconds) {
    f = new Date(p.fecha.seconds * 1000);
} else if (typeof p.fecha === "string") {
    f = new Date(p.fecha);
} else {
    f = new Date();
}
const fechaStr = f.toISOString().slice(0,10);
      if (!historialVentas[fechaStr]) historialVentas[fechaStr] = [];
      historialVentas[fechaStr].push({ id: doc.id, ...p });

      // Últimos 7 días
      if (ventasUltimos7Dias.hasOwnProperty(fechaStr)) ventasUltimos7Dias[fechaStr] += Number(p.total||0);
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

function convertirFecha(fecha) {
    if (!fecha) return "Sin fecha";

    // Firestore Timestamp
    if (fecha.seconds) {
        return new Date(fecha.seconds * 1000).toLocaleString("es-CO");
    }

    // ISO string
    if (typeof fecha === "string") {
        const d = new Date(fecha);
        return isNaN(d) ? "Sin fecha" : d.toLocaleString("es-CO");
    }

    // Date object
    if (fecha instanceof Date) {
        return fecha.toLocaleString("es-CO");
    }

    return "Sin fecha";
}

function exportarPDFDia(dia) {
    const pedidos = historialVentas[dia];

    if (!pedidos || pedidos.length === 0) {
        Swal.fire("Sin datos", "Este día no tiene pedidos registrados.", "info");
        return;
    }

    // ===== Crear iframe oculto =====
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.left = "-9999px";
    iframe.style.top = "-9999px";
    iframe.width = "793";
    iframe.height = "1122";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;

    // ===== HTML DEL REPORTE =====
    let html = `
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h2 { text-align: center; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #000; padding: 6px; font-size: 14px; }
                th { background: #e2f3e9; }
                .total { margin-top: 20px; font-size: 18px; font-weight: bold; }
                .footer { margin-top: 40px; text-align: center; }
            </style>
        </head>
        <body>

            <h2>Reporte del día ${dia}</h2>

            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Cliente</th>
                        <th>Fecha</th>
                        <th>Total</th>
                        <th>Productos</th>
                    </tr>
                </thead>
                <tbody>
    `;

    pedidos.forEach(p => {
        const fecha = convertirFecha(p.fecha);
        const cliente = p.cliente || p.nombreUsuario || "Sin nombre";
        const total = Number(p.total || 0).toLocaleString("es-CO");
        const items = (p.items || []).map(i => `${i.nombre} (${i.cantidad})`).join(", ");

        html += `
            <tr>
                <td>${p.id}</td>
                <td>${cliente}</td>
                <td>${fecha}</td>
                <td>$${total}</td>
                <td>${items}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>

            <div class="total">
                Total del día: $${pedidos.reduce((a, b) => a + Number(b.total || 0), 0).toLocaleString("es-CO")}
            </div>

            <div class="footer">
                Sistema Distrihuevos Juanma
            </div>

        </body>
        </html>
    `;

    // ===== Insertar HTML en iframe =====
    doc.open();
    doc.write(html);
    doc.close();

    // ===== Esperar a que cargue y generar PDF =====
    iframe.onload = () => {
        html2pdf()
        .set({
            margin: 10,
            filename: `reporte_${dia}.pdf`,
            html2canvas: { scale: 2 },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
        })
        .from(iframe.contentDocument.body)
        .save()
        .then(() => iframe.remove());
    };
}

  onSnapshot(collection(db,"users"), snap => {
    totalClientesEl.textContent = snap.size;
  });





})();
