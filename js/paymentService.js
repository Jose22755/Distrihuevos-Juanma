// ../js/paymentService.js
import { db } from "../js/firebase-config.js";
import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

class PaymentService {
  constructor(provider) {
    this.provider = provider;
  }

  async createPayment({ usuario, carrito, metodoPago, referencia }) {
    return await this.provider.createPayment({
      usuario,
      carrito,
      metodoPago,
      referencia,
    });
  }
}

class MockProvider {
  async createPayment({ usuario, carrito, metodoPago, referencia }) {
    // 📦 Calcular total del pedido
    const total = carrito.reduce((acc, i) => acc + i.precio * i.cantidad, 0);

    // 🔢 Generar número consecutivo (PED-1, PED-2, etc.)
    const pedidosSnapshot = await getDocs(collection(db, "pedidos"));
    const pedidoNumero = pedidosSnapshot.size + 1;
    const codigoPedido = `PED-${pedidoNumero}`;

    // 💰 Estado del pago según método
    const estado =
      metodoPago === "efectivo"
        ? "pendiente"
        : metodoPago === "nequi" || metodoPago === "bancolombia"
        ? "pago en proceso"
        : "pagado";

    // 🧾 Crear documento con ID = "PED-1", "PED-2", etc.
    const refPedido = doc(db, "pedidos", codigoPedido);
    await setDoc(refPedido, {
      pedidoNumero,
      codigoPedido,
      usuario,
      items: carrito,
      total,
      fecha: new Date().toISOString(),
      metodoPago,
      referenciaPago: referencia || "N/A",
      estado,
    });

    // 🧹 Borrar el carrito del usuario
    await deleteDoc(doc(db, "carritos", usuario));

    return {
      ok: true,
      message: `✅ Pedido ${codigoPedido} registrado exitosamente`,
      pedidoNumero: codigoPedido,
    };
  }
}

// Exporta la instancia
export const paymentService = new PaymentService(new MockProvider());
