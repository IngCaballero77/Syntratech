# 🗄️ Modelo de Base de Datos - Syntratech

El modelo se gestiona en PostgreSQL a través de Supabase con el script único `supabase/migrations/0001_esquema_completo.sql` (tablas, RLS, funciones `place_order`, `cancel_order`, `adjust_stock` y datos iniciales).

## Tablas Principales (Esquema conceptual)
- `profiles`: Extensión de `auth.users` para manejar roles (`admin`, `proveedor`, `cliente`).
- `categories`: Categorías de productos.
- `products`: Catálogo, precios y stock actual.
- `orders`: Registro de compras realizadas por los clientes.
- `order_items`: Detalle de productos por cada pedido y cantidades.
- `inventory_logs`: Trazabilidad de entradas y salidas de inventario operadas por administradores u operadores.

## Seguridad (RLS)
- Políticas strictly por tabla basadas en el rol del usuario autenticado (`auth.uid()` y verificación en la tabla `profiles`).
