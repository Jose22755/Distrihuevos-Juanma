import { db } from "../js/firebase-config.js";
import { collection, onSnapshot, getDocs} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

(() => {
  // === DOM ===
  const totalPedidos = document.getElementById("totalPedidos");
  const totalClientes = document.getElementById("totalClientes");
  const totalVentas = document.getElementById("totalVentas");
  const totalProductos = document.getElementById("totalProductos");
  const graficoVentas = document.getElementById("graficoVentas");
  const graficoVentasDiarias = document.getElementById("graficoVentasDiarias");
  const top5Productos = document.getElementById("top5Productos");

  // Muestra "Reportes hoy 28 de noviembre" dinámicamente
const fechaSpan = document.getElementById("fechaHoy");
const fecha = new Date();
const opciones = { day: 'numeric', month: 'long' };
fechaSpan.textContent = `Reportes hoy ${fecha.toLocaleDateString('es-CO', opciones)}`;

let chartCategorias = null;
  let chartVentas = null;
  let chartVentasDiarias = null;

  const stockActual = {};
  let ventasPorProducto = {};
  let totalProdVendidos = 0;
  let sumaVentas = 0;
  let growthLabel = "—";  // 👈 hacemos que exista en todo el IIFE

// Fecha de hoy en Colombia (sin hora)
const hoy = new Date();
hoy.setHours(0,0,0,0); // resetea hora, minuto, segundo, milisegundos

const dias = [];
const ventasUltimos7Dias = {};
for (let i = 6; i >= 0; i--) {
  const f = new Date();
  f.setDate(f.getDate() - i);

  const diaStr =
    f.getFullYear() +
    "-" +
    String(f.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(f.getDate()).padStart(2, "0");

  dias.push(diaStr);
  ventasUltimos7Dias[diaStr] = 0;
}

  // ===== Funciones gráficos y top 5 =====
  function actualizarGraficoVentas() {
    const etiquetas = Object.keys(ventasPorProducto);
    const cantidades = Object.values(ventasPorProducto);
    const colores = etiquetas.map((_, i) => `hsl(${i * 360 / etiquetas.length}, 70%, 50%)`);

    if (!graficoVentas) return;

    if (chartVentas) {
      chartVentas.data.labels = etiquetas;
      chartVentas.data.datasets[0].data = cantidades;
      chartVentas.data.datasets[0].backgroundColor = colores;
      chartVentas.update();
    } else {
      chartVentas = new Chart(graficoVentas, {
        type: "bar",
        data: { labels: etiquetas, datasets: [{ label: "Unidades vendidas Hoy", data: cantidades, backgroundColor: colores, borderColor: colores.map(c => c.replace("50%","40%")), borderWidth: 1 }] },
        options: { responsive: true, scales: { y: { beginAtZero:true } }, plugins: { legend: { display:false }, datalabels:{ anchor:'end', align:'end', color:'#000', font:{weight:'bold'}, formatter:v=>v } } },
        plugins: [ChartDataLabels]
      });
    }
  }

  function actualizarTop5() {
    const top = Object.entries(ventasPorProducto).sort((a,b)=>b[1]-a[1]).slice(0,5);
    top5Productos.innerHTML = "";
    top.forEach(([nombre, cant]) => {
      const li = document.createElement("li");
      li.className = "list-group-item d-flex justify-content-between align-items-center";
      li.textContent = nombre;
      const span = document.createElement("span");
      span.className = "badge bg-primary rounded-pill";
      span.textContent = cant;
      li.appendChild(span);
      top5Productos.appendChild(li);
    });
  }

  function actualizarGraficoUltimos7Dias() {
    const etiquetas = Object.keys(ventasUltimos7Dias);
    const cantidades = Object.values(ventasUltimos7Dias);
    if (!graficoVentasDiarias) return;

    if (chartVentasDiarias) {
      chartVentasDiarias.data.labels = etiquetas;
      chartVentasDiarias.data.datasets[0].data = cantidades;
      chartVentasDiarias.update();
    } else {
      chartVentasDiarias = new Chart(graficoVentasDiarias, {
        type:"bar",
        data:{ labels: etiquetas, datasets:[{ label:"Ventas últimos 7 días ($)", data:cantidades, backgroundColor:"#0d6efd", borderColor:"#0a58ca", borderWidth:1 }]},
        options:{ responsive:true, scales:{ y:{ beginAtZero:true }}, plugins:{ legend:{ display:false }, datalabels:{ anchor:'end', align:'end', color:'#000', font:{weight:'bold'}, formatter:v=>`$${v.toLocaleString('es-CO')}`} } },
        plugins:[ChartDataLabels]
      });
    }
  }

  function actualizarStock(stockPorProducto){
    Object.keys(stockPorProducto).forEach(nombre=>{
      if(stockActual[nombre]!==undefined && stockActual[nombre]===0 && stockPorProducto[nombre]>0){
        ventasPorProducto[nombre]=0;
      }
      if(!(nombre in ventasPorProducto)) ventasPorProducto[nombre]=0;
      stockActual[nombre]=stockPorProducto[nombre];
    });
    actualizarGraficoVentas();
    actualizarTop5();
  }

function renderCategoriasChart(dataCategorias) {
  const ctx = document.getElementById("chartCategorias");

  if (!ctx) return;

  if (chartCategorias) chartCategorias.destroy();

  const colores = dataCategorias.map((_, i) =>
    `hsl(${(i * 360) / dataCategorias.length}, 70%, 55%)`
  );

  chartCategorias = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: dataCategorias.map(c => c.categoria),
      datasets: [
        {
          data: dataCategorias.map(c => c.porcentaje),
          backgroundColor: colores,
          borderColor: "#fff",
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "60%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            font: { size: 13 }
          }
        },
        datalabels: {
          color: "#000",
          font: { weight: "bold", size: 12 },
          formatter: function(value, context) {
            return value + "%"; // <-- Aquí agregamos el porcentaje
          }
        }
      }
    },
    plugins: [ChartDataLabels] // asegurarse de incluir el plugin
  });
}

// 🔥 AGREGA TU FUNCIÓN AQUÍ
async function cargarCategoriasChart() {
  try {
    const productosSnap = await getDocs(collection(db, "products"));
    const pedidosSnap = await getDocs(collection(db, "pedidos"));

    const productoInfo = {};
    productosSnap.forEach(doc => {
      const p = doc.data();
      productoInfo[doc.id] = {
        nombre: p.nombre,
        categoria: p.Categoria || p.categoria || "Sin categoría"
      };
    });

    const categoriasCount = {};

    pedidosSnap.forEach(doc => {
      const pedido = doc.data();
      if (!pedido.items) return;

      pedido.items.forEach(item => {
        const info = productoInfo[item.id];

        if (!info) return;
        const categoria = info.categoria;

        categoriasCount[categoria] =
          (categoriasCount[categoria] || 0) + (item.cantidad || 0);
      });
    });

    const totalVendidos = Object.values(categoriasCount).reduce((a, b) => a + b, 0);

    const dataCategorias = Object.keys(categoriasCount).map(cat => ({
      categoria: cat,
      porcentaje: totalVendidos === 0 ? 0 : ((categoriasCount[cat] / totalVendidos) * 100).toFixed(1)
    }));

    renderCategoriasChart(dataCategorias);

  } catch (error) {
    console.error("Error cargando categorías:", error);
  }
}

  let pedidosHoy = 0;

  // ===== Firestore en tiempo real =====
  onSnapshot(collection(db,"pedidos"), snap=>{
    sumaVentas=0;
    totalProdVendidos=0;
    ventasPorProducto={};
    dias.forEach(d=>ventasUltimos7Dias[d]=0);

    pedidosHoy = 0; // 🟢 reiniciar el contador


snap.forEach(doc => {
  const p = doc.data();

  // 🛑 Ignorar pedidos cancelados (no cuentan como venta NI como producto vendido)
  const estado = String(p.estado || "").toLowerCase();
  if (estado === "cancelado") {
    return;
  }

  // ================================
  // 🕒 Fecha del pedido
  // ================================
  const fechaPedido = new Date(p.fecha);
  const fechaStr =
    fechaPedido.getFullYear() + "-" +
    String(fechaPedido.getMonth() + 1).padStart(2, "0") + "-" +
    String(fechaPedido.getDate()).padStart(2, "0");

  // ================================
  // 📌 Pedidos de HOY
  // ================================
  if (fechaPedido >= hoy) {
    pedidosHoy++;

    // Contar productos vendidos
    (p.items || []).forEach(item => {
      const nombre = item.nombre || "Sin nombre";
      const cant = Number(item.cantidad || 0);

      ventasPorProducto[nombre] = (ventasPorProducto[nombre] || 0) + cant;
      totalProdVendidos += cant;
    });

    // Sumar dinero vendido hoy
    sumaVentas += Number(p.total || 0);
  }

  // ================================
  // 📌 Ventas de los últimos 7 días
  // ================================
  if (ventasUltimos7Dias.hasOwnProperty(fechaStr)) {
    ventasUltimos7Dias[fechaStr] += Number(p.total || 0);
  }

});

    // --- Después de procesar todos los pedidos dentro de snap.forEach(...) ---

// calcular fecha hoy y ayer (formato YYYY-MM-DD)
const hoyStr = (() => {
  const d = new Date();
  d.setHours(0,0,0,0);
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
})();
const ayer = new Date();
ayer.setDate(ayer.getDate() - 1);
const ayerStr = ayer.getFullYear() + "-" + String(ayer.getMonth()+1).padStart(2,"0") + "-" + String(ayer.getDate()).padStart(2,"0");

// acumular ventas de hoy y ayer
let ventasHoy = 0;
let ventasAyer = 0;
snap.forEach(doc => {
  const p = doc.data();

  // 🛑 Ignorar pedidos cancelados en la tasa de crecimiento
  const estado = String(p.estado || "").toLowerCase();
  if (estado === "cancelado") {
    return;
  }

  const fechaPedido = new Date(p.fecha);
  const fechaStr =
    fechaPedido.getFullYear() + "-" +
    String(fechaPedido.getMonth() + 1).padStart(2,"0") + "-" +
    String(fechaPedido.getDate()).padStart(2,"0");

  // si el pedido es de hoy
  if (fechaStr === hoyStr) {
    ventasHoy += Number(p.total || 0);
  }

  // si el pedido es de ayer
  if (fechaStr === ayerStr) {
    ventasAyer += Number(p.total || 0);
  }
});


// calcular tasa de crecimiento (evitar división por cero)
let growthRate = 0;
let growthLabel = "—";
if (ventasAyer > 0) {
  growthRate = ((ventasHoy - ventasAyer) / ventasAyer) * 100;
  growthLabel = (growthRate >= 0 ? "▲ +" : "▼ ") + Math.abs(growthRate).toFixed(1) + "% respecto a ayer";
} else {
  // si ayer no hubo ventas mostramos cambio absoluto
  if (ventasHoy > 0) growthLabel = "▲ +100% (no hubo ventas ayer)";
  else growthLabel = "Sin cambios";
}

// actualizar el DOM (elementos que agregaste en HTML)
if (fechaSpan) fechaSpan.textContent = `Reportes hoy ${new Date().toLocaleDateString("es-CO", { day: "numeric", month: "long" })}`;

const growthEl = document.getElementById("growthRate");
const growthSub = document.getElementById("growthSub");
if (growthEl) {
  growthEl.textContent = growthLabel;
  // clase visual dependiendo positivo/negativo
  growthEl.classList.remove("text-success","text-danger");
  if (growthRate > 0) growthEl.classList.add("text-success");
  else if (growthRate < 0) growthEl.classList.add("text-danger");
}
if (growthSub) growthSub.textContent = `Ventas hoy: $${ventasHoy.toLocaleString('es-CO')} • Pedidos hoy: ${pedidosHoy}`;


    totalVentas.textContent = sumaVentas.toLocaleString("es-CO");
    totalProductos.textContent = totalProdVendidos;
    totalPedidos.textContent = pedidosHoy;  // 🟢 Aquí va
    
    actualizarGraficoVentas();
    actualizarGraficoUltimos7Dias();
    actualizarTop5();

  });



onSnapshot(collection(db, "users"), snap => {
  let clientesHoy = 0;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  snap.forEach(doc => {
    const u = doc.data();

    if (!u.fecha_registro) return;

    const fecha = new Date(u.fecha_registro.seconds * 1000);

    fecha.setHours(0, 0, 0, 0);

    if (fecha.getTime() === hoy.getTime()) {
      clientesHoy++;
    }
  });

  totalClientes.textContent = clientesHoy;
});

  onSnapshot(collection(db,"products"), snap=>{
    const stockPorProducto={};
    snap.forEach(doc=>{ const p=doc.data(); stockPorProducto[p.Nombre]=Number(p.Stock||0) });
    actualizarStock(stockPorProducto);
  });

  // ===== Clickables en tarjetas =====
  const cardTotalPedidos = document.querySelector(".bg-gradient-pedidos");
  const cardTotalClientes = document.querySelector(".bg-gradient-clientes");
  const cardTotalVentas = document.querySelector(".bg-gradient-ventas");
  const cardTotalProductos = document.querySelector(".bg-gradient-productos");

  function mostrarSeccion(id){
    document.querySelectorAll(".section").forEach(sec=>sec.classList.remove("active"));
    const s = document.getElementById(id);
    if(s) s.classList.add("active");
    s?.scrollIntoView({behavior:"smooth"});

    document.querySelectorAll(".menu li").forEach(li=>li.classList.remove("active"));
    const menuItem = document.querySelector(`.menu li[data-section="${id}"]`);
    if(menuItem) menuItem.classList.add("active");
  }

  if(cardTotalPedidos) cardTotalPedidos.addEventListener("click",()=>mostrarSeccion("pedidos"));
  if(cardTotalClientes) cardTotalClientes.addEventListener("click",()=>mostrarSeccion("clientes"));
  if(cardTotalVentas) cardTotalVentas.addEventListener("click",()=>mostrarSeccion("ventas"));
  if(cardTotalProductos) cardTotalProductos.addEventListener("click",()=>mostrarSeccion("productos"));

  cargarCategoriasChart();
// ===== PDF diario =====
const btnPDF = document.getElementById("btnPDF");

btnPDF?.addEventListener("click", async () => {
  const fechaRep = document.getElementById("fechaReporte");
  const ventasRep = document.getElementById("ventasReporte");
  const pedidosRep = document.getElementById("pedidosReporte");
  const growthRep = document.getElementById("growthReporte");
  const productosRep = document.getElementById("productosReporte"); // total productos vendidos
  const ulCategorias = document.getElementById("ventasCategoriasReporte");

  // Colocar fecha y ventas totales
  fechaRep.textContent = new Date().toLocaleDateString("es-CO", { day:"numeric", month:"long", year:"numeric" });
  ventasRep.textContent = sumaVentas.toLocaleString("es-CO");
  pedidosRep.textContent = pedidosHoy;
  productosRep.textContent = totalProdVendidos; // total productos vendidos

  // Recalcular growth y categorías desde los pedidos
  const productosSnap = await getDocs(collection(db, "products"));
  const pedidosSnap = await getDocs(collection(db, "pedidos"));

  const productoInfo = {};
  productosSnap.forEach(doc => {
    const p = doc.data();
    productoInfo[doc.id] = { nombre: p.nombre, categoria: p.Categoria || p.categoria || "Sin categoría" };
  });

  let ventasHoyPDF = 0;
  let ventasAyerPDF = 0;
  const categoriasCount = {};

  const hoy = new Date();
  hoy.setHours(0,0,0,0);
  const ayer = new Date();
  ayer.setDate(hoy.getDate() - 1);

  const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,"0")}-${String(hoy.getDate()).padStart(2,"0")}`;
  const ayerStr = `${ayer.getFullYear()}-${String(ayer.getMonth()+1).padStart(2,"0")}-${String(ayer.getDate()).padStart(2,"0")}`;

  pedidosSnap.forEach(doc => {
    const p = doc.data();
    const fechaPedido = new Date(p.fecha);
    const fechaStr = `${fechaPedido.getFullYear()}-${String(fechaPedido.getMonth()+1).padStart(2,"0")}-${String(fechaPedido.getDate()).padStart(2,"0")}`;

    if (fechaStr === hoyStr) ventasHoyPDF += Number(p.total || 0);
    if (fechaStr === ayerStr) ventasAyerPDF += Number(p.total || 0);

    (p.items || []).forEach(item => {
      const info = productoInfo[item.id];
      if (!info) return;
      const categoria = info.categoria;
      categoriasCount[categoria] = (categoriasCount[categoria] || 0) + (item.cantidad || 0);
    });
  });

  // calcular growth
  let growthLabelPDF = "—";
  if (ventasAyerPDF > 0) {
    const growthRatePDF = ((ventasHoyPDF - ventasAyerPDF) / ventasAyerPDF) * 100;
    growthLabelPDF = (growthRatePDF >= 0 ? "▲ +" : "▼ ") + Math.abs(growthRatePDF).toFixed(1) + "% respecto a ayer";
  } else {
    growthLabelPDF = ventasHoyPDF > 0 ? "▲ +100% (no hubo ventas ayer)" : "Sin cambios";
  }
  growthRep.textContent = growthLabelPDF;

  // limpiar y llenar categorías
  ulCategorias.innerHTML = "";
  Object.entries(categoriasCount).forEach(([cat,val]) => {
    const li = document.createElement("li");
    li.textContent = `${cat}: ${val} unidades`;
    ulCategorias.appendChild(li);
  });

  // Mostrar temporalmente el div para generar PDF
  const reporte = document.getElementById("reporteDiario");
  reporte.style.display = "block";

  html2pdf()
    .set({
      margin: 10,
      filename: `reporte_${new Date().toISOString().slice(0,10)}.pdf`,
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    })
    .from(reporte)
    .save()
    .finally(() => { reporte.style.display = "none"; });
});
})();

