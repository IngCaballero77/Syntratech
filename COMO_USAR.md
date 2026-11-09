# Syntratech — Cómo usar este proyecto

Tienda de productos de limpieza con React + Vite + Supabase.
Roles: **Administrador**, **Proveedor** y **Cliente**.

---

## 1. Abrir y ejecutar en Antigravity (o Visual Studio Code)

1. Abre Antigravity → **File → Open Folder** → elige esta carpeta `Syntratech`.
2. Abre la terminal integrada (**Terminal → New Terminal**) y ejecuta:

   ```bash
   npm install
   npm run dev
   ```

3. Abre en el navegador: http://localhost:5173

Para mostrar la web sin tocar la base real: `npm run demo` → http://localhost:5174 (modo demostración,
datos guardados solo en el navegador).

También puedes usar **Terminal → Run Task** y elegir *Syntratech: instalar* y luego *Syntratech: iniciar*.

> Requisito: tener Node.js 18 o superior instalado (https://nodejs.org).

---

## 2. Base de datos (Supabase)

La conexión ya está configurada en el archivo `.env`:

```env
VITE_SUPABASE_URL=https://puahkazmnyqzqtiueose.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

El cliente está en `src/lib/supabaseClient.js`. La base ya está creada y con datos.

Si algún día necesitas recrearla desde cero, en Supabase → **SQL Editor** ejecuta en este orden:

1. `supabase/migrations/0001_esquema_completo.sql` → tablas, seguridad (RLS), funciones y productos.
2. `supabase/seed/0002_cuentas_de_prueba.sql` → 1 admin, 10 clientes y 20 proveedores.
3. `supabase/migrations/0003_gestion_usuarios.sql` → permite que el administrador cree usuarios desde la web.

La contraseña de las cuentas de prueba está en `supabase/seed/CUENTAS_DE_PRUEBA.md` (**no compartir**).

### Qué puede hacer cada rol

| Rol | Puede |
|---|---|
| Cliente | Ver catálogo, comprar, ver y cancelar sus pedidos pendientes |
| Proveedor | Ver inventario, registrar ingresos de stock, crear productos (no ve datos de clientes) |
| Administrador | Todo: pedidos, guías de envío, inventario, auditoría, borrar productos |

### Crear administradores, proveedores o clientes desde la web

Entra como administrador → **Panel de Gestión → pestaña Usuarios**. Llena nombre, correo, teléfono,
ciudad, dirección, rol y contraseña inicial (o pulsa **Generar**) y presiona **Crear**. La cuenta queda
activa de inmediato. En la misma lista puedes cambiar el rol de cualquier persona.

También puedes cambiar un rol desde el SQL Editor:

```sql
update public.profiles set role = 'admin' where email = 'correo@ejemplo.com';
```

---

## 3. Publicar en Netlify

El archivo `netlify.toml` ya trae la configuración (compila con `npm run build`, publica `dist` y redirige las rutas).

### Opción A — Arrastrar y soltar (más rápida)

1. En la terminal: `npm run build` (crea la carpeta `dist`).
2. Entra a https://app.netlify.com/drop e inicia sesión.
3. Arrastra la carpeta **`dist`** a la página. Netlify te da un enlace público.

### Opción B — Conectado a GitHub (se actualiza solo)

1. Sube esta carpeta a un repositorio de GitHub (el `.gitignore` ya excluye `node_modules`, `dist` y las contraseñas de prueba).
2. En Netlify: **Add new site → Import an existing project → GitHub** → elige el repositorio.
3. Netlify detecta `netlify.toml`. En **Site configuration → Environment variables** agrega:
   - `VITE_SUPABASE_URL` = `https://puahkazmnyqzqtiueose.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = la clave de tu `.env`
4. **Deploy site**.

### Después de publicar (importante)

En Supabase → **Authentication → URL Configuration**, cambia **Site URL** por el enlace de Netlify
(por ejemplo `https://syntratech.netlify.app`) para que los correos de confirmación apunten a tu sitio.

---

## 4. Recuperar contraseña e ingreso con redes sociales

### Recuperar contraseña

En **Ingresar → "¿Olvidaste tu contraseña?"** la persona escribe su correo y recibe un enlace.
Ese enlace abre `/restablecer-contrasena`, donde crea la nueva contraseña.

Para que el enlace funcione, en Supabase → **Authentication → URL Configuration**:

- **Site URL:** el enlace de Netlify (por ejemplo `https://syntratech.netlify.app`).
- **Redirect URLs:** agrega
  - `http://localhost:5173/**`
  - `https://TU-SITIO.netlify.app/**`

> El servicio de correo gratuito de Supabase envía pocos correos por hora. Para producción conviene
> configurar un SMTP propio en **Authentication → Emails → SMTP Settings**.

### Ingreso con Google, Facebook, X, LinkedIn y Apple

Los botones ya están en la pantalla de ingreso. Cada red se activa una vez en Supabase →
**Authentication → Sign In / Providers**: se abre la red, se activa y se pegan el **Client ID** y el
**Client Secret** que da la consola de desarrolladores de esa red. En esa consola hay que registrar como
"Redirect / Callback URL":

```
https://puahkazmnyqzqtiueose.supabase.co/auth/v1/callback
```

| Red | Dónde se obtienen las claves |
|---|---|
| Google | https://console.cloud.google.com → APIs y servicios → Credenciales → ID de cliente OAuth (tipo "Aplicación web") |
| Facebook | https://developers.facebook.com → Crear app → Inicio de sesión con Facebook |
| X (Twitter) | https://developer.x.com → Proyecto → App → User authentication settings |
| LinkedIn | https://www.linkedin.com/developers → Crear app → producto "Sign In with LinkedIn using OpenID Connect" (en Supabase: **LinkedIn (OIDC)**) |
| Apple | https://developer.apple.com → Certificates, IDs & Profiles (requiere cuenta de pago de Apple Developer) |

Mientras una red no esté activada, su botón muestra el aviso "aún no está activado". Las personas que
entran con una red social quedan como **Cliente**; el administrador puede cambiarles el rol en la
pestaña **Usuarios**.

### TikTok

Supabase **no incluye TikTok** como proveedor de ingreso. Se puede agregar más adelante con una función
propia (Edge Function) que haga el intercambio con la API "Login Kit" de TikTok, pero requiere aprobar
una app en https://developers.tiktok.com y desarrollo adicional.

---

## 5. Estructura

```text
src/
  components/   Navbar, Footer, ProtectedRoute, Toast
  context/      AuthContext (sesión y roles), CartContext, StoreContext (datos)
  lib/          supabaseClient.js, format.js
  pages/        Home, Catálogo, Producto, Carrito, Checkout, Pedidos, Panel, Login
supabase/
  migrations/   0001_esquema_completo.sql
  seed/         0002_cuentas_de_prueba.sql
public/         logo, imagen principal, _redirects
netlify.toml    configuración de Netlify
```

## 6. Seguridad

Las tablas tienen **RLS activado con políticas por rol**. No lo desactives: la clave publicable va
dentro de la página y, sin RLS, cualquier persona podría leer los datos de los usuarios o cambiar
precios y stock.
