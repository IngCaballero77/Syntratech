# 🚀 Syntratech - Tienda Virtual y Aplicación Web Comunitaria

Plataforma integral orientada a facilitar la comercialización de productos, gestión de existencias en tiempo real, trazabilidad de pedidos y logística comunitaria.

---

## 🛠️ Pila Tecnológica
- **Frontend:** React 18 + Vite (JavaScript ES Modules, sin TypeScript).
- **Enrutamiento:** React Router 6.
- **Estilos:** Tailwind CSS con diseño adaptativo mobile-first y paleta corporativa oficial (Sky-600 `#0284c7`, Slate-900 `#0f172a`, Slate-50 `#f8fafc`).
- **Base de Datos & Backend:** Supabase (PostgreSQL, Auth, RLS y Migraciones estructuradas).
- **Iconografía:** Lucide React.

---

## 👥 Roles de Usuario y RBAC
El sistema cuenta con un control de acceso estricto basado en roles (Row Level Security):
1. **Administrador (`admin`):** Control total, creación y edición de productos, ajuste global de existencias, auditoría y panel analítico de ingresos.
2. **Proveedor (`proveedor`):** Abastecimiento: registra ingresos de inventario, crea productos y consulta existencias (sin ver datos de clientes).
3. **Cliente (`cliente`):** Navegación del catálogo, validación de stock en tiempo real, compras sin sobreventa y seguimiento del estado de sus órdenes.

> 💡 **Selector Rápido de Rol en Desarrollo:** En la barra superior de navegación puedes alternar entre Administrador, Operador y Cliente con un solo clic para verificar el comportamiento de cada interfaz.

---

## 📋 Estructura del Proyecto

```text
├── supabase/
│   └── migrations/
│       ├── 0001_initial_schema.sql  # Tablas, claves foráneas, triggers de auditoría
│       ├── 0002_rls_policies.sql    # Políticas estrictas RLS por rol
│       └── 0003_seed_data.sql       # Categorías y productos muestra
├── src/
│   ├── components/
│   │   ├── common/                  # Componentes reutilizables (ProtectedRoute, etc.)
│   │   └── layout/                  # Navbar, Footer y barras de navegación
│   ├── context/
│   │   ├── AuthContext.jsx          # Manejo de sesión, RBAC y conmutador de roles
│   │   ├── CartContext.jsx          # Carrito con control estricto de existencias
│   │   └── StoreContext.jsx         # Transacciones, órdenes, inventario y auditoría
│   ├── lib/
│   │   ├── mockData.js              # Datos iniciales y persistencia local para desarrollo
│   │   └── supabase.js              # Cliente Supabase seguro (únicamente claves públicas)
│   ├── pages/
│   │   ├── AdminDashboard.jsx       # Panel operativo (Admin / Operador)
│   │   ├── CartPage.jsx             # Carrito de compras y cálculo de totales
│   │   ├── CatalogPage.jsx          # Catálogo con búsqueda, filtros y ordenación
│   │   ├── CheckoutPage.jsx         # Formulario de envío y confirmación
│   │   ├── HomePage.jsx             # Landing page y categorías destacadas
│   │   ├── LoginPage.jsx            # Autenticación y accesos rápidos de prueba
│   │   ├── OrdersPage.jsx           # Historial y barra de trazabilidad logística
│   │   └── ProductDetailPage.jsx   # Vista de producto con tope de unidades por stock
│   ├── App.jsx                      # Rutas de la aplicación
│   ├── index.css                    # Directivas de Tailwind CSS
│   └── main.jsx                     # Punto de entrada
├── AGENTS.md                        # Reglas del proyecto
├── DATABASE.md                      # Modelo conceptual de datos
├── DESIGN.md                        # Guía de estilos y paleta visual
├── REQUISITOS.md                    # Requisitos funcionales y reglas de negocio
├── TAREAS.md                        # Seguimiento de fases
├── package.json
└── vite.config.js
```

---

## ⚙️ Instalación y Ejecución

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Variables de Entorno (Opcional para conectar con Supabase en la nube):**
   Crea o ajusta tu archivo `.env`:
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=tu_clave_anonima_publica
   ```
   *(Si no se configuran, la aplicación opera de forma autónoma en modo demostración y almacena el estado completo en LocalStorage).*

3. **Iniciar el Servidor de Desarrollo:**
   ```bash
   npm run dev
   ```

4. **Compilar para Producción:**
   ```bash
   npm run build
   ```

5. **Previsualizar la Compilación:**
   ```bash
   npm run preview
   ```
