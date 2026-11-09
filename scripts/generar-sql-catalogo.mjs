// Genera supabase/migrations/0005_catalogo_ampliado.sql a partir de src/data/catalogoAmpliado.js.
// Uso (desde la carpeta Syntratech):  node scripts/generar-sql-catalogo.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CATALOG_CATEGORIES, CATALOG_PRODUCTS } from '../src/data/catalogoAmpliado.js';

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

const newCategories = Object.values(CATALOG_CATEGORIES).filter((c) => c.name);

const lines = [
  '-- =====================================================================',
  '-- Syntratech · Catálogo ampliado de aseo y limpieza',
  '-- Generado con: node scripts/generar-sql-catalogo.mjs (no editar a mano).',
  '-- Ejecutar en Supabase → SQL Editor DESPUÉS de 0004_pesos_y_gestion_admin.sql.',
  '-- Se puede ejecutar varias veces: no duplica productos ni pisa los que ya editaste.',
  '-- Precios en pesos colombianos, de referencia (Éxito, D1, Ara). Ajústalos en el panel.',
  '-- =====================================================================',
  '',
  '-- Categorías nuevas',
  'insert into public.categories (id, name, slug, description, icon) values',
  newCategories
    .map((c) => `  (${q(c.db)}, ${q(c.name)}, ${q(c.slug)}, ${q(c.description)}, ${q(c.icon)})`)
    .join(',\n'),
  'on conflict (id) do nothing;',
  '',
  `-- ${CATALOG_PRODUCTS.length} productos`,
  'insert into public.products (id, category_id, name, slug, description, price, stock, image_url, is_active) values',
  CATALOG_PRODUCTS.map(
    (p) =>
      `  (${q(p.dbId)}, ${q(CATALOG_CATEGORIES[p.category].db)}, ${q(p.name)}, ${q(p.slug)}, ${q(p.description)}, ${p.price}, ${p.stock}, ${q(p.image_url)}, true)`
  ).join(',\n'),
  'on conflict do nothing;',
  '',
  '-- Bitácora: stock inicial de cada producto nuevo (solo la primera vez).',
  'insert into public.inventory_logs (product_id, changed_by, change_type, quantity_change, previous_stock, new_stock, notes)',
  'select p.id, null, \'ingreso\', p.stock, 0, p.stock, \'Stock inicial - catálogo ampliado\'',
  'from public.products p',
  "where p.id::text like '33333333-3333-4333-8333-%'",
  '  and not exists (select 1 from public.inventory_logs l where l.product_id = p.id);',
  '',
  'select',
  '  (select count(*) from public.products) as productos_totales,',
  '  (select count(*) from public.categories) as categorias_totales,',
  "  'Catálogo ampliado listo' as resultado;",
  '',
];

const out = fileURLToPath(new URL('../supabase/migrations/0005_catalogo_ampliado.sql', import.meta.url));
writeFileSync(out, lines.join('\n'), 'utf8');
console.log(`Escrito ${out} con ${CATALOG_PRODUCTS.length} productos y ${newCategories.length} categorías nuevas.`);
