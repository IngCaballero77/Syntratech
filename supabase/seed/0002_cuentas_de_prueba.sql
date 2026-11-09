-- =====================================================================
-- Syntratech · Cuentas de prueba: 1 admin, 10 clientes, 20 proveedores
-- Ejecutar en Supabase → SQL Editor DESPUÉS de 0001_esquema_completo.sql.
-- Las cuentas quedan con el correo confirmado. Contraseña: ver CUENTAS_DE_PRUEBA.md
-- =====================================================================
do $$
declare
  v_password text := 'CAMBIA_ESTA_CONTRASENA';  -- escribe aquí la contraseña que quieras para las cuentas de prueba
  v_user uuid;
  r record;
begin
  -- Limpia ejecuciones anteriores de este mismo script.
  delete from auth.users where email like '%@syntratech.com'
    and (email = 'admin@syntratech.com' or email ~ '^(cliente|proveedor)[0-9]{2}@syntratech\.com$');

  for r in select * from (values
  ('admin@syntratech.com', 'Administrador Syntratech', 'admin', 'Bogotá', '+57 300 000 0001'),
  ('cliente01@syntratech.com', 'Carlos Mendoza', 'cliente', 'Bogotá', '+57 310 000 0001'),
  ('cliente02@syntratech.com', 'Laura Gómez', 'cliente', 'Medellín', '+57 310 000 0002'),
  ('cliente03@syntratech.com', 'Andrés Rojas', 'cliente', 'Cali', '+57 310 000 0003'),
  ('cliente04@syntratech.com', 'Valentina Torres', 'cliente', 'Barranquilla', '+57 310 000 0004'),
  ('cliente05@syntratech.com', 'Santiago Herrera', 'cliente', 'Bucaramanga', '+57 310 000 0005'),
  ('cliente06@syntratech.com', 'Camila Vargas', 'cliente', 'Pereira', '+57 310 000 0006'),
  ('cliente07@syntratech.com', 'Juan Pablo Ríos', 'cliente', 'Manizales', '+57 310 000 0007'),
  ('cliente08@syntratech.com', 'Daniela Castro', 'cliente', 'Cartagena', '+57 310 000 0008'),
  ('cliente09@syntratech.com', 'Felipe Morales', 'cliente', 'Ibagué', '+57 310 000 0009'),
  ('cliente10@syntratech.com', 'Mariana López', 'cliente', 'Santa Marta', '+57 310 000 0010'),
  ('proveedor01@syntratech.com', 'Químicos Andinos S.A.S.', 'proveedor', 'Medellín', '+57 320 000 0001'),
  ('proveedor02@syntratech.com', 'Detergentes del Valle', 'proveedor', 'Cali', '+57 320 000 0002'),
  ('proveedor03@syntratech.com', 'EcoLimpio Colombia', 'proveedor', 'Bogotá', '+57 320 000 0003'),
  ('proveedor04@syntratech.com', 'Plásticos La Sabana', 'proveedor', 'Bogotá', '+57 320 000 0004'),
  ('proveedor05@syntratech.com', 'Microfibras del Caribe', 'proveedor', 'Barranquilla', '+57 320 000 0005'),
  ('proveedor06@syntratech.com', 'Aromas y Esencias Ltda.', 'proveedor', 'Bogotá', '+57 320 000 0006'),
  ('proveedor07@syntratech.com', 'Envases Industriales SAS', 'proveedor', 'Itagüí', '+57 320 000 0007'),
  ('proveedor08@syntratech.com', 'Biodegradables Verdes', 'proveedor', 'Pereira', '+57 320 000 0008'),
  ('proveedor09@syntratech.com', 'Distribuidora Aseo Total', 'proveedor', 'Bucaramanga', '+57 320 000 0009'),
  ('proveedor10@syntratech.com', 'Insumos Químicos Norte', 'proveedor', 'Cúcuta', '+57 320 000 0010'),
  ('proveedor11@syntratech.com', 'Traperos y Escobas El Roble', 'proveedor', 'Tunja', '+57 320 000 0011'),
  ('proveedor12@syntratech.com', 'Cloro y Derivados SAS', 'proveedor', 'Cartagena', '+57 320 000 0012'),
  ('proveedor13@syntratech.com', 'Guantes Seguros Ltda.', 'proveedor', 'Cali', '+57 320 000 0013'),
  ('proveedor14@syntratech.com', 'Fragancias Naturales', 'proveedor', 'Manizales', '+57 320 000 0014'),
  ('proveedor15@syntratech.com', 'Baldes y Recipientes SAS', 'proveedor', 'Medellín', '+57 320 000 0015'),
  ('proveedor16@syntratech.com', 'Jabones Artesanales Andes', 'proveedor', 'Pasto', '+57 320 000 0016'),
  ('proveedor17@syntratech.com', 'Desinfectantes Pro', 'proveedor', 'Bogotá', '+57 320 000 0017'),
  ('proveedor18@syntratech.com', 'Logística Química Express', 'proveedor', 'Barranquilla', '+57 320 000 0018'),
  ('proveedor19@syntratech.com', 'Empaques Sostenibles', 'proveedor', 'Armenia', '+57 320 000 0019'),
  ('proveedor20@syntratech.com', 'Suministros Limpios del Sur', 'proveedor', 'Neiva', '+57 320 000 0020')
  ) as t(email, full_name, role, city, phone) loop
    v_user := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new
    ) values (
      '00000000-0000-0000-0000-000000000000', v_user, 'authenticated', 'authenticated', r.email,
      extensions.crypt(v_password, extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', r.full_name, 'role', case when r.role = 'admin' then 'cliente' else r.role end),
      now(), now(), '', '', '', ''
    );

    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), v_user, v_user::text,
      jsonb_build_object('sub', v_user::text, 'email', r.email, 'email_verified', true),
      'email', now(), now(), now()
    );

    -- El disparador on_auth_user_created ya creó el perfil; se completa y se fija el rol.
    update public.profiles
      set role = r.role, full_name = r.full_name, city = r.city, phone = r.phone
      where id = v_user;
  end loop;
end $$;

select role, count(*) as cuentas from public.profiles
where email like '%@syntratech.com' group by role order by role;
