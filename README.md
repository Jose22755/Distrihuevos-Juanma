Sistema DistriHuevos
Descripción del proyecto

Distrihuevos es una plataforma web para la compra de productos con carrito interactivo, métodos de pago simulados y panel de administración.

Funciones principales:

Visualizar productos y detalles.

Agregar productos al carrito y calcular subtotal/total automáticamente.

Seleccionar métodos de pago (Nequi, Bancolombia, efectivo).

Finalizar pedidos y registrar información en Firestore.

Panel administrador para gestión de productos, pedidos y logs.

Persistencia del carrito en LocalStorage.

Tecnologías utilizadas

HTML5

CSS3

JavaScript

Firebase (Auth, Firestore, Hosting)

LocalStorage

Git / GitHub

Instrucciones de instalación

Clonar el repositorio:

git clone https://github.com/TU_USUARIO/NOMBRE_REPOSITORIO.git


Abrir el proyecto en VS Code o cualquier editor.

Abrir páginas desde la carpeta /HTML con Live Server o navegador.

Configurar variables de entorno de Firebase en .env:

FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=...
FIREBASE_PROJECT_ID=...
FIREBASE_STORAGE_BUCKET=...
FIREBASE_MESSAGING_SENDER_ID=...
FIREBASE_APP_ID=...

Versión del proyecto

Versión actual: 1.0

Funcionalidad básica: login, registro, catálogo, carrito, pedidos y panel administrador.

Organización actual: carpetas /HTML, /CSS, /JS.

Arquitectura MVC planeada para futuras versiones.

Integrantes

Johan Sánchez – Desarrollo del proyecto, diseño de interfaces y conexión a Firebase.

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

Seguridad y cumplimiento

Cumple Ley Habeas Data (Colombia).

Solo se almacenan datos necesarios (nombre, correo y teléfono).

Firebase Authentication con cifrado.

Acceso a administrador restringido.

Validaciones de entrada para evitar datos corruptos.

Conclusión

Distrihuevos entrega una plataforma funcional, segura y responsive, con carrito interactivo, panel administrativo y persistencia en tiempo real.
La integración con Firebase permite simplificar el backend y mantener un control eficiente de productos, pedidos y usuarios.

💡 Tip para tu commit:
Cuando subas esto a GitHub, un buen mensaje sería:

git add README.md
git commit -m "README completo: descripción, tecnologías, rutas, versión e integrantes"
git push


Esto deja claro en el historial de commits que agregaste el README profesional y completo.
