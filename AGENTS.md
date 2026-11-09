# 🤖 Reglas Permanentes para los Agentes

Antes de realizar cualquier modificación, creación o revisión de código, los agentes deben leer obligatoriamente:
1. `REQUISITOS.md`
2. `DATABASE.md`
3. `DESIGN.md`
4. `TAREAS.md`

## Pila Tecnológica
- **Frontend:** React + Vite + JavaScript (ES Modules). Sin TypeScript.
- **Enrutamiento:** React Router.
- **Backend / Base de datos:** Supabase (PostgreSQL, Auth, Storage, RLS).

## Convenciones y Seguridad
- **Estricto cumplimiento de RLS:** Nunca deshabilitar Row Level Security ni usar `USING (true)` en tablas con datos privados.
- **Variables de entorno:** Usar únicamente `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` en el cliente. Prohibido exponer claves secretas (`service_role`).
- **Modularidad:** Mantener componentes limpios y reutilizables en carpetas organizadas (`src/components`, `src/pages`, `src/lib`, etc.).
