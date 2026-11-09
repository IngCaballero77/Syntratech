-- =====================================================================
-- Syntratech · Esquema completo desde cero
-- Roles: admin, proveedor, cliente
-- Ejecutar completo en Supabase → SQL Editor. Borra y recrea las tablas.
-- =====================================================================

-- ---------- 0. Limpieza ----------
drop trigger if exists on_auth_user_created on auth.users;
drop table if exists public.inventory_logs cascade;
drop table if exists public.order_items cascade;
drop table if exists public.orders cascade;
drop table if exists public.products cascade;
drop table if exists public.categories cascade;
drop table if exists public.profiles cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.protect_profile_role() cascade;
drop function if exists public.set_updated_at() cascade;
drop function if exists public.my_role() cascade;
drop function if exists public.is_admin() cascade;
drop function if exists public.is_staff() cascade;
drop function if exists public.place_order(jsonb, text, text, text, text, text, text) cascade;
drop function if exists public.cancel_order(uuid) cascade;
drop function if exists public.adjust_stock(uuid, integer, text, text) cascade;

create extension if not exists "uuid-ossp";

-- ---------- 1. Tablas ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  address text,
  city text,
  role text not null default 'cliente' check (role in ('admin', 'proveedor', 'cliente')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  slug text not null unique,
  description text,
  icon text,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.products (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  price numeric not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.orders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  total_amount numeric not null check (total_amount >= 0),
  status text not null default 'pendiente'
    check (status in ('pendiente', 'procesando', 'enviado', 'entregado', 'cancelado')),
  shipping_address text not null,
  shipping_city text not null,
  shipping_phone text not null,
  payment_method text not null default 'contra_entrega',
  payment_status text not null default 'pendiente'
    check (payment_status in ('pendiente', 'pagado', 'reembolsado', 'fallido')),
  tracking_number text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  unit_price numeric not null check (unit_price >= 0),
  subtotal numeric generated always as (quantity * unit_price) stored,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.inventory_logs (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  changed_by uuid references public.profiles(id) on delete set null,
  change_type text not null check (change_type in ('ingreso', 'egreso', 'ajuste', 'venta', 'devolucion')),
  quantity_change integer not null,
  previous_stock integer not null,
  new_stock integer not null,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create index on public.products (category_id);
create index on public.orders (user_id);
create index on public.order_items (order_id);
create index on public.inventory_logs (product_id);

-- ---------- 2. Funciones auxiliares ----------
create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end $$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

-- Rol del usuario actual (security definer evita recursión en RLS).
create function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() = 'admin', false)
$$;

create function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() in ('admin', 'proveedor'), false)
$$;

-- Crea el perfil al registrarse. Solo se permite elegir cliente o proveedor.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  wanted text := coalesce(new.raw_user_meta_data ->> 'role', 'cliente');
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    case when wanted in ('cliente', 'proveedor') then wanted else 'cliente' end
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Nadie puede cambiarse el rol a sí mismo; solo un admin (o el SQL Editor).
create function public.protect_profile_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'Solo un administrador puede cambiar roles';
  end if;
  return new;
end $$;

create trigger profiles_protect_role before update on public.profiles
  for each row execute function public.protect_profile_role();

-- ---------- 3. Seguridad RLS ----------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.inventory_logs enable row level security;

-- Perfiles: cada quien ve y edita el suyo; el admin ve y edita todos.
create policy "perfil propio o admin - ver" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "perfil propio o admin - editar" on public.profiles
  for update using (id = auth.uid() or public.is_admin());

-- Categorías: lectura pública; escritura admin.
create policy "categorias - ver" on public.categories for select using (true);
create policy "categorias - admin" on public.categories for all
  using (public.is_admin()) with check (public.is_admin());

-- Productos: el público ve los activos; admin y proveedor ven todo y gestionan.
create policy "productos - ver" on public.products
  for select using (is_active or public.is_staff());
create policy "productos - crear" on public.products
  for insert with check (public.is_staff());
create policy "productos - editar" on public.products
  for update using (public.is_staff()) with check (public.is_staff());
create policy "productos - borrar" on public.products
  for delete using (public.is_admin());

-- Pedidos: el cliente ve los suyos; el admin ve y actualiza todos.
-- La creación y cancelación pasan por funciones seguras (place_order / cancel_order).
create policy "pedidos - ver" on public.orders
  for select using (user_id = auth.uid() or public.is_admin());
create policy "pedidos - admin actualiza" on public.orders
  for update using (public.is_admin()) with check (public.is_admin());

create policy "items - ver" on public.order_items
  for select using (
    public.is_admin()
    or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

-- Bitácora de inventario: visible y registrable para admin y proveedor.
create policy "bitacora - ver" on public.inventory_logs
  for select using (public.is_staff());
create policy "bitacora - registrar" on public.inventory_logs
  for insert with check (public.is_staff());

-- ---------- 4. Operaciones transaccionales ----------
-- Crear pedido: valida y descuenta stock en una sola transacción (sin sobreventa).
create function public.place_order(
  p_items jsonb,
  p_shipping_address text,
  p_shipping_city text,
  p_shipping_phone text,
  p_payment_method text default 'contra_entrega',
  p_notes text default '',
  p_tracking_number text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_order uuid;
  v_total numeric := 0;
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty integer;
begin
  if v_user is null then
    raise exception 'Debes iniciar sesión para comprar';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'El carrito está vacío';
  end if;

  -- Bloquea y valida cada producto.
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'quantity')::integer;
    select * into v_product from public.products
      where id = (v_item ->> 'product_id')::uuid and is_active
      for update;
    if not found then
      raise exception 'Producto no disponible';
    end if;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Cantidad inválida para %', v_product.name;
    end if;
    if v_product.stock < v_qty then
      raise exception 'Stock insuficiente para "%". Disponibles: %', v_product.name, v_product.stock;
    end if;
    v_total := v_total + v_product.price * v_qty;
  end loop;

  insert into public.orders (user_id, total_amount, shipping_address, shipping_city, shipping_phone,
                             payment_method, payment_status, tracking_number, notes)
  values (v_user, v_total, p_shipping_address, p_shipping_city, p_shipping_phone,
          coalesce(p_payment_method, 'contra_entrega'),
          case when p_payment_method = 'tarjeta' then 'pagado' else 'pendiente' end,
          coalesce(p_tracking_number, 'SYN-' || floor(100000 + random() * 900000)::text),
          p_notes)
  returning id into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'quantity')::integer;
    select * into v_product from public.products where id = (v_item ->> 'product_id')::uuid;

    insert into public.order_items (order_id, product_id, quantity, unit_price)
    values (v_order, v_product.id, v_qty, v_product.price);

    update public.products set stock = stock - v_qty where id = v_product.id;

    insert into public.inventory_logs (product_id, changed_by, change_type, quantity_change,
                                       previous_stock, new_stock, notes)
    values (v_product.id, v_user, 'venta', -v_qty, v_product.stock, v_product.stock - v_qty,
            'Pedido #' || left(v_order::text, 8));
  end loop;

  return v_order;
end $$;

-- Cancelar pedido: el dueño (si está pendiente) o el admin. Devuelve el stock.
create function public.cancel_order(p_order_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
  v_line record;
  v_stock integer;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pedido no encontrado';
  end if;
  if not public.is_admin() and (v_order.user_id <> auth.uid() or v_order.status <> 'pendiente') then
    raise exception 'No puedes cancelar este pedido';
  end if;
  if v_order.status = 'cancelado' then
    return;
  end if;

  for v_line in select product_id, quantity from public.order_items where order_id = p_order_id loop
    update public.products set stock = stock + v_line.quantity
      where id = v_line.product_id returning stock into v_stock;
    insert into public.inventory_logs (product_id, changed_by, change_type, quantity_change,
                                       previous_stock, new_stock, notes)
    values (v_line.product_id, auth.uid(), 'devolucion', v_line.quantity,
            v_stock - v_line.quantity, v_stock, 'Cancelación pedido #' || left(p_order_id::text, 8));
  end loop;

  update public.orders
    set status = 'cancelado',
        payment_status = case when payment_status = 'pagado' then 'reembolsado' else payment_status end
    where id = p_order_id;
end $$;

-- Ajuste de inventario auditado (admin y proveedor).
create function public.adjust_stock(
  p_product_id uuid,
  p_delta integer,
  p_change_type text default 'ajuste',
  p_notes text default ''
) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_prev integer;
  v_new integer;
begin
  if not public.is_staff() then
    raise exception 'Solo administradores o proveedores pueden ajustar inventario';
  end if;
  select stock into v_prev from public.products where id = p_product_id for update;
  if not found then
    raise exception 'Producto no encontrado';
  end if;
  v_new := v_prev + p_delta;
  if v_new < 0 then
    raise exception 'El stock no puede ser negativo. Existencias actuales: %', v_prev;
  end if;
  update public.products set stock = v_new where id = p_product_id;
  insert into public.inventory_logs (product_id, changed_by, change_type, quantity_change,
                                     previous_stock, new_stock, notes)
  values (p_product_id, auth.uid(), p_change_type, p_delta, v_prev, v_new, p_notes);
  return v_new;
end $$;

revoke all on function public.place_order(jsonb, text, text, text, text, text, text) from public, anon;
revoke all on function public.cancel_order(uuid) from public, anon;
revoke all on function public.adjust_stock(uuid, integer, text, text) from public, anon;
grant execute on function public.place_order(jsonb, text, text, text, text, text, text) to authenticated;
grant execute on function public.cancel_order(uuid) to authenticated;
grant execute on function public.adjust_stock(uuid, integer, text, text) to authenticated;

-- ---------- 5. Perfiles para usuarios que ya existían ----------
insert into public.profiles (id, email, full_name, role)
select u.id, u.email,
       coalesce(u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1)),
       case when u.raw_user_meta_data ->> 'role' in ('cliente', 'proveedor')
            then u.raw_user_meta_data ->> 'role' else 'cliente' end
from auth.users u
on conflict (id) do nothing;

-- ---------- 6. Datos iniciales ----------
insert into public.categories (id, name, slug, description, icon) values
  ('11111111-1111-1111-1111-111111111101', 'Limpiadores generales', 'limpiadores-generales', 'Multiusos, desinfectantes, limpiavidrios y limpiapisos para todo el hogar.', 'sparkles'),
  ('11111111-1111-1111-1111-111111111102', 'Lavaplatos y cocina', 'lavaplatos-y-cocina', 'Desengrasantes de alta potencia, lavavajillas y limpiadores de acero.', 'utensils'),
  ('11111111-1111-1111-1111-111111111103', 'Ropa y lavandería', 'ropa-y-lavanderia', 'Detergentes líquidos concentrados, suavizantes y blanqueadores seguros.', 'shirt'),
  ('11111111-1111-1111-1111-111111111104', 'Baño y sanitarios', 'bano-y-sanitarios', 'Desincrustantes antisarro, geles bactericidas y limpiadores de juntas.', 'bath'),
  ('11111111-1111-1111-1111-111111111105', 'Accesorios de limpieza', 'accesorios-de-limpieza', 'Traperos 360°, paños de microfibra, baldes con escurridor y guantes.', 'wrench');

insert into public.products (id, category_id, name, slug, description, price, stock, image_url) values
  ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111103', 'Detergente Líquido Concentrado Lavandería (3 Litros)', 'detergente-liquido-concentrado-lavanderia-3l', 'Fórmula biodegradable de alto rendimiento para ropa blanca y de color. Protege fibras textiles y remueve manchas profundas.', 18.50, 45, 'https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?auto=format&fit=crop&w=800&q=80'),
  ('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111102', 'Desengrasante Multiusos Cítrico Biodegradable (1 Litro)', 'desengrasante-multiusos-citrico-1l', 'Poderoso desengrasante formulado con aceites cítricos naturales para campanas, estufas, hornos y mesones sin vapores tóxicos.', 7.90, 60, 'https://images.unsplash.com/photo-1584813470613-5b1c1cad3d69?auto=format&fit=crop&w=800&q=80'),
  ('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111102', 'Jabón Lavaplatos Líquido con Aloe y Bicarbonato (750 ml)', 'jabon-lavaplatos-aloe-bicarbonato-750ml', 'Acción corta-grasa instantánea. Delicado con tus manos gracias al extracto de aloe vera y neutralizador de olores.', 5.50, 50, 'https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=800&q=80'),
  ('22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111101', 'Limpiador Desinfectante de Pisos Aroma Lavanda Silvestre (2 Litros)', 'limpiador-pisos-lavanda-2l', 'Elimina el 99.9% de bacterias y hongos. Aporta brillo duradero y fragancia relajante sin necesidad de enjuagar.', 9.20, 35, 'https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=800&q=80'),
  ('22222222-2222-2222-2222-222222222205', '11111111-1111-1111-1111-111111111104', 'Gel Antisarro y Desincrustante Sanitario Activo (1 Litro)', 'gel-antisarro-desincrustante-1l', 'Adherencia prolongada que descompone sarro, sales minerales y óxido en inodoros, griferías y azulejos.', 6.80, 28, 'https://images.unsplash.com/photo-1584813470613-5b1c1cad3d69?auto=format&fit=crop&w=800&q=80'),
  ('22222222-2222-2222-2222-222222222206', '11111111-1111-1111-1111-111111111105', 'Kit Pro: Trapero Microfibra 360° + Balde Escurridor + Guantes', 'kit-pro-trapero-microfibra-balde-guantes', 'Set completo ergonómico para aseo profundo. Balde con canasta centrífuga, mopa giratoria y guantes de alta resistencia.', 29.90, 20, 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80');

-- ---------- 7. Asignar administrador ----------
-- Después de crear la cuenta de admin en la web (o en Authentication → Users), ejecuta:
--   update public.profiles set role = 'admin' where email = 'admin@syntratech.com';
-- Para convertir una cuenta en proveedor:
--   update public.profiles set role = 'proveedor' where email = 'proveedor@syntratech.com';
