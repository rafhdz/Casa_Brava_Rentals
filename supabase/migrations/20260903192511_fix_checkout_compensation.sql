-- Casa Brava Rentals — dos huecos de consistencia abiertos por las migraciones
-- de RLS (20260903184500) y disponibilidad (20260903190848):
--
--   1. Cancelar o hacer soft delete de una reservación no liberaba los bloques
--      de spa_availability que sus spa_bookings tenían tomados: quedaban
--      ocupados para siempre, sin forma de volver a ofertarlos desde la app.
--   2. La compensación de checkoutCartServices borraba food_bookings /
--      wine_orders con un `delete` del cliente de sesión del huésped, pero
--      ninguna política de RLS le daba permiso de DELETE sobre esas tablas —
--      así que borraba 0 filas EN SILENCIO (un `delete` sin permiso no es un
--      error en Postgres, simplemente no encuentra filas que la política deje
--      tocar) y un checkout fallido a medias dejaba filas huérfanas.

-- ============================================================================
-- 1) release_spa_slots_for_reservation — liberación de inventario de SPA
-- ============================================================================
-- Libera los bloques de spa_availability tomados por los spa_bookings de una
-- reservación, SIN borrar los bookings: cancelar o hacer soft delete de una
-- reservación conserva su historial de servicios contratados (es justo lo que
-- muestra el desglose de costos del modal de edición en ReservationsTable), lo
-- único que debe cambiar es que ese horario vuelva a estar a la venta.
--
-- Es una función aparte de release_spa_booking() a propósito: aquella es la
-- compensación de un checkout fallido —borra la reserva Y libera el bloque,
-- porque esa reserva nunca debió existir— y se autoriza contra el huésped
-- dueño. Ésta conserva la reserva, libera en bloque por reservación, y se
-- autoriza contra un admin, que es el único que puede cancelar o eliminar.
--
-- SECURITY DEFINER con search_path fijo, mismo criterio que las funciones de
-- la migración anterior: las políticas de spa_availability solo dejan escribir
-- a un admin, y aunque aquí el llamador YA es admin, la función necesita
-- ejecutarse con privilegios propios para no depender de que el rol efectivo
-- de la sesión resuelva la política en medio de una sentencia compuesta.
-- Verifica ella misma la autorización en vez de confiar en RLS.
--
-- El `not exists` final es defensivo: solo libera un bloque si ningún OTRO
-- booking activo lo está ocupando. En el flujo normal no puede pasar
-- (book_spa_slot garantiza un solo booking activo por bloque), pero cubre el
-- caso de una reservación que se cancela —liberando el bloque—, otro huésped
-- lo toma, y después un admin reactiva la primera: sin este guard, cancelarla
-- de nuevo liberaría un bloque que sí está legítimamente ocupado.
create or replace function public.release_spa_slots_for_reservation(p_reservation_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_released integer;
begin
  if public.current_user_role() is distinct from 'admin' then
    raise exception 'Solo un administrador puede liberar la disponibilidad de una reservación.';
  end if;

  update public.spa_availability sa
     set is_booked = false
    from public.spa_bookings sb
   where sb.reservation_id = p_reservation_id
     and sa.masseuse_id = sb.masseuse_id
     and sa.available_date = sb.date
     and sa.available_time = sb.time
     and sa.is_booked
     and not exists (
       select 1
       from public.spa_bookings other
       join public.reservations r on r.id = other.reservation_id
       where other.id <> sb.id
         and other.masseuse_id = sb.masseuse_id
         and other.date = sb.date
         and other.time = sb.time
         and r.status in ('pendiente', 'confirmada')
         and r.deleted_at is null
     );

  get diagnostics v_released = row_count;
  return v_released;
end;
$$;

comment on function public.release_spa_slots_for_reservation(uuid) is
  'Libera los bloques de spa_availability tomados por los spa_bookings de una reservación, sin borrar los bookings. Para cancelación/soft delete desde el panel admin; solo ejecutable por un admin.';

revoke execute on function public.release_spa_slots_for_reservation(uuid) from public, anon;
grant execute on function public.release_spa_slots_for_reservation(uuid) to authenticated;

-- ============================================================================
-- 2) Políticas de DELETE para la compensación del checkout
-- ============================================================================
-- Se eligieron políticas RLS y no funciones SECURITY DEFINER (las dos opciones
-- eran válidas) porque aquí lo único que hay que autorizar es "esta fila es
-- tuya": una política declarativa expresa exactamente eso, es simétrica con
-- las *_guest_insert_own / *_guest_select_own que ya existen sobre estas mismas
-- tablas, y no agrega un punto de entrada privilegiado nuevo que tenga que
-- reimplementar la autorización en plpgsql. El spa sigue necesitando su
-- función porque su compensación no es solo un borrado: tiene que borrar el
-- booking Y liberar el bloque de spa_availability de forma atómica, y esa
-- segunda escritura cae sobre un catálogo que el huésped no puede tocar.
--
-- El alcance es deliberadamente más estrecho que la mera pertenencia: además
-- de exigir que la reservación asociada sea del huésped, exige que siga activa
-- ('pendiente' o 'confirmada', sin deleted_at) — exactamente el mismo conjunto
-- de reservaciones al que checkoutCartServices puede adjuntar servicios. Así,
-- un huésped no puede borrar servicios de una estadía ya cancelada o
-- finalizada, que es historial y no debería poder reescribirse desde el
-- cliente.
--
-- wine_order_items NO necesita política propia: se borra por el
-- `on delete cascade` de su FK a wine_orders, y las acciones referenciales de
-- una llave foránea no evalúan RLS sobre la tabla hija.

create policy "food_bookings_guest_delete_own"
  on public.food_bookings for delete to authenticated
  using (exists (
    select 1 from public.reservations r
    where r.id = food_bookings.reservation_id
      and r.guest_id = auth.uid()
      and r.status in ('pendiente', 'confirmada')
      and r.deleted_at is null
  ));

create policy "wine_orders_guest_delete_own"
  on public.wine_orders for delete to authenticated
  using (exists (
    select 1 from public.reservations r
    where r.id = wine_orders.reservation_id
      and r.guest_id = auth.uid()
      and r.status in ('pendiente', 'confirmada')
      and r.deleted_at is null
  ));
