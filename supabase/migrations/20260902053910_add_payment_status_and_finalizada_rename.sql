-- Casa Brava Rentals — dual-status para reservaciones (status operativo +
-- payment_status de cobro) y renombre de 'pasada' a 'finalizada' en el ENUM
-- reservation_status, para que coincida con la etiqueta de UI "Finalizada".
-- Ver CLAUDE.md, sección "CRUD de reservaciones".

-- ============================================================================
-- Renombre de valor de ENUM existente
-- ============================================================================
-- RENAME VALUE actualiza el label de un valor ya existente en pg_enum — no
-- inserta una fila nueva, así que no cae bajo la restricción de ADD VALUE
-- (que no permite usar un valor recién agregado dentro de la misma
-- transacción en la que se agregó). Ningún código depende hoy del valor real
-- 'pasada' (el enum nunca fue consumido por ningún componente todavía; solo
-- un tipo mock no relacionado usaba ese mismo string).
alter type public.reservation_status rename value 'pasada' to 'finalizada';

-- ============================================================================
-- payment_status — segundo estado independiente del cobro, para soportar
-- depósitos/pagos parciales sin acoplarlo al status operativo de la
-- reservación.
-- ============================================================================
create type public.payment_status_type as enum ('pendiente', 'parcial', 'completado', 'reembolsado');

alter table public.reservations
  add column payment_status public.payment_status_type not null default 'pendiente';
