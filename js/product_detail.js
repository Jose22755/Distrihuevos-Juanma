document.addEventListener("DOMContentLoaded", () => {
  const btnAddCart = document.getElementById("btnAddCart");
  const btnBuyNow = document.getElementById("btnBuyNow");

  btnAddCart.addEventListener("click", () => {
    alert("✅ Producto agregado al carrito");
  });

  btnBuyNow.addEventListener("click", () => {
    alert("🛒 Procediendo a la compra...");
  });
});
