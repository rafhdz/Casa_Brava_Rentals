-- Casa Brava Rentals — bloqueo preventivo al reactivar reservaciones canceladas.
--
-- Hueco: cancelar o hacer soft delete de una reservación libera sus bloques de
-- spa_availability (release_spa_slots_for_reservation, migración
-- 20260903192511). Pero si un admin la reactiva después (status vuelve de
-- 'cancelada'/'finalizada' a 'pendiente'/'confirmada'), nada intentaba volver
-- a tomar esos bloques — si otro huésped ya los había reservado mientras
-- tanto, la reactivación dejaba dos reservaciones activas sobre el mismo
-- horario de spa, exactamente el double-booking que book_spa_slot() existe
-- para evitar en el flujo normal del huésped.

-- ============================================================================
-- reacquire_spa_slots_for_reservation — re-adquisición de inventario de SPA
-- ============================================================================
-- Recorre los spa_bookings de la reservación y, para cada uno, bloquea
-- (`for update`) la fila de spa_availability correspondiente. Si el bloque
-- está ocupado por OTRO booking activo (de otra reservación 'pendiente' o
-- 'confirmada', no borrada), aborta con una excepción — el mensaje empieza
-- con 'SPA_SLOT_TAKEN' a propósito, para que la Server Action que la llama
-- pueda distinguir este caso de cualquier otro error de Postgres sin
-- parsear texto en español. Si el bloque está libre (o ya está marcado como
-- ocupado por este mismo booking, ej. porque nunca se liberó correctamente),
-- lo marca is_booked = true.
--
-- El cuerpo de una función plpgsql es atómico: si CUALQUIER bloque de la
-- reservación resulta ocupado, la excepción revierte toda la re-adquisición
-- (no deja algunos bloques tomados y otros no) — no hace falta un bloque
-- explícito de rollback manual. La Server Action, a su vez, debe llamar a
-- esta función ANTES de aplicar el cambio de status sobre `reservations`,
-- para poder abortar la reactivación por completo si esto falla (ver
-- app/admin/reservations/actions.ts).
--
-- Misma autorización que release_spa_slots_for_reservation: SECURITY DEFINER
-- con search_path fijo, valida ella misma que quien llama sea admin (las
-- políticas de spa_availability solo dejan escribir a un admin, y esta
-- función es una excepción controlada a esa regla).
--
-- Se ordena el recorrido por (masseuse_id, available_date, available_time)
-- para que dos llamadas concurrentes que compartan algún bloque siempre lo
-- bloqueen en el mismo orden — mismo criterio general que evita deadlocks al
-- tomar múltiples locks `for update` en una transacción.
create or replace function public.reacquire_spa_slots_for_reservation(p_reservation_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking record;
  v_slot_is_booked boolean;
  v_reacquired integer := 0;
begin
  if public.current_user_role() is distinct from 'admin' then
    raise exception 'Solo un administrador puede reactivar la disponibilidad de una reservación.';
  end if;

  for v_booking in
    select sb.id, sb.masseuse_id, sb.date, sb.time
    from public.spa_bookings sb
    where sb.reservation_id = p_reservation_id
    order by sb.masseuse_id, sb.date, sb.time
  loop
    select sa.is_booked
      into v_slot_is_booked
      from public.spa_availability sa
     where sa.masseuse_id = v_booking.masseuse_id
       and sa.available_date = v_booking.date
       and sa.available_time = v_booking.time
       for update;

    if not found then
      raise exception 'SPA_SLOT_TAKEN: el horario original de spa ya no existe en el catálogo.';
    end if;

    if v_slot_is_booked then
      -- Solo es un conflicto real si el bloque está tomado por OTRO booking
      -- activo. Si el único booking sobre ese bloque es este mismo (el
      -- release nunca corrió, o el bloque nunca se liberó por algún motivo),
      -- no hay nada de qué protegerse: re-adquirirlo es un no-op seguro.
      if exists (
        select 1
        from public.spa_bookings other
        join public.reservations r on r.id = other.reservation_id
        where other.id <> v_booking.id
          and other.masseuse_id = v_booking.masseuse_id
          and other.date = v_booking.date
          and other.time = v_booking.time
          and r.status in ('pendiente', 'confirmada')
          and r.deleted_at is null
      ) then
        raise exception 'SPA_SLOT_TAKEN: uno o más horarios de spa originales ya fueron ocupados por otro huésped.';
      end if;
    end if;

    update public.spa_availability
       set is_booked = true
     where masseuse_id = v_booking.masseuse_id
       and available_date = v_booking.date
       and available_time = v_booking.time;

    v_reacquired := v_reacquired + 1;
  end loop;

  return v_reacquired;
end;
$$;

comment on function public.reacquire_spa_slots_for_reservation(uuid) is
  'Vuelve a tomar los bloques de spa_availability de los spa_bookings de una reservación, para cuando un admin la reactiva (cancelada/finalizada -> pendiente/confirmada). Lanza una excepción con prefijo SPA_SLOT_TAKEN si algún bloque ya fue tomado por otra reservación activa. Solo ejecutable por un admin.';

revoke execute on function public.reacquire_spa_slots_for_reservation(uuid) from public, anon;
grant execute on function public.reacquire_spa_slots_for_reservation(uuid) to authenticated;
