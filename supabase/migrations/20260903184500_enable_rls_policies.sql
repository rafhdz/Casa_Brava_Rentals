-- Casa Brava Rentals — políticas de Row Level Security (RLS).
-- Cierra el hueco documentado en CLAUDE.md desde la migración inicial:
-- hasta esta migración, cualquier cliente con la `anon`/`authenticated` key
-- podía leer o escribir cualquier fila de estas tablas directamente,
-- sin pasar por las Server Actions de la aplicación. Ver CLAUDE.md,
-- sección "Infraestructura de Supabase" y "CRUD de usuarios"/"CRUD de
-- reservaciones"/"Checkout de huésped" para el detalle de qué guard de
-- aplicación existía antes de esto (y sigue existiendo, en paralelo).

-- ============================================================================
-- Helper: rol del usuario autenticado actual
-- ============================================================================
-- SECURITY DEFINER + search_path fijo: evita que una política sobre
-- `profiles` dispare de vuelta la propia política de `profiles` al evaluar
-- esta subconsulta (la función corre con los privilegios de quien la creó,
-- bypassando RLS internamente) y evita el vector clásico de "search_path
-- hijacking" sobre funciones SECURITY DEFINER. STABLE permite que Postgres
-- la evalúe una sola vez por sentencia en vez de una vez por fila.
create or replace function public.current_user_role()
returns public.role_type
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

comment on function public.current_user_role() is
  'Rol (role_type) del usuario autenticado actual, leído de profiles. SECURITY DEFINER a propósito: se usa dentro de las políticas RLS de profiles y de otras tablas, y necesita bypassar RLS para no recursionar sobre sí misma.';

-- ============================================================================
-- profiles
-- ============================================================================
alter table public.profiles enable row level security;

-- Admin: acceso total.
create policy "profiles_admin_all"
  on public.profiles
  for all
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- Holder: lectura de todos los perfiles de la plataforma.
create policy "profiles_holder_select_all"
  on public.profiles
  for select
  to authenticated
  using (public.current_user_role() = 'holder');

-- Guest (y cualquier rol): lectura y escritura de su propia fila únicamente.
create policy "profiles_self_select"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles_self_update"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Guard adicional: RLS opera a nivel de fila, no de columna — la política
-- "profiles_self_update" de arriba, tomada literalmente, dejaría que
-- cualquier guest se autoasigne role='admin' o status='activo' actualizando
-- su propia fila directamente contra la anon/authenticated key (saltándose
-- por completo el guard de aplicación en app/admin/actions.ts:updateUser,
-- que ya impedía esto pero solo del lado de la Server Action). Este trigger
-- cierra ese hueco a nivel de base de datos: solo un admin puede cambiar
-- `role`/`status` de una fila de profiles, sin importar qué política de RLS
-- haya permitido llegar al UPDATE.
create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role or new.status is distinct from old.status)
     and public.current_user_role() is distinct from 'admin' then
    raise exception 'Solo un administrador puede modificar el rol o estado de un perfil.';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_privilege_escalation
  before update on public.profiles
  for each row
  execute function public.prevent_profile_privilege_escalation();

-- ============================================================================
-- Catálogos: property_settings, fare_types, spa_masseuses, food_menus,
-- wines, wine_packages
-- ============================================================================
-- Mismo patrón para los seis: lectura para cualquier usuario autenticado
-- (huésped, admin u holder), escritura (insert/update/delete) exclusiva de
-- admin.

alter table public.property_settings enable row level security;
alter table public.fare_types enable row level security;
alter table public.spa_masseuses enable row level security;
alter table public.food_menus enable row level security;
alter table public.wines enable row level security;
alter table public.wine_packages enable row level security;

create policy "property_settings_select_authenticated"
  on public.property_settings for select to authenticated using (true);
create policy "property_settings_admin_insert"
  on public.property_settings for insert to authenticated with check (public.current_user_role() = 'admin');
create policy "property_settings_admin_update"
  on public.property_settings for update to authenticated
  using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');
create policy "property_settings_admin_delete"
  on public.property_settings for delete to authenticated using (public.current_user_role() = 'admin');

create policy "fare_types_select_authenticated"
  on public.fare_types for select to authenticated using (true);
create policy "fare_types_admin_insert"
  on public.fare_types for insert to authenticated with check (public.current_user_role() = 'admin');
create policy "fare_types_admin_update"
  on public.fare_types for update to authenticated
  using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');
create policy "fare_types_admin_delete"
  on public.fare_types for delete to authenticated using (public.current_user_role() = 'admin');

create policy "spa_masseuses_select_authenticated"
  on public.spa_masseuses for select to authenticated using (true);
create policy "spa_masseuses_admin_insert"
  on public.spa_masseuses for insert to authenticated with check (public.current_user_role() = 'admin');
create policy "spa_masseuses_admin_update"
  on public.spa_masseuses for update to authenticated
  using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');
create policy "spa_masseuses_admin_delete"
  on public.spa_masseuses for delete to authenticated using (public.current_user_role() = 'admin');

create policy "food_menus_select_authenticated"
  on public.food_menus for select to authenticated using (true);
create policy "food_menus_admin_insert"
  on public.food_menus for insert to authenticated with check (public.current_user_role() = 'admin');
create policy "food_menus_admin_update"
  on public.food_menus for update to authenticated
  using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');
create policy "food_menus_admin_delete"
  on public.food_menus for delete to authenticated using (public.current_user_role() = 'admin');

create policy "wines_select_authenticated"
  on public.wines for select to authenticated using (true);
create policy "wines_admin_insert"
  on public.wines for insert to authenticated with check (public.current_user_role() = 'admin');
create policy "wines_admin_update"
  on public.wines for update to authenticated
  using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');
create policy "wines_admin_delete"
  on public.wines for delete to authenticated using (public.current_user_role() = 'admin');

create policy "wine_packages_select_authenticated"
  on public.wine_packages for select to authenticated using (true);
create policy "wine_packages_admin_insert"
  on public.wine_packages for insert to authenticated with check (public.current_user_role() = 'admin');
create policy "wine_packages_admin_update"
  on public.wine_packages for update to authenticated
  using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');
create policy "wine_packages_admin_delete"
  on public.wine_packages for delete to authenticated using (public.current_user_role() = 'admin');

-- ============================================================================
-- reservations
-- ============================================================================
alter table public.reservations enable row level security;

-- Admin: acceso total.
create policy "reservations_admin_all"
  on public.reservations
  for all
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- Holder: solo lectura, de todas las reservaciones.
create policy "reservations_holder_select_all"
  on public.reservations
  for select
  to authenticated
  using (public.current_user_role() = 'holder');

-- Guest: solo puede insertar y leer sus propias reservaciones
-- (guest_id = auth.uid()) — sin update/delete; los cambios de status/
-- payment_status y el soft delete siguen siendo exclusivos del admin
-- (app/admin/reservations/actions.ts), igual que antes de esta migración.
create policy "reservations_guest_select_own"
  on public.reservations
  for select
  to authenticated
  using (guest_id = auth.uid());

create policy "reservations_guest_insert_own"
  on public.reservations
  for insert
  to authenticated
  with check (guest_id = auth.uid());

-- ============================================================================
-- Bookings de servicios: spa_bookings, food_bookings, wine_orders
-- ============================================================================
-- Mismo patrón para los tres: admin acceso total; holder solo lectura de
-- todos; guest solo puede insertar/leer si la reservación asociada
-- (reservation_id) le pertenece — se resuelve con un EXISTS contra
-- `reservations`, que ya trae su propio RLS (guest_id = auth.uid()), así
-- que la subconsulta no necesita repetir ninguna lógica de rol.

alter table public.spa_bookings enable row level security;
alter table public.food_bookings enable row level security;
alter table public.wine_orders enable row level security;

create policy "spa_bookings_admin_all"
  on public.spa_bookings for all to authenticated
  using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');
create policy "spa_bookings_holder_select_all"
  on public.spa_bookings for select to authenticated
  using (public.current_user_role() = 'holder');
create policy "spa_bookings_guest_select_own"
  on public.spa_bookings for select to authenticated
  using (exists (
    select 1 from public.reservations r
    where r.id = spa_bookings.reservation_id and r.guest_id = auth.uid()
  ));
create policy "spa_bookings_guest_insert_own"
  on public.spa_bookings for insert to authenticated
  with check (exists (
    select 1 from public.reservations r
    where r.id = spa_bookings.reservation_id and r.guest_id = auth.uid()
  ));

create policy "food_bookings_admin_all"
  on public.food_bookings for all to authenticated
  using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');
create policy "food_bookings_holder_select_all"
  on public.food_bookings for select to authenticated
  using (public.current_user_role() = 'holder');
create policy "food_bookings_guest_select_own"
  on public.food_bookings for select to authenticated
  using (exists (
    select 1 from public.reservations r
    where r.id = food_bookings.reservation_id and r.guest_id = auth.uid()
  ));
create policy "food_bookings_guest_insert_own"
  on public.food_bookings for insert to authenticated
  with check (exists (
    select 1 from public.reservations r
    where r.id = food_bookings.reservation_id and r.guest_id = auth.uid()
  ));

create policy "wine_orders_admin_all"
  on public.wine_orders for all to authenticated
  using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');
create policy "wine_orders_holder_select_all"
  on public.wine_orders for select to authenticated
  using (public.current_user_role() = 'holder');
create policy "wine_orders_guest_select_own"
  on public.wine_orders for select to authenticated
  using (exists (
    select 1 from public.reservations r
    where r.id = wine_orders.reservation_id and r.guest_id = auth.uid()
  ));
create policy "wine_orders_guest_insert_own"
  on public.wine_orders for insert to authenticated
  with check (exists (
    select 1 from public.reservations r
    where r.id = wine_orders.reservation_id and r.guest_id = auth.uid()
  ));

-- ============================================================================
-- wine_order_items
-- ============================================================================
-- No tiene reservation_id propio (solo wine_order_id) — la pertenencia se
-- resuelve con un JOIN de dos saltos: wine_order_items -> wine_orders ->
-- reservations.
alter table public.wine_order_items enable row level security;

create policy "wine_order_items_admin_all"
  on public.wine_order_items for all to authenticated
  using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');
create policy "wine_order_items_holder_select_all"
  on public.wine_order_items for select to authenticated
  using (public.current_user_role() = 'holder');
create policy "wine_order_items_guest_select_own"
  on public.wine_order_items for select to authenticated
  using (exists (
    select 1
    from public.wine_orders wo
    join public.reservations r on r.id = wo.reservation_id
    where wo.id = wine_order_items.wine_order_id and r.guest_id = auth.uid()
  ));
create policy "wine_order_items_guest_insert_own"
  on public.wine_order_items for insert to authenticated
  with check (exists (
    select 1
    from public.wine_orders wo
    join public.reservations r on r.id = wo.reservation_id
    where wo.id = wine_order_items.wine_order_id and r.guest_id = auth.uid()
  ));
