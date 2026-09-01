-- Datos iniciales de desarrollo local, replicando lib/mock-data.ts (ver CLAUDE.md).
-- Este archivo se ejecuta automáticamente con `supabase db reset`.
--
-- Nota: las reservaciones/servicios de ejemplo (mockReservations en mock-data.ts) NO se
-- siembran aquí porque varios de sus huéspedes ("Laura Fernández", "Jorge Salas") no existen
-- como usuarios reales en mockUsers, y esta migración solo pide reproducir usuarios, tarifas,
-- opciones de comida, vinos y masajistas. Las tablas de reservaciones/bookings quedan vacías
-- pero listas para usarse.

-- ============================================================================
-- auth.users — requerido porque public.profiles.id referencia auth.users(id).
-- Contraseña de desarrollo para los tres: "changeme123" (solo entorno local).
-- ============================================================================

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated', 'authenticated',
    'admin@test.com',
    extensions.crypt('changeme123', extensions.gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}', '{}',
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated', 'authenticated',
    'maria.gomez@example.com',
    extensions.crypt('changeme123', extensions.gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}', '{}',
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-3333-3333-333333333333',
    'authenticated', 'authenticated',
    'carlos.ruiz@example.com',
    extensions.crypt('changeme123', extensions.gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}', '{}',
    now(), now(), '', '', '', ''
  );

-- ============================================================================
-- profiles (mockUsers)
-- ============================================================================

insert into public.profiles (id, first_name, apellido_paterno, apellido_materno, email, role, status)
values
  ('11111111-1111-1111-1111-111111111111', 'Rafael', 'Hernández', null, 'admin@test.com', 'admin', 'activo'),
  ('22222222-2222-2222-2222-222222222222', 'María', 'Gómez', null, 'maria.gomez@example.com', 'guest', 'activo'),
  ('33333333-3333-3333-3333-333333333333', 'Carlos', 'Ruiz', null, 'carlos.ruiz@example.com', 'guest', 'invitado');

-- ============================================================================
-- property_settings (PRICING_CONFIG)
-- ============================================================================

insert into public.property_settings (nightly_rate, security_deposit)
values (250.00, 300.00);

-- ============================================================================
-- fare_types (FARE_OPTIONS)
-- ============================================================================

insert into public.fare_types (name, surcharge_percentage)
values
  ('Tarifa Estándar', 0.00),
  ('Tarifa Flexible', 15.00);

-- ============================================================================
-- spa_masseuses (SPA_MASSEUSES)
-- ============================================================================

insert into public.spa_masseuses (name, status)
values
  ('Ana', 'activo'),
  ('Carlos', 'activo'),
  ('Laura', 'activo');

-- ============================================================================
-- food_menus (FOOD_MENU_OPTIONS)
-- ============================================================================

insert into public.food_menus (meal_type, name, price_per_person)
values
  ('Desayuno', 'Continental', 200.00),
  ('Desayuno', 'Mexicano', 220.00),
  ('Almuerzo', 'Parrilla norteña', 350.00),
  ('Almuerzo', 'Vegetariano', 280.00),
  ('Cena', 'Menú de degustación', 450.00),
  ('Cena', 'Cena ligera', 300.00);

-- ============================================================================
-- wines (WINE_BOTTLES) — "stock" no existe en el mock, se usa un valor de
-- referencia (24) hasta que haya un dato real de inventario.
-- ============================================================================

insert into public.wines (name, type, price, stock)
values
  ('Parvada Tinto', 'Tinto', 650.00, 24),
  ('Parvada Blanco', 'Blanco', 580.00, 24),
  ('Parvada Rosado', 'Rosado', 560.00, 24),
  ('Parvada Espumoso', 'Espumoso', 700.00, 24);

-- ============================================================================
-- wine_packages (WINE_PACKAGE)
-- ============================================================================

insert into public.wine_packages (name, price)
values ('Paquete de 4 vinos', 2250.00);
