# Sistema DistriHuevos


## Descripción del proyecto

Distrihuevos es una plataforma web diseñada para modernizar la tradicional compra de huevos. La idea principal del proyecto es trasladar un negocio de huevos, que normalmente funciona de manera presencial y manual, a un entorno digital, facilitando a los clientes realizar pedidos en línea de manera rápida y sencilla.  

La página permite a los usuarios visualizar los productos disponibles, seleccionar la cantidad deseada, agregar artículos al carrito y completar sus compras de manera ágil. Con esto, se busca acelerar los procesos de compra, ofrecer comodidad a los clientes y darle un toque moderno y digital a un negocio clásico.


## Instrucciones de instalación

- Abrir el proyecto en VS Code o cualquier editor.
- Abrir páginas desde la carpeta `/HTML` con Live Server o navegador.
- Configurar variables de entorno de Firebase en `.env`:

FIREBASE_API_KEY=AIzaSyBdSAJNELZLQl_IUEj3Vz_loxpIInqBdro

FIREBASE_AUTH_DOMAIN=distrihuevos-juanma.firebaseapp.com

FIREBASE_PROJECT_ID=distrihuevos-juanma

FIREBASE_STORAGE_BUCKET=distrihuevos-juanma.appspot.com

FIREBASE_MESSAGING_SENDER_ID=1022538352131

FIREBASE_APP_ID=1:1022538352131:web:d471df1b8530fa9d96f036


## Versión del proyecto

- Versión actual: 1.0
- Estado del desarrollo: Estable, funcional y listo para demostración
- Funcionalidad básica: login, registro, catálogo, carrito, pedidos y panel administrador.
- Organización actual: carpetas `/html`, `/css`, `/js`.
- Arquitectura MVC planeada para futuras versiones.
- Funcionalidades implementadas:
  - Registro e inicio de sesión de clientes
  - Catálogo de productos y detalle de cada producto
  - Carrito de compras interactivo con cálculo automático de totales
  - Selección de métodos de pago reales (Nequi, Bancolombia, efectivo)
  - Finalización de pedidos y registro en Firestore
  - Panel de administración para gestión de productos, pedidos, clientes, reportes y ventas.
  - Persistencia del carrito usando LocalStorage

## Integrantes

- **Johan Pradilla** – Desarrollo de casi toda la codificación del proyecto, conexión con Firebase y elaboración de los documentos de sustentación.
- **Diego Paba** – Diseño de interfaces y prototipos en Figma.
- **Brayan Claro** – Levantamiento de requisitos y apoyo en la parte del diseño.

## Estructura y rutas principales

| Tipo | Archivo / Carpeta | Descripción |
|------|-----------------|------------|
| HTML | /HTML/login.html | Inicio de sesión cliente |
| HTML | /HTML/index.html | Página principal cliente |
| HTML | /HTML/productos.html | Catálogo de productos |
| HTML | /HTML/product_detail.html | Detalle de producto |
| HTML | /HTML/cart.html | Interfaz principal del carrito y pago |
| HTML | /HTML/pedidos.html | Historial de pedidos |
| HTML | /HTML/update_profile.html | Edición de perfil |
| HTML | /HTML/forgot_password.html | Recuperación de contraseña |
| HTML | /HTML/reset_password.html | Cambio de contraseña |
| HTML | /HTML/register.html | Registro de clientes |
| HTML | /HTML/admin_login.html | Panel de administración (todas las gestiones) |
| CSS  | /CSS/             | Archivos de estilos |
| JS   | /JS/              | Scripts de interactividad y lógica |

**Nota:** Actualmente no se aplica MVC, pero está planeado para futuras versiones.

