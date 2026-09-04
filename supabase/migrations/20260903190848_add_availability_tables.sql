-- Casa Brava Rentals — disponibilidad real de servicios adicionales (SPA y Comida).
--
-- Reemplaza los mapas mockeados SPA_AVAILABILITY / FOOD_AVAILABLE_DATES que
-- vivían en lib/mock-data.ts (ver CLAUDE.md, sección "Carrito de servicios
-- adicionales"): hasta esta migración el catálogo de masajistas/menús ya era
-- real, pero los días y horarios que se ofrecían al huésped eran listas fijas
-- en el código, sin ninguna forma de detectar que un horario ya había sido
-- tomado por otro huésped.

-- ============================================================================
-- spa_availability
-- ============================================================================
-- Una fila por bloque de hora ofertado (masajista + día + hora), no un arreglo
-- de horas por día: así cada bloque tiene identidad propia y puede marcarse
-- como ocupado individualmente, que es lo que habilita el control de
-- colisiones de book_spa_slot() más abajo. La unicidad de
-- (masseuse_id, available_date, available_time) es lo que hace que ese bloque
-- sea direccionable sin ambigüedad desde el checkout.
--
-- `is_booked` es una bandera derivada: la mantiene exclusivamente
-- book_spa_slot() / release_spa_booking() (nunca la aplicación directamente).
-- Existe porque las políticas RLS de spa_bookings solo dejan a un huésped ver
-- SUS propias reservas de spa — sin esta bandera en el catálogo (que sí es de
-- lectura pública para autenticados) el formulario no tendría forma de saber
-- que otro huésped ya tomó el horario.
create table public.spa_availability (
  id uuid primary key default gen_random_uuid(),
  masseuse_id uuid not null references public.spa_masseuses (id) on delete cascade,
  available_date date not null,
  available_time time not null,
  is_booked boolean not null default false,
  created_at timestamptz not null default now(),
  constraint spa_availability_unique_slot unique (masseuse_id, available_date, available_time)
);

create index spa_availability_masseuse_date_idx
  on public.spa_availability (masseuse_id, available_date);

-- ============================================================================
-- food_availability
-- ============================================================================
-- El servicio de cocina se oferta por día completo, no por bloque de hora, y
-- no compite entre huéspedes (varios pueden pedir Desayuno y Cena el mismo
-- día), así que aquí no hay bandera de ocupado ni control de colisiones: solo
-- la lista de días habilitados.
create table public.food_availability (
  id uuid primary key default gen_random_uuid(),
  available_date date not null unique,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- book_spa_slot — reserva atómica de un bloque de spa
-- ============================================================================
-- Toma el bloque de disponibilidad Y crea la fila de spa_bookings en una sola
-- transacción (el cuerpo de una función plpgsql es atómico): o pasan las dos
-- cosas, o no pasa ninguna. Ese es el punto — hacerlo desde la aplicación con
-- dos llamadas separadas de supabase-js dejaría una ventana en la que el
-- bloque queda tomado sin reserva asociada, o peor, dos huéspedes pasando la
-- misma verificación antes de que cualquiera de los dos inserte.
--
-- El `for update` sobre la fila de spa_availability es lo que serializa de
-- verdad a dos huéspedes concurrentes: el segundo se bloquea hasta que el
-- primero confirma su transacción, y para cuando lo evalúa ya ve is_booked =
-- true. La verificación adicional contra spa_bookings (reservaciones
-- 'pendiente'/'confirmada' y no borradas) es la que exige el requisito
-- funcional y cubre además el caso de una fila de disponibilidad que se
-- hubiera reinsertado a mano con is_booked = false.
--
-- SECURITY DEFINER a propósito, con el mismo criterio que
-- public.current_user_role() (ver migración de RLS): las políticas de
-- spa_availability dejan escribir solo a un admin, y esta función es la única
-- excepción controlada a esa regla. Por eso valida ella misma la autorización
-- —que la reservación destino pertenezca a quien llama y siga activa— en vez
-- de confiar en RLS, y por eso lleva search_path fijo.
create or replace function public.book_spa_slot(
  p_reservation_id uuid,
  p_masseuse_id uuid,
  p_date date,
  p_time time,
  p_price decimal
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot_is_booked boolean;
  v_booking_id uuid;
begin
  if not exists (
    select 1
    from public.reservations r
    where r.id = p_reservation_id
      and r.guest_id = auth.uid()
      and r.status in ('pendiente', 'confirmada')
      and r.deleted_at is null
  ) then
    raise exception 'No tienes permiso para agregar servicios a esta reservación.';
  end if;

  select sa.is_booked
    into v_slot_is_booked
    from public.spa_availability sa
   where sa.masseuse_id = p_masseuse_id
     and sa.available_date = p_date
     and sa.available_time = p_time
     for update;

  if not found then
    raise exception 'El horario seleccionado ya no está disponible con esa masajista.';
  end if;

  if v_slot_is_booked then
    raise exception 'El horario seleccionado ya fue ocupado por otra reservación.';
  end if;

  if exists (
    select 1
    from public.spa_bookings sb
    join public.reservations r on r.id = sb.reservation_id
    where sb.masseuse_id = p_masseuse_id
      and sb.date = p_date
      and sb.time = p_time
      and r.status in ('pendiente', 'confirmada')
      and r.deleted_at is null
  ) then
    raise exception 'El horario seleccionado ya fue ocupado por otra reservación.';
  end if;

  insert into public.spa_bookings (reservation_id, masseuse_id, date, time, price_per_hour)
  values (p_reservation_id, p_masseuse_id, p_date, p_time, p_price)
  returning id into v_booking_id;

  update public.spa_availability
     set is_booked = true
   where masseuse_id = p_masseuse_id
     and available_date = p_date
     and available_time = p_time;

  return v_booking_id;
end;
$$;

comment on function public.book_spa_slot(uuid, uuid, date, time, decimal) is
  'Reserva un bloque de spa_availability y crea su spa_bookings en una sola transacción. SECURITY DEFINER: es la única vía por la que un huésped escribe en spa_availability, y valida por sí misma que la reservación destino le pertenezca.';

-- ============================================================================
-- release_spa_booking — deshace lo que hizo book_spa_slot
-- ============================================================================
-- Necesaria para la compensación del checkout: si el carrito falla a medias
-- después de haber reservado un spa, hay que borrar la reserva Y liberar el
-- bloque. Un DELETE directo desde la aplicación no sirve para ninguna de las
-- dos cosas — el huésped no tiene política de DELETE sobre spa_bookings ni de
-- UPDATE sobre spa_availability —, así que la única forma de compensar es
-- esta función, con la misma verificación de pertenencia que book_spa_slot.
create or replace function public.release_spa_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_masseuse_id uuid;
  v_date date;
  v_time time;
begin
  select sb.masseuse_id, sb.date, sb.time
    into v_masseuse_id, v_date, v_time
    from public.spa_bookings sb
    join public.reservations r on r.id = sb.reservation_id
   where sb.id = p_booking_id
     and r.guest_id = auth.uid();

  if not found then
    return;
  end if;

  delete from public.spa_bookings where id = p_booking_id;

  update public.spa_availability
     set is_booked = false
   where masseuse_id = v_masseuse_id
     and available_date = v_date
     and available_time = v_time;
end;
$$;

comment on function public.release_spa_booking(uuid) is
  'Compensación de book_spa_slot: borra la reserva de spa del huésped autenticado y libera su bloque de disponibilidad. No hace nada si la reserva no existe o no le pertenece.';

-- Las funciones SECURITY DEFINER se crean con EXECUTE para PUBLIC por
-- defecto; se restringe a usuarios autenticados (un anónimo tampoco pasaría
-- la verificación de pertenencia, porque auth.uid() sería null, pero es mejor
-- no exponer el punto de entrada en absoluto).
revoke execute on function public.book_spa_slot(uuid, uuid, date, time, decimal) from public, anon;
revoke execute on function public.release_spa_booking(uuid) from public, anon;
grant execute on function public.book_spa_slot(uuid, uuid, date, time, decimal) to authenticated;
grant execute on function public.release_spa_booking(uuid) to authenticated;

-- ============================================================================
-- Índice de apoyo para la verificación de colisiones
-- ============================================================================
create index spa_bookings_masseuse_slot_idx
  on public.spa_bookings (masseuse_id, date, time);

-- ============================================================================
-- RLS
-- ============================================================================
-- Mismo patrón que los seis catálogos de la migración anterior: lectura para
-- cualquier usuario autenticado, escritura exclusiva de admin. La escritura
-- que necesita el checkout del huésped no pasa por aquí — va por
-- book_spa_slot()/release_spa_booking(), que son SECURITY DEFINER.

alter table public.spa_availability enable row level security;
alter table public.food_availability enable row level security;

create policy "spa_availability_select_authenticated"
  on public.spa_availability for select to authenticated using (true);
create policy "spa_availability_admin_insert"
  on public.spa_availability for insert to authenticated with check (public.current_user_role() = 'admin');
create policy "spa_availability_admin_update"
  on public.spa_availability for update to authenticated
  using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');
create policy "spa_availability_admin_delete"
  on public.spa_availability for delete to authenticated using (public.current_user_role() = 'admin');

create policy "food_availability_select_authenticated"
  on public.food_availability for select to authenticated using (true);
create policy "food_availability_admin_insert"
  on public.food_availability for insert to authenticated with check (public.current_user_role() = 'admin');
create policy "food_availability_admin_update"
  on public.food_availability for update to authenticated
  using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');
create policy "food_availability_admin_delete"
  on public.food_availability for delete to authenticated using (public.current_user_role() = 'admin');
