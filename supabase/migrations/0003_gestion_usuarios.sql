-- =====================================================================
-- Syntratech · Gestión de usuarios desde el panel del administrador
-- Ejecutar en Supabase → SQL Editor (después de 0001_esquema_completo.sql).
-- Permite que un administrador cree cuentas (admin, proveedor o cliente)
-- con los datos de la persona, sin exponer la clave secreta en la web.
-- =====================================================================

drop function if exists public.admin_create_user(text, text, text, text, text, text, text);

create function public.admin_create_user(
  p_email text,
  p_password text,
  p_full_name text,
  p_role text default 'cliente',
  p_phone text default null,
  p_city text default null,
  p_address text default null
) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_user uuid := gen_random_uuid();
  v_email text := lower(trim(p_email));
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede crear usuarios';
  end if;
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Correo electrónico no válido';
  end if;
  if p_password is null or length(p_password) < 8 then
    raise exception 'La contraseña debe tener al menos 8 caracteres';
  end if;
  if coalesce(trim(p_full_name), '') = '' then
    raise exception 'El nombre completo es obligatorio';
  end if;
  if p_role not in ('admin', 'proveedor', 'cliente') then
    raise exception 'Rol no válido';
  end if;
  if exists (select 1 from auth.users where lower(email) = v_email) then
    raise exception 'Ya existe una cuenta con el correo %', v_email;
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new
  ) values (
    '00000000-0000-0000-0000-000000000000', v_user, 'authenticated', 'authenticated', v_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', trim(p_full_name)),
    now(), now(), '', '', '', ''
  );

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (
    gen_random_uuid(), v_user, v_user::text,
    jsonb_build_object('sub', v_user::text, 'email', v_email, 'email_verified', true),
    'email', null, now(), now()
  );

  -- El disparador on_auth_user_created crea el perfil; aquí se completa con los datos y el rol.
  update public.profiles
    set full_name = trim(p_full_name),
        role = p_role,
        phone = nullif(trim(p_phone), ''),
        city = nullif(trim(p_city), ''),
        address = nullif(trim(p_address), '')
    where id = v_user;

  return v_user;
end $$;

revoke all on function public.admin_create_user(text, text, text, text, text, text, text) from public, anon;
grant execute on function public.admin_create_user(text, text, text, text, text, text, text) to authenticated;

select 'Función admin_create_user lista' as resultado;
