# Sistema DistriHuevos

## Instrucciones de instalación

- Abrir el proyecto en VS Code o cualquier editor.
- Abrir páginas desde la carpeta `/HTML` con Live Server o navegador.
- Configurar variables de entorno de Firebase en `.env`:

FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=...
FIREBASE_PROJECT_ID=...
FIREBASE_STORAGE_BUCKET=...
FIREBASE_MESSAGING_SENDER_ID=...
FIREBASE_APP_ID=...

less
Copiar código

## Versión del proyecto

- Versión actual: 1.0
- Funcionalidad básica: login, registro, catálogo, carrito, pedidos y panel administrador.
- Organización actual: carpetas `/HTML`, `/CSS`, `/JS`.
- Arquitectura MVC planeada para futuras versiones.

## Integrantes

- Johan Sánchez 
- Diego Paba
- Brayan Claro

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

## Seguridad y cumplimiento

- Cumple Ley Habeas Data (Colombia).
- Solo se almacenan datos necesarios (nombre, correo y teléfono).
- Firebase Authentication con cifrado.
- Acceso a administrador restringido.
- Validaciones de entrada para evitar datos corruptos.

## Conclusión

Distrihuevos entrega una plataforma funcional, segura y responsive, con carrito interactivo, panel administrativo y persistencia en tiempo real.  
La integración con Firebase permite simplificar el backend y mantener un control eficiente de productos, pedidos y usuarios.
