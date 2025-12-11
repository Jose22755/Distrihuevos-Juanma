# Sistema DistriHuevos


## Descripción del proyecto

Distrihuevos es una plataforma web diseñada para modernizar la tradicional compra de huevos. La idea principal del proyecto es trasladar un negocio de huevos, que normalmente funciona de manera presencial y manual, a un entorno digital, facilitando a los clientes realizar pedidos en línea de manera rápida y sencilla.  

La página permite a los usuarios visualizar los productos disponibles, seleccionar la cantidad deseada, agregar artículos al carrito y completar sus compras de manera ágil. Con esto, se busca acelerar los procesos de compra, ofrecer comodidad a los clientes y darle un toque moderno y digital a un negocio clásico.


## Instrucciones de instalación

Sigue estos pasos para configurar y ejecutar el proyecto Distrihuevos en tu máquina local:

---

### 1. Clonar el repositorio

Abre tu terminal y ejecuta el siguiente comando:

git clone https://github.com/Jose2275/Distrihuevos-Juanma.git

---

### 2. Abrir el proyecto en un editor

Abre la carpeta del proyecto en tu editor de código preferido, por ejemplo, **VS Code**.  
Esto te permitirá explorar los archivos HTML, CSS y JS, y hacer modificaciones si lo deseas.

---

### 3. Instalar Live Server (opcional pero recomendado)

Para visualizar la página correctamente y que los scripts funcionen, se recomienda usar la extensión **Live Server** de VS Code.  
Esta extensión permite abrir las páginas HTML en un servidor local con recarga automática.

---

### 4. Abrir las páginas

Navega a la carpeta `/html` y abre cualquier archivo `.html` usando Live Server o directamente en tu navegador:

- `index.html` → Página principal del cliente  
- `admin_login.html` → Panel de administración

---

### 5. Configurar Firebase

El proyecto utiliza Firebase para autenticación y base de datos.  
Crea un archivo `.env` en la raíz del proyecto y agrega tus credenciales:

```env
FIREBASE_API_KEY=AIzaSyBdSAJNELZLQl_IUEj3Vz_loxpIInqBdro
FIREBASE_AUTH_DOMAIN=distrihuevos-juanma.firebaseapp.com
FIREBASE_PROJECT_ID=distrihuevos-juanma
FIREBASE_STORAGE_BUCKET=distrihuevos-juanma.appspot.com
FIREBASE_MESSAGING_SENDER_ID=102253835213
FIREBASE_APP_ID=1:1022538352131:web:d471df1b8530fa9d96f036
```

---

### 6. Verificar la conexión

Una vez abiertas las páginas y configuradas las credenciales de Firebase, prueba:

- **Inicio de sesión**  
- **Registro de usuarios**  
- **Carrito de compras**  
- **Panel de administración**  

para asegurarte de que todo funciona correctamente.

---

### 7. Opcional: Personalización

Puedes modificar los estilos en la carpeta `/css` o los scripts en `/js` para adaptar el proyecto a tus necesidades.


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
| HTML | /html/login.html | Inicio de sesión cliente |
| HTML | /html/index.html | Página principal cliente |
| HTML | /html/productos.html | Catálogo de productos |
| HTML | /html/product_detail.html | Detalle de producto |
| HTML | /html/cart.html | Interfaz principal del carrito y pago |
| HTML | /html/pedidos.html | Historial de pedidos |
| HTML | /html/update_profile.html | Edición de perfil |
| HTML | /html/forgot_password.html | Recuperación de contraseña |
| HTML | /html/reset_password.html | Cambio de contraseña |
| HTML | /html/register.html | Registro de clientes |
| HTML | /html/admin_login.html | Panel de administración (todas las gestiones) |
| CSS  | /css/             | Archivos de estilos |
| JS   | /js/              | Scripts de interactividad y lógica |

**Nota:** Actualmente no se aplica MVC, pero está planeado para futuras versiones.

