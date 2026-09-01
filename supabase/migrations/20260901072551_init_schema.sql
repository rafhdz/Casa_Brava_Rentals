-- Casa Brava Rentals — esquema relacional inicial
-- Reemplaza progresivamente los datos mockeados de lib/mock-data.ts (ver CLAUDE.md).

-- ============================================================================
-- ENUMs
-- ============================================================================

create type public.role_type as enum ('admin', 'holder', 'guest');

create type public.profile_status as enum ('activo', 'invitado');

create type public.reservation_status as enum ('pendiente', 'confirmada', 'cancelada', 'pasada');

create type public.meal_type as enum ('Desayuno', 'Almuerzo', 'Cena');

-- ============================================================================
-- Tablas principales
-- ============================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name varchar not null,
  apellido_paterno varchar not null,
  apellido_materno varchar,
  email varchar not null unique,
  phone varchar,
  date_of_birth date,
  document_id varchar,
  role public.role_type not null default 'guest',
  status public.profile_status not null default 'invitado',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.property_settings (
  id uuid primary key default gen_random_uuid(),
  nightly_rate decimal(10, 2) not null,
  security_deposit decimal(10, 2) not null
);

create table public.fare_types (
  id uuid primary key default gen_random_uuid(),
  name varchar not null,
  surcharge_percentage decimal(5, 2) not null default 0
);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references public.profiles (id) on delete restrict,
  check_in date not null,
  check_out date not null,
  fare_type_id uuid not null references public.fare_types (id) on delete restrict,
  total_amount decimal(10, 2) not null,
  status public.reservation_status not null default 'pendiente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint reservations_check_out_after_check_in check (check_out > check_in)
);

-- ============================================================================
-- Tablas de servicios — SPA
-- ============================================================================

create table public.spa_masseuses (
  id uuid primary key default gen_random_uuid(),
  name varchar not null,
  status public.profile_status not null default 'activo'
);

create table public.spa_bookings (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  masseuse_id uuid not null references public.spa_masseuses (id) on delete restrict,
  date date not null,
  time time not null,
  price_per_hour decimal(10, 2) not null
);

-- ============================================================================
-- Tablas de servicios — Comida
-- ============================================================================

create table public.food_menus (
  id uuid primary key default gen_random_uuid(),
  meal_type public.meal_type not null,
  name varchar not null,
  price_per_person decimal(10, 2) not null
);

create table public.food_bookings (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  date date not null,
  meal_type public.meal_type not null,
  menu_id uuid not null references public.food_menus (id) on delete restrict,
  guests_count integer not null check (guests_count > 0),
  total_price decimal(10, 2) not null
);

-- ============================================================================
-- Tablas de servicios — Vinos
-- ============================================================================

create table public.wines (
  id uuid primary key default gen_random_uuid(),
  name varchar not null,
  type varchar not null,
  price decimal(10, 2) not null,
  stock integer not null default 0
);

create table public.wine_packages (
  id uuid primary key default gen_random_uuid(),
  name varchar not null,
  price decimal(10, 2) not null
);

create table public.wine_orders (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  total_price decimal(10, 2) not null
);

create table public.wine_order_items (
  id uuid primary key default gen_random_uuid(),
  wine_order_id uuid not null references public.wine_orders (id) on delete cascade,
  wine_id uuid references public.wines (id) on delete restrict,
  wine_package_id uuid references public.wine_packages (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price decimal(10, 2) not null,
  constraint wine_order_items_exactly_one_product check (
    (wine_id is not null and wine_package_id is null)
    or (wine_id is null and wine_package_id is not null)
  )
);

-- ============================================================================
-- Índices para llaves foráneas más consultadas
-- ============================================================================

create index reservations_guest_id_idx on public.reservations (guest_id);
create index reservations_fare_type_id_idx on public.reservations (fare_type_id);
create index spa_bookings_reservation_id_idx on public.spa_bookings (reservation_id);
create index spa_bookings_masseuse_id_idx on public.spa_bookings (masseuse_id);
create index food_bookings_reservation_id_idx on public.food_bookings (reservation_id);
create index food_bookings_menu_id_idx on public.food_bookings (menu_id);
create index wine_orders_reservation_id_idx on public.wine_orders (reservation_id);
create index wine_order_items_wine_order_id_idx on public.wine_order_items (wine_order_id);

-- ============================================================================
-- Seguridad (pendiente)
-- ============================================================================

-- TODO: Implement RLS policies for sensitive data (profiles, reservations) in a future migration before production.
