-- =====================================================================
-- Syntratech · Medios de pago: Nequi, Bancolombia, Nu, contra entrega y Wompi (tarjetas)
-- Ejecutar en Supabase → SQL Editor DESPUÉS de 0004 y 0005.
-- Se puede ejecutar más de una vez sin dañar datos.
--
-- Qué hace:
--   1. Tabla payment_settings: los datos de pago que ve el cliente (número de Nequi,
--      cuenta Bancolombia, llave de Nu, llave pública de Wompi). Se editan en el panel.
--   2. Columnas para guardar el comprobante del cliente y la transacción de Wompi.
--   3. Corrige un hueco: antes, elegir "tarjeta" marcaba el pedido como PAGADO sin pagar.
--      Ahora todo pedido nace con pago pendiente; lo confirma el administrador
--      o Wompi (automáticamente, por la función wompi-webhook).
--   4. Función para que el cliente registre el número de comprobante de su transferencia.
-- =====================================================================

-- ---------- 1. Datos de pago de la tienda ----------
create table if not exists public.payment_settings (
  id integer primary key default 1 check (id = 1),     -- una sola fila
  titular text,                                         -- a nombre de quién están las cuentas
  documento text,                                       -- NIT o cédula del titular (opcional)
  contra_entrega boolean not null default true,
  nequi_numero text,                                    -- celular Nequi
  bancolombia_tipo text default 'Ahorros',
  bancolombia_numero text,
  nu_llave text,                                        -- llave Bre-B / celular de Nu
  wompi_activo boolean not null default false,
  wompi_llave_publica text,                             -- pub_test_... o pub_prod_... (es pública)
  instrucciones text,                                   -- texto extra para el cliente
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.payment_settings (id) values (1) on conflict (id) do nothing;

alter table public.payment_settings enable row level security;

drop policy if exists "pagos config - ver" on public.payment_settings;
drop policy if exists "pagos config - admin" on public.payment_settings;
-- Lectura pública: son los datos que el cliente necesita para pagar.
create policy "pagos config - ver" on public.payment_settings for select using (true);
create policy "pagos config - admin" on public.payment_settings
  for update using (public.is_admin()) with check (public.is_admin());

drop trigger if exists payment_settings_updated_at on public.payment_settings;
create trigger payment_settings_updated_at before update on public.payment_settings
  for each row execute function public.set_updated_at();

-- ---------- 2. Datos del pago en cada pedido ----------
alter table public.orders add column if not exists payment_reference text;       -- comprobante del cliente
alter table public.orders add column if not exists wompi_transaction_id text;    -- id de la transacción en Wompi

-- ---------- 3. Crear pedido: el pago siempre empieza pendiente ----------
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
  v_method text := coalesce(nullif(trim(p_payment_method), ''), 'contra_entrega');
begin
  if v_user is null then
    raise exception 'Debes iniciar sesión para comprar';
  end if;
  if v_method not in ('contra_entrega', 'nequi', 'bancolombia', 'nu', 'wompi') then
    raise exception 'Medio de pago no válido';
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

  v_shipping := case when v_subtotal >= 150000 then 0 else 12000 end;

  insert into public.orders (user_id, total_amount, shipping_cost, shipping_address, shipping_city,
                             shipping_phone, payment_method, payment_status, tracking_number, notes)
  values (v_user, v_subtotal + v_shipping, v_shipping, trim(p_shipping_address), trim(p_shipping_city),
          trim(p_shipping_phone), v_method, 'pendiente',
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

-- ---------- 4. El cliente registra el comprobante de su transferencia ----------
drop function if exists public.submit_payment_reference(uuid, text);

create function public.submit_payment_reference(p_order_id uuid, p_reference text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.user_id is distinct from auth.uid() then
    raise exception 'Pedido no encontrado';
  end if;
  if v_order.status = 'cancelado' then
    raise exception 'Este pedido está cancelado';
  end if;
  if v_order.payment_status = 'pagado' then
    raise exception 'Este pedido ya figura como pagado';
  end if;
  if coalesce(trim(p_reference), '') = '' or length(trim(p_reference)) > 80 then
    raise exception 'Escribe el número de comprobante (máximo 80 caracteres)';
  end if;
  update public.orders set payment_reference = trim(p_reference) where id = p_order_id;
end $$;

revoke all on function public.submit_payment_reference(uuid, text) from public, anon;
grant execute on function public.submit_payment_reference(uuid, text) to authenticated;

select 'Medios de pago listos. Llena los datos en el panel → pestaña Pagos.' as resultado;
