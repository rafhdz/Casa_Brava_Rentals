-- Casa Brava Rentals — contenido visual del Home deja de vivir en
-- lib/mock-data.ts (PROPERTY_PHOTOS, AMENITIES, ADDITIONAL_SERVICES) y pasa a
-- ser real: fotos del carrusel, amenidades agrupadas por categoría, y la
-- información de las 3 tarjetas de servicios adicionales. Con esta migración
-- ya no queda ningún dato de negocio (precio, texto, imagen) hardcodeado en
-- el frontend salvo SPA_SESSION_PRICE (no hay columna de precio en
-- spa_masseuses — fuera de alcance de este cambio, ver CLAUDE.md).

-- ============================================================================
-- property_photos — reemplaza PROPERTY_PHOTOS
-- ============================================================================
-- Una fila por foto del carrusel del Home. `sort_order` es el orden real de
-- despliegue (el carrusel no reordena por nombre ni por fecha de inserción,
-- así que sin esta columna el orden curado del recorrido por la casa —
-- jardín, estacionamiento, entrada, habitaciones...— se perdería).
create table public.property_photos (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  label text not null,
  sort_order integer not null,
  created_at timestamptz not null default now()
);

create index property_photos_sort_order_idx on public.property_photos (sort_order);

-- ============================================================================
-- amenity_categories / amenities — reemplazan AMENITIES
-- ============================================================================
-- Dos tablas (categoría + amenidad), no una sola con un campo de texto para
-- la categoría: así una categoría es una entidad direccionable con su propio
-- id y orden, en vez de repetir el nombre de la categoría como string en cada
-- fila de amenidad — mismo criterio relacional que ya separa spa_masseuses de
-- spa_bookings o food_menus de food_bookings en el resto del esquema.
--
-- `amenities.sort_order` no estaba en la lista original de columnas pedida,
-- pero se agrega por el mismo motivo que property_photos: preservar el orden
-- curado dentro de cada categoría (ej. "Jabón corporal, Regadera interior,
-- Agua caliente" en Baño) — sin ella, la única forma de ordenar de manera
-- determinística sería alfabéticamente, perdiendo ese orden.
create table public.amenity_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null,
  created_at timestamptz not null default now()
);

create index amenity_categories_sort_order_idx on public.amenity_categories (sort_order);

create table public.amenities (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.amenity_categories (id) on delete cascade,
  name text not null,
  icon_url text not null,
  sort_order integer not null,
  created_at timestamptz not null default now()
);

create index amenities_category_sort_idx on public.amenities (category_id, sort_order);

-- ============================================================================
-- additional_services_info — reemplaza ADDITIONAL_SERVICES
-- ============================================================================
-- `id` es texto (no uuid) a propósito: components/ServiceCard.tsx enlaza a
-- `/servicios/${service.id}`, así que el id tiene que coincidir exactamente
-- con el nombre de carpeta de ruta bajo app/servicios/ ("spa", "comida",
-- "vinos") — mismo contrato que ya documentaba CLAUDE.md para el mock. El
-- check constraint hace ese contrato explícito en el esquema: un admin no
-- puede insertar una cuarta fila con un id que no tenga página de servicio
-- real detrás.
create table public.additional_services_info (
  id text primary key,
  title text not null,
  description text not null,
  image_url text not null,
  price_hint text not null,
  created_at timestamptz not null default now(),
  constraint additional_services_info_id_check check (id in ('spa', 'comida', 'vinos'))
);

-- ============================================================================
-- RLS
-- ============================================================================
-- A diferencia de los catálogos de servicios (spa_masseuses, food_menus,
-- etc.), cuya lectura es solo para `authenticated`, estas 4 tablas alimentan
-- el Home — de ahí que la lectura sea pública (`to public`, cubre anon Y
-- authenticated) en vez de restringida a sesión. Hoy `/` de todos modos exige
-- sesión vía middleware.ts, así que el acceso anónimo no se ejerce en la
-- práctica, pero el contrato de estas tablas no depende de esa regla de
-- middleware —que puede cambiar— y es contenido de marketing sin ningún dato
-- sensible. Escritura exclusiva de admin, mismo patrón que el resto de los
-- catálogos del esquema.
alter table public.property_photos enable row level security;
alter table public.amenity_categories enable row level security;
alter table public.amenities enable row level security;
alter table public.additional_services_info enable row level security;

create policy "property_photos_select_public"
  on public.property_photos for select to public using (true);
create policy "property_photos_admin_insert"
  on public.property_photos for insert to authenticated with check (public.current_user_role() = 'admin');
create policy "property_photos_admin_update"
  on public.property_photos for update to authenticated
  using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');
create policy "property_photos_admin_delete"
  on public.property_photos for delete to authenticated using (public.current_user_role() = 'admin');

create policy "amenity_categories_select_public"
  on public.amenity_categories for select to public using (true);
create policy "amenity_categories_admin_insert"
  on public.amenity_categories for insert to authenticated with check (public.current_user_role() = 'admin');
create policy "amenity_categories_admin_update"
  on public.amenity_categories for update to authenticated
  using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');
create policy "amenity_categories_admin_delete"
  on public.amenity_categories for delete to authenticated using (public.current_user_role() = 'admin');

create policy "amenities_select_public"
  on public.amenities for select to public using (true);
create policy "amenities_admin_insert"
  on public.amenities for insert to authenticated with check (public.current_user_role() = 'admin');
create policy "amenities_admin_update"
  on public.amenities for update to authenticated
  using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');
create policy "amenities_admin_delete"
  on public.amenities for delete to authenticated using (public.current_user_role() = 'admin');

create policy "additional_services_info_select_public"
  on public.additional_services_info for select to public using (true);
create policy "additional_services_info_admin_insert"
  on public.additional_services_info for insert to authenticated with check (public.current_user_role() = 'admin');
create policy "additional_services_info_admin_update"
  on public.additional_services_info for update to authenticated
  using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');
create policy "additional_services_info_admin_delete"
  on public.additional_services_info for delete to authenticated using (public.current_user_role() = 'admin');
