# 🎯 Requisitos del Proyecto - Syntratech

## Identidad y Propósito
**Syntratech - Limpieza que te acompaña**
Proveer una herramienta web robusta y transaccional para la comercialización de productos de limpieza para el hogar, gestión de inventarios en tiempo real y optimización de despachos con trazabilidad por guías.

## Pilares de Servicio
1. **Calidad garantizada:** Fórmulas efectivas y biodegradables.
2. **Productos seguros:** Amigables con el hogar y el medio ambiente.
3. **Envíos rápidos:** Despachos eficientes con asignación de guía de rastreo.
4. **Compra fácil y segura:** Control estricto de existencias (cero riesgo de sobreventa).

## Actores y Roles
1. **ADMINISTRADOR:** Control total del sistema, gestión de usuarios, catálogo oficial, inventario global, pasarelas de pago y analítica de ventas.
2. **OPERADOR:** Gestión diaria de existencias en bodega, preparación de despachos, actualización de guías de rastreo y soporte operativo.
3. **CLIENTE:** Exploración de las 5 líneas de productos, carrito de compras con validación de stock, pago (contra entrega o en línea) y seguimiento en tiempo real.

## Módulos y Reglas de Negocio
- **Autenticación y RBAC:** Seguridad estricta por roles en PostgreSQL (Supabase RLS).
- **Inventario Transaccional:** Control estricto de stock (ningún pedido puede superar las existencias físicas disponibles).
- **Envíos y Trazabilidad:** Estados auditados (*Pendiente*, *Procesando*, *Enviado*, *Entregado*) con marca temporal y operador responsable.
