-- Datos iniciales de desarrollo local. Este archivo se ejecuta automáticamente
-- con `supabase db reset`. lib/mock-data.ts ya no existe — todo el contenido
-- que antes vivía ahí (usuarios, tarifas, catálogos de servicios, fotos,
-- amenidades y tarjetas de servicios adicionales) se siembra aquí en su
-- forma real.
--
-- Nota: no se siembran reservaciones/bookings de ejemplo — las tablas de
-- reservaciones/bookings quedan vacías pero listas para usarse con datos
-- reales (`/reservar`, `/carrito`, o los formularios "Crear..." de `/admin`).

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

-- ============================================================================
-- spa_availability — reemplaza SPA_AVAILABILITY de lib/mock-data.ts
-- ============================================================================
-- Las fechas son relativas a `current_date` a propósito: el mock tenía días
-- ISO fijos (2026-09-02, etc.) que quedaban en el pasado conforme avanzaba el
-- tiempo y dejaban el calendario completamente deshabilitado. Así, cualquier
-- `supabase db reset` deja el entorno local con disponibilidad vigente sin
-- tener que editar el seed.
--
-- Se busca la masajista por `name` (no por id) porque los ids son
-- gen_random_uuid() y cambian en cada reset — mismo criterio por el que el
-- mock estaba keyed por nombre.

insert into public.spa_availability (masseuse_id, available_date, available_time)
select m.id, current_date + d, t
from public.spa_masseuses m
cross join unnest(array[0, 1, 3, 6, 8]) as d
cross join unnest(array['10:00', '12:00', '14:00', '16:00']::time[]) as t
where m.name = 'Ana';

insert into public.spa_availability (masseuse_id, available_date, available_time)
select m.id, current_date + d, t
from public.spa_masseuses m
cross join unnest(array[0, 2, 4, 7, 9]) as d
cross join unnest(array['09:00', '11:00', '15:00', '17:00']::time[]) as t
where m.name = 'Carlos';

insert into public.spa_availability (masseuse_id, available_date, available_time)
select m.id, current_date + d, t
from public.spa_masseuses m
cross join unnest(array[1, 2, 5, 8, 10]) as d
cross join unnest(array['10:00', '13:00', '16:00']::time[]) as t
where m.name = 'Laura';

-- ============================================================================
-- food_availability — reemplaza FOOD_AVAILABLE_DATES de lib/mock-data.ts
-- ============================================================================
-- Servicio de cocina disponible los próximos 7 días (hoy incluido), también
-- relativo a `current_date` por el mismo motivo que spa_availability.

insert into public.food_availability (available_date)
select current_date + d
from generate_series(0, 6) as d;

-- ============================================================================
-- property_photos — reemplaza PROPERTY_PHOTOS de lib/mock-data.ts
-- ============================================================================
-- sort_order preserva el recorrido curado original del carrusel (jardín →
-- estacionamiento → entradas → terraza → habitaciones, en ese orden).

insert into public.property_photos (url, label, sort_order) values
  ('/images/jardin_1.jpeg', 'Jardín', 1),
  ('/images/jardin_2.jpeg', 'Jardín', 2),
  ('/images/jardin_3.jpeg', 'Jardín', 3),
  ('/images/jardin_4.jpeg', 'Jardín', 4),
  ('/images/jardin_5.jpeg', 'Jardín', 5),
  ('/images/parking_1.jpeg', 'Estacionamiento', 6),
  ('/images/parking_2.jpeg', 'Estacionamiento', 7),
  ('/images/parking_3.jpeg', 'Estacionamiento', 8),
  ('/images/parking_4.jpeg', 'Estacionamiento', 9),
  ('/images/parking_5.jpeg', 'Estacionamiento', 10),
  ('/images/ent_principal_lat_1.jpeg', 'Entrada Principal Lateral', 11),
  ('/images/ent_principal_lat_2.jpeg', 'Entrada Principal Lateral', 12),
  ('/images/ent_principal_1.jpeg', 'Entrada Principal', 13),
  ('/images/ent_principal_2.jpeg', 'Entrada Principal', 14),
  ('/images/terraza_1.jpeg', 'Terraza', 15),
  ('/images/terraza_2.jpeg', 'Terraza', 16),
  ('/images/terraza_3.jpeg', 'Terraza', 17),
  ('/images/terraza_4.jpeg', 'Terraza', 18),
  ('/images/del_mezzanine_1.jpeg', 'Habitación del Mezzanine', 19),
  ('/images/del_mezzanine_2.jpeg', 'Habitación del Mezzanine', 20),
  ('/images/del_mezzanine_3.jpeg', 'Habitación del Mezzanine', 21),
  ('/images/del_mezzanine_4.jpeg', 'Habitación del Mezzanine', 22),
  ('/images/de_la_terraza_1.jpeg', 'Habitación de la Terraza', 23),
  ('/images/de_la_terraza_2.jpeg', 'Habitación de la Terraza', 24),
  ('/images/de_la_terraza_3.jpeg', 'Habitación de la Terraza', 25),
  ('/images/de_la_terraza_4.jpeg', 'Habitación de la Terraza', 26),
  ('/images/de_la_terraza_5.jpeg', 'Habitación de la Terraza', 27),
  ('/images/sala_tv_1.jpeg', 'Sala de TV', 28),
  ('/images/sala_tv_2.jpeg', 'Sala de TV', 29),
  ('/images/sala_tv_3.jpeg', 'Sala de TV', 30),
  ('/images/sala_tv_4.jpeg', 'Sala de TV', 31),
  ('/images/pas_principal.jpeg', 'Pasillo Principal', 32),
  ('/images/amarillo_1.jpeg', 'Habitación Amarilla', 33),
  ('/images/amarillo_2.jpeg', 'Habitación Amarilla', 34),
  ('/images/amarillo_3.jpeg', 'Habitación Amarilla', 35),
  ('/images/amarillo_4.jpeg', 'Habitación Amarilla', 36),
  ('/images/amarillo_5.jpeg', 'Habitación Amarilla', 37),
  ('/images/principal_1.jpeg', 'Habitación Principal', 38),
  ('/images/principal_2.jpeg', 'Habitación Principal', 39),
  ('/images/principal_3.jpeg', 'Habitación Principal', 40),
  ('/images/principal_4.jpeg', 'Habitación Principal', 41),
  ('/images/principal_5.jpeg', 'Habitación Principal', 42),
  ('/images/principal_6.jpeg', 'Habitación Principal', 43),
  ('/images/principal_7.jpeg', 'Habitación Principal', 44),
  ('/images/de_la_fuente_1.jpeg', 'Habitación de la Fuente', 45),
  ('/images/de_la_fuente_2.jpeg', 'Habitación de la Fuente', 46),
  ('/images/de_la_fuente_3.jpeg', 'Habitación de la Fuente', 47),
  ('/images/de_la_fuente_4.jpeg', 'Habitación de la Fuente', 48),
  ('/images/de_mane_1.jpeg', 'Habitación de Mane', 49),
  ('/images/de_mane_2.jpeg', 'Habitación de Mane', 50),
  ('/images/de_mane_3.jpeg', 'Habitación de Mane', 51),
  ('/images/de_mane_4.jpeg', 'Habitación de Mane', 52),
  ('/images/de_mane_5.jpeg', 'Habitación de Mane', 53),
  ('/images/de_mane_6.jpeg', 'Habitación de Mane', 54),
  ('/images/de_mane_7.jpeg', 'Habitación de Mane', 55),
  ('/images/de_mane_8.jpeg', 'Habitación de Mane', 56),
  ('/images/de_mane_9.jpeg', 'Habitación de Mane', 57),
  ('/images/de_la_abuela_1.jpeg', 'Habitación de la Abuela', 58),
  ('/images/de_la_abuela_2.jpeg', 'Habitación de la Abuela', 59),
  ('/images/de_la_abuela_3.jpeg', 'Habitación de la Abuela', 60);

-- ============================================================================
-- amenity_categories / amenities — reemplazan AMENITIES de lib/mock-data.ts
-- ============================================================================

insert into public.amenity_categories (name, sort_order) values
  ('Baño', 1),
  ('Habitación y lavandería', 2),
  ('Espacio para guardar ropa', 3),
  ('Entretenimiento', 4),
  ('Calefacción y refrigeración', 5),
  ('Seguridad en el hogar', 6),
  ('Internet y oficina', 7),
  ('Cocina y comedor', 8),
  ('Características de la ubicación', 9),
  ('Exterior', 10),
  ('Estacionamiento', 11);

-- Se busca la categoría por `name` (no por id) por el mismo motivo que
-- spa_availability busca a la masajista por `name`: los ids son
-- gen_random_uuid() y cambian en cada reset.
insert into public.amenities (category_id, name, icon_url, sort_order)
select c.id, v.name, v.icon_url, v.sort_order
from public.amenity_categories c
join (values
  ('Baño', 'Jabón corporal', '/icons/amenities/baño/jabon_corporal.svg', 1),
  ('Baño', 'Regadera interior', '/icons/amenities/baño/regadera_interior.svg', 2),
  ('Baño', 'Agua caliente', '/icons/amenities/baño/agua_caliente.svg', 3),

  ('Habitación y lavandería', 'Ganchos', '/icons/amenities/habitación/ganchos.svg', 1),
  ('Habitación y lavandería', 'Ventanas blackout', '/icons/amenities/habitación/ventana_blackout.svg', 2),
  ('Habitación y lavandería', 'Mosquitero', '/icons/amenities/habitación/mosquitera.svg', 3),

  ('Espacio para guardar ropa', 'Clóset', '/icons/amenities/habitación/closet.svg', 1),

  ('Entretenimiento', 'Televisión', '/icons/amenities/entrenimiento/tv.svg', 1),
  ('Entretenimiento', 'Libros y material de lectura', '/icons/amenities/entrenimiento/libros.svg', 2),

  ('Calefacción y refrigeración', 'Aire acondicionado', '/icons/amenities/calefacción/ac.svg', 1),
  ('Calefacción y refrigeración', 'Ventilador de techo', '/icons/amenities/calefacción/fan.svg', 2),

  ('Seguridad en el hogar', 'Cámaras de seguridad dentro de la propiedad', '/icons/amenities/seguridad/camara.svg', 1),

  ('Internet y oficina', 'Wifi de alta velocidad', '/icons/amenities/internet/wifi.svg', 1),

  ('Cocina y comedor', 'Refrigerador', '/icons/amenities/cocina/fridge.svg', 1),
  ('Cocina y comedor', 'Microondas', '/icons/amenities/cocina/microwave.svg', 2),
  ('Cocina y comedor', 'Utensilios básicos para cocinar', '/icons/amenities/cocina/utensils.svg', 3),
  ('Cocina y comedor', 'Platos y cubiertos', '/icons/amenities/cocina/dishes.svg', 4),
  ('Cocina y comedor', 'Cristalería', '/icons/amenities/cocina/glass.svg', 5),
  ('Cocina y comedor', 'Congelador', '/icons/amenities/cocina/fridge.svg', 6),
  ('Cocina y comedor', 'Estufa de gas', '/icons/amenities/cocina/stove.svg', 7),
  ('Cocina y comedor', 'Cafetera', '/icons/amenities/cocina/coffee_machine.svg', 8),
  ('Cocina y comedor', 'Cafetera de filtro', '/icons/amenities/cocina/coffee_machine.svg', 9),
  ('Cocina y comedor', 'Tostador', '/icons/amenities/cocina/toaster.svg', 10),
  ('Cocina y comedor', 'Licuadora', '/icons/amenities/cocina/licuadora.svg', 11),

  ('Características de la ubicación', '5 minutos del centro del pueblo', '/icons/amenities/ubicación/location.svg', 1),

  ('Exterior', 'Jardín privado', '/icons/amenities/exterior/jardin.svg', 1),
  ('Exterior', 'Muebles exteriores', '/icons/amenities/exterior/mueble_exterior.svg', 2),

  ('Estacionamiento', 'Estacionamiento privado de 8 plazas', '/icons/amenities/exterior/parking.svg', 1)
) as v(category_name, name, icon_url, sort_order) on c.name = v.category_name;

-- ============================================================================
-- additional_services_info — reemplaza ADDITIONAL_SERVICES de lib/mock-data.ts
-- ============================================================================

insert into public.additional_services_info (id, title, description, image_url, price_hint) values
  (
    'comida',
    'Comida',
    'Desayunos, almuerzos y cenas preparados por un cocinero local durante tu estadía.',
    '/images/servicio_comida_holder.jpg',
    'Desde $200 / persona'
  ),
  (
    'spa',
    'SPA / Masajes',
    'Sesiones de masaje relajante o terapéutico directamente en el spa de la propiedad, con nuestras masajistas.',
    '/images/servicio_spa_holder.jpg',
    'Desde $600 / sesión de una hora'
  ),
  (
    'vinos',
    'Paquete de Vinos',
    'Selección de vinos Parvada disponibles a un precio exclusivo, entregados antes de tu estancia.',
    '/images/paquete_vinos_holder.jpg',
    'Desde $2250 / paquete'
  );
