-- =====================================================================
-- Syntratech · Pesos colombianos y gestión completa para el administrador
-- Ejecutar en Supabase → SQL Editor (después de 0001 y 0003).
-- Se puede ejecutar más de una vez sin dañar los datos.
--
-- Qué hace:
--   1. Pasa los precios de dólares a pesos colombianos (COP, sin decimales).
--   2. Cobra el envío dentro del total del pedido ($12.000, gratis desde $150.000).
--   3. Permite al administrador eliminar usuarios, editar sus datos y
--      cambiarles la contraseña.
--   4. Conserva los pedidos de un usuario eliminado (quedan sin dueño).
--   5. Cierra un hueco de seguridad: ya nadie puede registrarse solo como
--      proveedor; ese rol lo asigna el administrador.
-- =====================================================================

-- ---------- 1. Precios en pesos colombianos ----------
-- Solo cambia los precios que siguen en dólares (menores a 1.000).
update public.products set price = case id
    when '22222222-2222-2222-2222-222222222201' then 42900  -- Detergente 3 L
    when '22222222-2222-2222-2222-222222222202' then 17900  -- Desengrasante 1 L
    when '22222222-2222-2222-2222-222222222203' then 12900  -- Lavaplatos 750 ml
    when '22222222-2222-2222-2222-222222222204' then 19900  -- Limpiador pisos 2 L
    when '22222222-2222-2222-2222-222222222205' then 15900  -- Gel antisarro 1 L
    when '22222222-2222-2222-2222-222222222206' then 89900  -- Kit trapero
    else round(price * 4000 / 100) * 100                    -- Otros: tasa aprox. de 4.000
  end
where price < 1000;

-- Pedidos antiguos: se convierten con la misma tasa para que el historial tenga sentido.
update public.order_items set unit_price = round(unit_price * 4000 / 100) * 100
where unit_price < 1000;

update public.orders o set total_amount = coalesce(
    (select sum(i.subtotal) from public.order_items i where i.order_id = o.id), 0)
where o.total_amount < 1000;

-- Desde ahora los precios son pesos enteros.
-- (order_items.unit_price no se toca: de ella depende la columna calculada "subtotal").
alter table public.products alter column price type numeric(12, 0) using round(price);
alter table public.orders alter column total_amount type numeric(12, 0) using round(total_amount);

-- Columna con el valor del envío de cada pedido.
alter table public.orders add column if not exists shipping_cost numeric(12, 0) not null default 0;

-- ---------- 2. Pedidos de usuarios eliminados ----------
-- Antes, borrar un usuario borraba también sus pedidos (y las ventas de la contabilidad).
alter table public.orders alter column user_id drop not null;
alter table public.orders drop constraint if exists orders_user_id_fkey;
alter table public.orders
  add constraint orders_user_id_fkey foreign key (user_id)
  references public.profiles(id) on delete set null;

-- ---------- 3. Registro: solo como cliente ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    'cliente'
  )
  on conflict (id) do nothing;
  return new;
end $$;

-- ---------- 4. Crear pedido con envío incluido ----------
create or replace function public.place_order(
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
  v_subtotal numeric := 0;
  v_shipping numeric := 0;
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
  if coalesce(trim(p_shipping_address), '') = '' or coalesce(trim(p_shipping_city), '') = ''
     or coalesce(trim(p_shipping_phone), '') = '' then
    raise exception 'Completa la dirección, la ciudad y el teléfono de entrega';
  end if;

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
    v_subtotal := v_subtotal + v_product.price * v_qty;
  end loop;

  -- Misma regla que la web (src/lib/format.js).
  v_shipping := case when v_subtotal >= 150000 then 0 else 12000 end;

  insert into public.orders (user_id, total_amount, shipping_cost, shipping_address, shipping_city,
                             shipping_phone, payment_method, payment_status, tracking_number, notes)
  values (v_user, v_subtotal + v_shipping, v_shipping, trim(p_shipping_address), trim(p_shipping_city),
          trim(p_shipping_phone), coalesce(p_payment_method, 'contra_entrega'),
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

-- ---------- 5. Gestión de usuarios por el administrador ----------
drop function if exists public.admin_delete_user(uuid);
drop function if exists public.admin_update_user(uuid, text, text, text, text, text);
drop function if exists public.admin_set_password(uuid, text);

-- Eliminar una cuenta (acceso y perfil). Sus pedidos se conservan sin dueño.
create function public.admin_delete_user(p_user_id uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede eliminar usuarios';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'No puedes eliminar tu propia cuenta';
  end if;
  if (select role from public.profiles where id = p_user_id) = 'admin'
     and (select count(*) from public.profiles where role = 'admin') <= 1 then
    raise exception 'No se puede eliminar al único administrador';
  end if;
  delete from auth.users where id = p_user_id;
  if not found then
    -- Perfil sin cuenta de acceso: se borra solo el perfil.
    delete from public.profiles where id = p_user_id;
  end if;
end $$;

-- Editar los datos de una persona (nombre, teléfono, ciudad, dirección y rol).
create function public.admin_update_user(
  p_user_id uuid,
  p_full_name text,
  p_phone text,
  p_city text,
  p_address text,
  p_role text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede editar usuarios';
  end if;
  if coalesce(trim(p_full_name), '') = '' then
    raise exception 'El nombre completo es obligatorio';
  end if;
  if p_role not in ('admin', 'proveedor', 'cliente') then
    raise exception 'Rol no válido';
  end if;
  if p_user_id = auth.uid() and p_role <> 'admin' then
    raise exception 'No puedes quitarte el rol de administrador';
  end if;
  update public.profiles
    set full_name = trim(p_full_name),
        phone = nullif(trim(p_phone), ''),
        city = nullif(trim(p_city), ''),
        address = nullif(trim(p_address), ''),
        role = p_role
    where id = p_user_id;
  if not found then
    raise exception 'Usuario no encontrado';
  end if;
end $$;

-- Asignar una contraseña nueva a otra persona.
create function public.admin_set_password(p_user_id uuid, p_password text) returns void
language plpgsql security definer set search_path = public, extensions, auth as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede cambiar contraseñas';
  end if;
  if p_password is null or length(p_password) < 8 then
    raise exception 'La contraseña debe tener al menos 8 caracteres';
  end if;
  update auth.users
    set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
        updated_at = now()
    where id = p_user_id;
  if not found then
    raise exception 'Usuario no encontrado';
  end if;
end $$;

revoke all on function public.admin_delete_user(uuid) from public, anon;
revoke all on function public.admin_update_user(uuid, text, text, text, text, text) from public, anon;
revoke all on function public.admin_set_password(uuid, text) from public, anon;
grant execute on function public.admin_delete_user(uuid) to authenticated;
grant execute on function public.admin_update_user(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.admin_set_password(uuid, text) to authenticated;

-- ---------- 6. Pedidos cancelados ----------
-- Cancelar ya devolvió el stock; reabrir el pedido descuadraría el inventario.
create or replace function public.protect_cancelled_order() returns trigger
language plpgsql as $$
begin
  if old.status = 'cancelado' and new.status is distinct from 'cancelado' then
    raise exception 'Un pedido cancelado no se puede reabrir';
  end if;
  return new;
end $$;

drop trigger if exists orders_protect_cancelled on public.orders;
create trigger orders_protect_cancelled before update on public.orders
  for each row execute function public.protect_cancelled_order();

-- Cancelar: ahora los pedidos pueden quedar sin dueño, así que la comparación
-- usa "is distinct from" (con "<>" un dueño vacío dejaba pasar a cualquiera).
create or replace function public.cancel_order(p_order_id uuid) returns void
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
  if not public.is_admin()
     and (v_order.user_id is distinct from auth.uid() or v_order.status <> 'pendiente') then
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

-- ---------- 7. Pedidos: el administrador también puede borrarlos ----------
drop policy if exists "pedidos - admin borra" on public.orders;
create policy "pedidos - admin borra" on public.orders
  for delete using (public.is_admin());

-- ---------- 8. Proveedores registrados por su cuenta antes de este cambio ----------
-- No se cambian solos: revisa la lista en el panel → Usuarios.
select
  (select count(*) from public.products where price >= 1000) as productos_en_pesos,
  (select count(*) from public.profiles where role = 'proveedor') as proveedores_para_revisar,
  'Migración 0004 lista' as resultado;
