Sistema DistriHuevos JUANMA

Descripción del proyecto

Distrihuevos es una plataforma web para la compra de productos con carrito interactivo, métodos de pago simulados y panel de administración.

Funciones principales:

Visualizar productos y detalles.

Agregar al carrito y calcular subtotal/total automáticamente.

Seleccionar métodos de pago (Nequi, Bancolombia, efectivo).

Finalizar pedidos y registrar información en Firestore.

Panel administrador para gestión de productos, pedidos y logs.

Persistencia del carrito en LocalStorage.

Tecnologías utilizadas

HTML5, CSS3, JavaScript

Firebase (Auth, Firestore, Hosting)

LocalStorage

Git / GitHub

Instrucciones de instalación

Clonar el repositorio:

git clone https://github.com/TU_USUARIO/NOMBRE_REPOSITORIO.git


Abrir en VS Code.

Abrir páginas desde /HTML con Live Server o navegador.

Configurar variables de entorno de Firebase en .env:

FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=...
FIREBASE_PROJECT_ID=...
FIREBASE_STORAGE_BUCKET=...
FIREBASE_MESSAGING_SENDER_ID=...
FIREBASE_APP_ID=...

Versión del proyecto

Versión: 1.0

Funcionalidad básica completa: login, registro, catálogo, carrito, pedidos y panel administrador.

Organización actual: carpetas /HTML, /CSS, /JS.

MVC planeado para futuras versiones.

Integrantes

Johan Sánchez – Desarrollo, interfaces y conexión a Firebase.

Estructura y rutas principales
Tipo	Archivo / Carpeta	Descripción
HTML	/HTML/login.html	Inicio de sesión cliente
HTML	/HTML/index.html	Página principal cliente
HTML	/HTML/productos.html	Catálogo de productos
HTML	/HTML/product_detail.html	Detalle de producto
HTML	/HTML/cart.html	Interfaz principal del carrito y pago
HTML	/HTML/pedidos.html	Historial de pedidos
HTML	/HTML/update_profile.html	Edición de perfil
HTML	/HTML/forgot_password.html	Recuperación de contraseña
HTML	/HTML/reset_password.html	Cambio de contraseña
HTML	/HTML/register.html	Registro de clientes
HTML	/HTML/admin_login.html	Panel de administración (todas las gestiones)
CSS	/CSS/	Archivos de estilos
JS	/JS/	Scripts de interactividad y lógica

Nota: Actualmente no se aplica MVC, pero está planeado para futuras versiones.
