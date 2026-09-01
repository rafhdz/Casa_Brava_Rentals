# Guía del proyecto — Casa Brava Rentals (Prototipo Visual)

Este documento explica, en términos sencillos, cómo está organizado el código y dónde tocar cada cosa. Está pensado para cualquier persona del equipo que necesite editar el prototipo antes de la demo con el cliente.

## 1. Qué es esto

Es el **esqueleto visual** del sistema de reservaciones de Casa Brava. Todo lo que ves navegando (fotos, precios, amenidades) son datos de prueba (mock). No hay conexión a base de datos ni pagos reales todavía — es solo para que el cliente valide la interfaz.

## 2. Cómo correrlo localmente

```bash
npm install
npm run dev
```

Luego abrir [http://localhost:3000](http://localhost:3000).

### Base de datos local (Supabase)

El proyecto ya tiene inicializado el CLI de Supabase (`supabase/` en la raíz) para desarrollo local con Docker, con el **esquema relacional inicial ya migrado** (tablas de perfiles, reservaciones y los tres servicios adicionales — ver sección 3 y el detalle en `CLAUDE.md`). **El login ya usa Supabase Auth de verdad** (ver sección 6); el resto de la UI (fotos, amenidades, servicios, tablas del panel admin) sigue leyendo de `lib/mock-data.ts` (ver sección 8).

⚠️ Los contenedores de Supabase **no persisten** entre reinicios de Docker o de la máquina — si el login no funciona (o `docker ps` no muestra nada con "supabase" en el nombre), corre `npx supabase start` de nuevo antes de `npm run dev`.

```bash
npx supabase start   # levanta los contenedores locales (requiere Docker corriendo)
npx supabase stop    # los apaga
npx supabase db reset  # recrea la base desde cero: aplica todas las migraciones + supabase/seed.sql
```

Al correr `supabase start` la primera vez, imprime las URLs y claves del entorno local (API, Studio, `anon key`, etc.) — esos valores van en `.env.local` (no versionado) como `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Los clientes tipados viven en `lib/supabase/` (uno para Client Components, otro para Server Components, otro para el middleware — ver sección 3 y el detalle en `CLAUDE.md`), y los tipos de las tablas se regeneran con:

```bash
npx supabase gen types typescript --local > lib/database.types.ts
```

Hay que volver a correr ese comando cada vez que cambie el esquema (nueva migración, nueva tabla/columna/enum), para que `lib/database.types.ts` no quede desactualizado.

**Migraciones** viven en `supabase/migrations/` (una por cambio de esquema, nunca se editan una vez aplicadas en un entorno compartido — se crean con `npx supabase migration new <nombre>`). La primera, `20260901072551_init_schema.sql`, crea todo el modelo relacional descrito en la sección 3. `supabase/seed.sql` siembra datos de desarrollo equivalentes a los de `lib/mock-data.ts` (usuarios, tarifas, menús, vinos, masajistas) — se re-ejecuta automáticamente cada vez que corres `supabase db reset`.

⚠️ **Row Level Security (RLS) está deshabilitado a propósito** en todas las tablas por ahora — es un paso pendiente documentado con un `TODO` al final de la migración inicial, no un descuido. No conectar ningún componente real a estas tablas antes de esa migración de políticas RLS.

## 3. Estructura de carpetas

```
middleware.ts           → Refresca la sesión de Supabase y aplica los guards de ruta en el servidor (ver sección 6)

app/
  layout.tsx          → Layout global (Navbar + Footer envolviendo todas las páginas)
  page.tsx             → Pantalla principal del huésped (home) — ruta protegida por middleware.ts, requiere sesión activa (ver sección 6)
  login/page.tsx        → Pantalla de acceso restringido, usa Supabase Auth real
  register/page.tsx     → Pantalla de registro por invitación (demo, sigue mockeada) — sin enlace desde la UI, solo accesible directamente en /register
  reservar/page.tsx     → Flujo de reservación (fechas, tarifa, resumen, pago) — ruta protegida por middleware.ts
  servicios/
    spa/page.tsx          → Flujo de reserva de SPA/Masajes — ruta protegida por middleware.ts
    comida/page.tsx        → Flujo de reserva de Comida — ruta protegida por middleware.ts
    vinos/page.tsx          → Flujo de compra del Paquete de Vinos — ruta protegida por middleware.ts
  carrito/page.tsx       → Carrito de servicios adicionales (listado, eliminar, total, pagar) — ruta protegida por middleware.ts
  pago-exitoso/page.tsx → Pantalla estática de confirmación de pago (reutilizada por /reservar y /carrito)
  admin/page.tsx        → Dashboard de administración (usuarios y reservaciones) — ruta protegida por middleware.ts, requiere role === "admin"
  perfil/page.tsx       → Vista de perfil del usuario con sesión activa (datos reales de Supabase) — protegida por middleware.ts y con su propia redirección inline como respaldo

components/
  Navbar.tsx            → Barra superior (logo + Carrito/Perfil/Iniciar sesión/Cerrar sesión según la sesión)
  Footer.tsx            → Pie de página
  BackButton.tsx          → Botón "← Volver" (useRouter().back()), usado en las vistas de servicios, /reservar y /carrito
  Calendar.tsx            → Wrapper delgado sobre `react-day-picker` con el tema Tailwind del proyecto ya aplicado (classNames, ícono de Chevron con lucide-react, locale español) — usado por DateRangeSelector, SpaBookingForm y FoodBookingForm
  Carousel.tsx          → Carrusel de fotos de la propiedad
  AmenitiesList.tsx      → Lista de amenidades con íconos
  ServiceCard.tsx         → Tarjeta individual de un servicio adicional, con botón "Reservar" hacia /servicios/<id>
  DateRangeSelector.tsx   → Selector de fecha de llegada/salida
  PricingOptions.tsx      → Radio buttons de tipo de tarifa
  BookingSummary.tsx      → Desglose de cobro (noches + recargo + depósito)
  UsersTable.tsx          → Tabla de usuarios invitados (dashboard admin)
  ReservationsTable.tsx   → Tabla de reservaciones (dashboard admin)
  SpaBookingForm.tsx      → Formulario de reserva de SPA (masajista → día → hora)
  FoodBookingForm.tsx     → Formulario de reserva de Comida (día → tiempo de comida → menú → personas)
  WineBookingForm.tsx     → Formulario de compra de vinos (botellas individuales + paquete de 4)
  AddedToCartBanner.tsx   → Banner de confirmación ("agregado al carrito" + link a /carrito), compartido por los 3 formularios
  CartView.tsx            → Contenido interactivo de /carrito (listado, eliminar, total, pagar)
  CartItemRow.tsx          → Fila individual del carrito, formatea los detalles según el tipo de servicio

lib/
  mock-data.ts          → TODOS los datos de prueba que siguen mockeados: fotos, amenidades, servicios, precios, usuarios y reservaciones del panel admin, disponibilidad de spa/comida/vinos
  AuthContext.tsx       → Estado global de sesión REAL de Supabase Auth (Context; ya no usa localStorage — ver sección 6)
  CartContext.tsx       → Estado global del carrito de servicios adicionales (Context + localStorage, sigue mockeado)
  database.types.ts     → Tipos TypeScript generados automáticamente desde el esquema de Supabase local (no editar a mano, se regenera con el CLI)
  supabase/
    env.ts                → Valida y exporta NEXT_PUBLIC_SUPABASE_URL/ANON_KEY ya tipadas como string
    client.ts             → createClient() con createBrowserClient — para Client Components
    server.ts             → createClient() (async) con createServerClient — para Server Components/Actions/Route Handlers
    middleware.ts          → updateSession(request) — refresco de sesión + guards de ruta, usado por middleware.ts en la raíz

supabase/
  config.toml           → Configuración del entorno local de Supabase (puertos, servicios habilitados, etc.), generado por `supabase init`
  seed.sql              → Datos de desarrollo (equivalentes a lib/mock-data.ts) que se insertan al correr `supabase db reset`
  migrations/
    20260901072551_init_schema.sql  → Migración inicial: ENUMs, tablas de perfiles/reservaciones/servicios, llaves foráneas (ver sección 3.1)
```

### 3.1 Modelo relacional (Supabase)

Definido en `supabase/migrations/20260901072551_init_schema.sql`. Resumen de las tablas (todas en el schema `public`, con `id` de tipo `uuid`):

| Tabla | Para qué sirve | Llaves foráneas |
|---|---|---|
| `profiles` | Datos de cada usuario (huésped, admin, etc.) | `id` → `auth.users(id)` |
| `property_settings` | Tarifa por noche y depósito de seguridad (reemplaza `PRICING_CONFIG`) | — |
| `fare_types` | Tipos de tarifa (Estándar / Flexible), con su recargo (reemplaza `FARE_OPTIONS`) | — |
| `reservations` | Una reservación de la casa (fechas, tarifa, monto, estado) | `guest_id` → `profiles`, `fare_type_id` → `fare_types` |
| `spa_masseuses` | Catálogo de masajistas (reemplaza `SPA_MASSEUSES`) | — |
| `spa_bookings` | Una sesión de spa reservada dentro de una reservación | `reservation_id` → `reservations`, `masseuse_id` → `spa_masseuses` |
| `food_menus` | Catálogo de menús por tiempo de comida (reemplaza `FOOD_MENU_OPTIONS`) | — |
| `food_bookings` | Un pedido de comida dentro de una reservación | `reservation_id` → `reservations`, `menu_id` → `food_menus` |
| `wines` | Catálogo de botellas individuales (reemplaza `WINE_BOTTLES`) | — |
| `wine_packages` | Catálogo de paquetes de vino (reemplaza `WINE_PACKAGE`) | — |
| `wine_orders` | Un pedido de vinos dentro de una reservación | `reservation_id` → `reservations` |
| `wine_order_items` | Cada línea de un pedido de vinos (botella suelta o paquete) | `wine_order_id` → `wine_orders`, `wine_id` → `wines` (opcional), `wine_package_id` → `wine_packages` (opcional) |

Notas importantes:

- **`reservations` usa soft delete**: tiene una columna `deleted_at` en vez de borrarse físicamente con `DELETE`. Cualquier consulta que liste reservaciones debe agregar `where deleted_at is null` a mano.
- **RLS deshabilitado por ahora**: ninguna tabla tiene Row Level Security activo. Es intencional mientras nada en la UI se conecta a Supabase — queda un `TODO` explícito al final de la migración para crear las políticas antes de producción. No exponer estas tablas a un cliente real sin esa migración pendiente.
- `supabase/seed.sql` llena `profiles`, `property_settings`, `fare_types`, `spa_masseuses`, `food_menus`, `wines` y `wine_packages` con datos equivalentes a los del prototipo (`lib/mock-data.ts`). Las tablas de reservaciones y bookings quedan vacías (ver el comentario en el propio `seed.sql` — los datos mock de reservaciones no tienen usuarios reales asociados).

Regla simple: **si algo se repite visualmente o tiene lógica propia, vive en `components/`. Si es solo texto o números de ejemplo, vive en `lib/mock-data.ts`.**

## 4. Dónde editar los componentes visuales principales

- **Carrusel de fotos**: la lógica de navegación (flechas, puntos) está en [components/Carousel.tsx](components/Carousel.tsx). Usa `<Image>` de `next/image` (`fill` + `object-contain` + `sizes`, `priority` solo en la primera foto) sobre los archivos reales servidos desde `public/images/`; la etiqueta (`label`) se muestra debajo de la foto. Cada objeto `Photo` en `lib/mock-data.ts` requiere un campo `url` (ruta pública de la imagen, ej. `/images/jardin_1.jpeg`) además de `id` y `label`.
  - **Auto-avance**: un `useEffect` con `setInterval` avanza a la siguiente foto cada 4000 ms (`AUTO_ROTATE_INTERVAL_MS`), limpiando el intervalo en el cleanup del efecto. El efecto depende de `index`, así que cualquier interacción manual (flechas o puntos) reinicia el conteo de 4s — en la práctica, pausa temporalmente el auto-avance sin necesitar estado adicional.
  - **Pausa al pasar el cursor**: el contenedor tiene `onMouseEnter`/`onMouseLeave` que activan/desactivan un estado `isPaused`; mientras está en `true`, el efecto de auto-avance no arranca ningún intervalo.
  - **Transición entre fotos**: cada foto usa `key={photo.id}` en el `<Image>` para forzar su remonte al cambiar, combinado con una animación CSS `fade-in` (`@keyframes` definido en [app/globals.css](app/globals.css), aplicada vía `[animation:fade-in_700ms_ease-in-out]`) que produce el efecto de desvanecimiento al entrar cada foto nueva.
  - **Zoom interactivo con paneo**: un estado `zoom` entre `1` y `3` se controla de tres formas — dos botones flotantes con íconos `<ZoomIn />`/`<ZoomOut />` de `lucide-react` en la esquina superior derecha (pasos de `0.5`, estilo `bg-neutral-900/70`), la rueda del mouse sobre la foto (pasos de `0.15`, capturada con un listener nativo `wheel` agregado en un `useEffect` con `{ passive: false }`, ya que React trata `onWheel` como pasivo por defecto y no deja hacer `preventDefault()` ahí — necesario para bloquear el scroll de la página mientras se hace zoom), y doble clic sobre la imagen (alterna entre `1` y un acercamiento rápido de `2.5` centrado en el punto del clic). El zoom se aplica como `transform: scale(zoom)` sobre el `<Image>` con `transition-transform duration-200 ease-out`. El contenedor de la foto mantiene `overflow-hidden` para que la imagen ampliada no se desborde. Con `zoom > 1`, mover el cursor sobre la foto (o hacer scroll) actualiza un estado `transformOrigin` (posición del cursor en porcentaje respecto al contenedor, calculado con `getBoundingClientRect()`) para desplazarse por la imagen ampliada. El cursor cambia según el estado: `cursor-zoom-in` en reposo, `cursor-grab` una vez ampliada la imagen, y `cursor-grabbing` mientras se mantiene presionado el botón del mouse (con un listener global de `mouseup` en un `useEffect` para no dejar el cursor "atorado" en grabbing si se suelta fuera del carrusel). Tanto el `zoom` como el `transformOrigin` se reinician a sus valores por defecto (`1` y `"50% 50%"`) cada vez que cambia la foto (manual o por auto-avance) — útil para examinar de cerca fotos verticales o con detalle. Las flechas (íconos `<ChevronLeft />`/`<ChevronRight />` de `lucide-react`) y los botones de zoom detienen la propagación de sus eventos de mouse (`stopPropagation`) para no disparar el paneo/zoom de la imagen que está debajo.
- **Tarjetas de "Servicios Adicionales"** (Comida, SPA/Masajes, Paquete de Vinos): el diseño de cada tarjeta está en [components/ServiceCard.tsx](components/ServiceCard.tsx), que usa `<Image>` de `next/image` (contenedor `relative h-48` + `object-cover` + `sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"`, acorde a la grilla `sm:grid-cols-2 lg:grid-cols-3` en la que se muestran) en vez del placeholder gris. El contenido (título, descripción, precio) se edita en `lib/mock-data.ts`, no en el componente. Cada servicio en `ADDITIONAL_SERVICES` requiere también un campo `image` (ruta pública a la fotografía en `public/images/`, ej. `/images/servicio_comida_holder.jpg`) — sin este campo, `ServiceCard` no puede renderizar la tarjeta.
- **Amenidades**: el diseño está en [components/AmenitiesList.tsx](components/AmenitiesList.tsx), que ahora itera primero por **categoría** (`AmenityCategory`, subtítulo tipo Airbnb) y luego por cada amenidad dentro de ella, mostrando su ícono `.svg` (tag `<img>` nativo, no `next/image`, porque el optimizador de imágenes de Next.js no sirve SVG sin habilitar `dangerouslyAllowSVG` en `next.config.ts`) seguido del texto. El contenido (categorías, amenidades y la ruta `url` de cada ícono) se edita en `lib/mock-data.ts`; los archivos `.svg` reales viven en `public/icons/amenities/<categoría>/`.
- **Tablas del dashboard de administración**: el diseño de la tabla de usuarios está en [components/UsersTable.tsx](components/UsersTable.tsx) y el de reservaciones en [components/ReservationsTable.tsx](components/ReservationsTable.tsx). El contenido de ambas tablas se edita en `lib/mock-data.ts`, igual que el resto del sitio.
- **Flujos de reserva de servicios adicionales** (SPA, Comida, Vinos): cada uno vive en su propio componente cliente — [components/SpaBookingForm.tsx](components/SpaBookingForm.tsx), [components/FoodBookingForm.tsx](components/FoodBookingForm.tsx), [components/WineBookingForm.tsx](components/WineBookingForm.tsx) — montado en su página bajo `app/servicios/<id>/page.tsx`. Todos calculan su propio precio y llaman a `addToCart()` (ver `lib/CartContext.tsx` más abajo) al enviar el formulario; el botón "Reservar" de cada `ServiceCard` en el Home enlaza directamente a `/servicios/<id>` porque el `id` de `ADDITIONAL_SERVICES` coincide con el nombre de la carpeta de ruta.
- **Carrito** ([app/carrito/page.tsx](app/carrito/page.tsx)): la interactividad vive en [components/CartView.tsx](components/CartView.tsx) (listado vía [components/CartItemRow.tsx](components/CartItemRow.tsx), eliminar item, total y botón "Pagar servicios"), mientras que la página en sí es un Server Component "limpio" — la protección de ruta ya no vive en su JSX, corre en `middleware.ts` (ver sección 6).
- **Botón "Volver"**: [components/BackButton.tsx](components/BackButton.tsx) es un componente cliente minimalista (`useRouter().back()` de `next/navigation`, ícono `<ArrowLeft />` de `lucide-react` junto al texto) montado arriba del contenido en `app/servicios/spa/page.tsx`, `app/servicios/comida/page.tsx`, `app/servicios/vinos/page.tsx`, `app/reservar/page.tsx`, `app/carrito/page.tsx` y `app/perfil/page.tsx`, para que el usuario nunca quede "atrapado" en esas vistas de flujo. Al ser Server Components, importar `<BackButton />` (Client Component) no obliga a convertir la página entera en cliente — `app/perfil/page.tsx` y `app/reservar/page.tsx` ya eran Client Components desde antes por su propio estado, así que ahí simplemente se importa igual.
- **Calendarios** ([components/Calendar.tsx](components/Calendar.tsx)): wrapper `"use client"` sobre `<DayPicker>` de `react-day-picker` (ver regla de librerías headless permitidas en [CLAUDE.md](CLAUDE.md)). No importa el CSS por defecto de la librería — en vez de eso, le pasa un `classNames` fijo que mapea cada pieza interna (`day`, `day_button`, `selected`, `range_start`/`range_middle`/`range_end`, `outside`, `disabled`, `today`, `nav`, `button_previous`/`button_next`, etc., ver el enum `UI`/`DayFlag`/`SelectionState` de la librería) a clases de Tailwind con la paleta `neutral` del proyecto (celdas `h-10 w-10`, encabezados de día en `text-neutral-500` centrados), y reemplaza el `Chevron` por defecto con uno propio que usa `<ChevronLeft />`/`<ChevronRight />` de `lucide-react`. El locale es español (`import { es } from "react-day-picker/locale"`). Un detalle importante para quien lo edite: react-day-picker puede activar varios modificadores a la vez sobre la misma celda (ej. un día puede ser `selected` **y** `range_start`, o `outside` **y** `disabled`, simultáneamente), y las clases de todos los modificadores activos terminan en el mismo `class="..."` del `<td>`. Cuando dos de esas clases fijan la misma propiedad CSS (color, fondo, radio) con la misma especificidad, gana la que Tailwind coloca más tarde en su hoja de estilos generada — un orden interno de la librería, no el orden en este objeto ni en el atributo `class`; se verificó empíricamente que ese orden **no** favorece a la clase semánticamente "más específica" (p.ej. `text-neutral-700` de `day` le ganaba a `text-neutral-300` de `disabled`, dejando los días deshabilitados con el mismo color que los habilitados). Por eso toda clase pensada para sobreescribir el estilo por defecto de `day` (`outside`, `disabled`, `range_start`/`range_end`/`range_middle`) usa `!important` en todas sus propiedades, no solo en la que a simple vista parece necesitarlo — incluyendo el bg/texto de `range_start`/`range_end`, necesario para que el check-in/check-out se siga leyendo bien cuando cae justo en un día "outside" (relleno del mes siguiente/anterior). `range_start`/`range_end` además fijan explícitamente el lado contrario a `-none` (no solo el lado propio a `-full`) para que el rango se vea como una píldora continua sin depender de si `rounded-full` (de `selected`, activo a la vez) gana en las esquinas que no se están forzando. Se usa en tres lugares, cada uno con su propia lógica de fechas (todas basadas en `date-fns` para convertir entre `string` ISO y `Date`, evitando el bug de `new Date("yyyy-MM-dd")` que en JS nativo se interpreta en UTC y puede desfasar un día según la zona horaria del navegador):
  - **[components/DateRangeSelector.tsx](components/DateRangeSelector.tsx)** (usado en `/reservar`): `mode="range"`, con `disabled={{ before: today }}` para no permitir fechas pasadas. Mantiene exactamente el mismo contrato de props que antes (`checkIn`, `checkOut`, `onCheckInChange`, `onCheckOutChange`, todos `string` ISO) — convierte a `DateRange` de `react-day-picker` (`{ from, to }` con objetos `Date`) solo internamente, así que `app/reservar/page.tsx` no necesitó ningún cambio.
  - **[components/SpaBookingForm.tsx](components/SpaBookingForm.tsx)** y **[components/FoodBookingForm.tsx](components/FoodBookingForm.tsx)**: `mode="single"`, reemplazando la fila de botones tipo "pill" que existía antes sobre `masseuse.availableDays` / `FOOD_AVAILABLE_DATES`. La disponibilidad simulada se expresa con `disabled={(date) => !availableDays.includes(format(date, "yyyy-MM-dd"))}` — el calendario completo se muestra, pero solo los días de esa lista quedan clicables; el resto aparece deshabilitado (`!text-neutral-300`). En `SpaBookingForm`, el calendario lleva `key={masseuse.id}` para remontarse (y así recalcular `defaultMonth`) cada vez que se elige otra masajista, ya que cada una tiene sus propias fechas disponibles — mismo patrón de remonte por `key` que ya usaba `Carousel.tsx` para las fotos. Debajo del calendario, ambos formularios muestran la fecha elegida formateada con `formatSimulatedDate` (la misma función que usa el resto de la app para estas fechas simuladas), no con `date-fns`.
  - **Indicadores de disponibilidad (verde/rojo)**: `Calendar.tsx` exporta además `AVAILABILITY_MODIFIERS_CLASS_NAMES`, un objeto `{ available, disabled }` pensado para pasarse por instancia vía `modifiersClassNames` (no se aplica por defecto — `DateRangeSelector` y `FoodBookingForm` no lo usan y no cambian). La clave `available` es un modificador custom (se pasa también en `modifiers`, ej. `{ available: (date) => isDayAvailable(date) && format(date, "yyyy-MM-dd") !== day }`, excluyendo el día ya seleccionado para no competir visualmente con el estilo de `selected`) que pinta fondo `emerald-50`/texto `emerald-900` más un punto verde bajo el número vía pseudo-elemento `after:content-['']`. La clave `disabled` sobreescribe directamente `modifiersClassNames.disabled` (no crea un modificador custom paralelo) para repintar de rojo/tachado (`!text-red-300 !bg-red-50/50 line-through`) los mismos días que ya bloquea el `disabled` nativo, evitando que compitan dos clases por el mismo color en la misma celda. Hoy solo está integrado en **SpaBookingForm.tsx** como prueba de concepto sobre `masseuse.availableDays`; queda pendiente extenderlo a `FoodBookingForm.tsx` (`FOOD_AVAILABLE_DATES`) y a la disponibilidad de la casa cuando se pidan.

## 5. Dónde están los datos mockeados (para editar antes de la demo)

Todo está en un único archivo: **[lib/mock-data.ts](lib/mock-data.ts)**. Ahí se puede cambiar sin tocar ningún componente:

| Qué quieres cambiar | Variable en `mock-data.ts` |
|---|---|
| Fotos del carrusel (cantidad, etiquetas y `url` del archivo en `public/images/`) | `PROPERTY_PHOTOS` |
| Amenidades de la casa (categorías y, dentro de cada una, sus amenidades con `url` al ícono `.svg`) | `AMENITIES` |
| Servicios adicionales (Comida, SPA, Vinos), incluyendo la `image` de cada uno | `ADDITIONAL_SERVICES` |
| Masajistas de SPA (nombre, días y horarios disponibles simulados) y precio de sesión | `SPA_MASSEUSES`, `SPA_SESSION_PRICE` |
| Tiempos de comida y menús disponibles por tiempo (con precio por persona) | `MEAL_TYPES`, `FOOD_MENU_OPTIONS` |
| Días disponibles simulados para reservar comida | `FOOD_AVAILABLE_DATES` |
| Botellas de vino individuales disponibles y el paquete de 4 vinos | `WINE_BOTTLES`, `WINE_PACKAGE` |
| Tipos de tarifa (Estándar / Flexible) y su recargo | `FARE_OPTIONS` |
| Precio por noche y depósito de garantía | `PRICING_CONFIG` |
| Usuarios del panel de administración (nombre, email, rol, estado) | `mockUsers` |
| Reservaciones del panel de administración (huésped, fechas, monto, estado) | `mockReservations` |

Ejemplo: para cambiar el precio por noche de $250 a $300, solo hay que editar `nightlyRate` dentro de `PRICING_CONFIG` en ese archivo. El resumen de cobro en la página de reservación se recalcula solo.

Para agregar un nuevo usuario o una nueva reservación de prueba, basta con agregar un objeto más al array `mockUsers` o `mockReservations` en `lib/mock-data.ts` — las tablas del panel de administración se actualizan automáticamente.

**Estructura de `AMENITIES`**: dejó de ser una lista plana de amenidades para ser un arreglo de categorías (`AmenityCategory[]`). Cada categoría tiene `id`, `category` (el subtítulo visible, ej. "Cocina y comedor") y `items: Amenity[]`; cada `Amenity` tiene `id`, `label` y `url` (ruta pública al ícono `.svg`, ej. `/icons/amenities/cocina/fridge.svg`). Para agregar una amenidad nueva, primero colocar su ícono en `public/icons/amenities/<categoría>/` y luego referenciarlo desde `url` en el `items` correspondiente — si dos amenidades no tienen un ícono dedicado (ej. "congelador" y "refrigerador"), es válido que compartan el mismo archivo `.svg`.

**Íconos del sistema**: los botones "Carrito", "Perfil" y "Cerrar sesión" en [components/Navbar.tsx](components/Navbar.tsx), la flecha de [components/BackButton.tsx](components/BackButton.tsx) y los controles de [components/Carousel.tsx](components/Carousel.tsx) (flechas de navegación, zoom) ahora usan componentes de **`lucide-react`** (`<ShoppingCart />`, `<User />`, `<LogOut />`, `<ArrowLeft />`, `<ChevronLeft />`/`<ChevronRight />`, `<ZoomIn />`/`<ZoomOut />`) en vez de archivos `.svg` — ver la regla correspondiente en [CLAUDE.md](CLAUDE.md). El texto de cada botón se sigue conservando accesible con `sr-only`/`aria-label` para lectores de pantalla. El logo (`/icons/system/logo.svg`) es la excepción: sigue siendo un `<img>` nativo apuntando a [public/icons/system/](public/icons/system/), porque es la marca de la casa, no un ícono genérico de interfaz que `lucide-react` pueda reemplazar. Los demás `.svg` de esa carpeta (`cart.svg`, `profile.svg`, `logout.svg`) quedan sin usar en el código, pero no se borraron del repo.

**Íconos de amenidades** ([public/icons/amenities/](public/icons/amenities/)): a diferencia de los íconos de sistema de arriba, estos **siguen usando el formato estático `.svg` + `<img>` nativo** en [components/AmenitiesList.tsx](components/AmenitiesList.tsx) — es una decisión intencional (ver CLAUDE.md), no un descuido: son ilustraciones curadas y propias de la casa (cocina, alberca, etc.), no íconos genéricos de interfaz, y no tienen equivalente razonable en `lucide-react`.

**Fechas simuladas de disponibilidad**: `SPA_MASSEUSES[].availableDays` y `FOOD_AVAILABLE_DATES` son fechas ISO (ej. `"2026-09-04"`), no un rango dinámico — para la demo, alargar o mover estas fechas basta con editar los arreglos directamente en `lib/mock-data.ts`. Se muestran en la UI ya formateadas (ej. "04 sept.") a través de la función `formatSimulatedDate(isoDate)`, exportada también desde `mock-data.ts`.

## 6. Autenticación real (Supabase Auth + middleware) y panel de administración

El prototipo distingue tres roles a nivel de base de datos — `admin`, `holder` y `guest` (ENUM `role_type`) —, pero en la UI solo se usan `admin` y `guest` (`role: "holder"` existe en el esquema para uso futuro, sin pantalla propia todavía). **La autenticación ya es real**: Supabase Auth con cookies, verificada del lado del servidor. Ya no hay `localStorage` de sesión ni verificación de contraseña simulada.

**Piezas del sistema:**

- **[middleware.ts](middleware.ts)** (raíz del proyecto): corre en el servidor antes de que cualquier página renderice. Refresca la sesión de Supabase en cada navegación y decide si redirigir:
  - Sin sesión, entrar a `/reservar`, `/perfil`, `/carrito` o cualquier `/servicios/*` → redirige a `/login`.
  - **El Home (`/`) también requiere sesión activa** — sin sesión, redirige a `/login`, igual que el resto de rutas protegidas. Es una coincidencia **exacta** de `pathname === "/"` (`PROTECTED_EXACT_PATHS`), evaluada aparte de las rutas por prefijo — necesario porque `"/"` con la misma lógica de prefijo (`startsWith`) haría match de cualquier URL, incluyendo `/login`, y generaría un bucle infinito de redirección.
  - Entrar a `/admin` sin sesión → redirige a `/login`. Con sesión pero `role !== "admin"` (huésped, o cualquier caso donde no se pudo leer el perfil) → redirige a `/` (esto no genera bucle: como ya hay sesión, `/` se resuelve normalmente en vez de rebotar a `/login`).
  - `/login` y `/register` no están protegidas — deben seguir siendo accesibles sin sesión para no quedar sin forma de entrar a la app.
  - La lógica real vive en `lib/supabase/middleware.ts` (`updateSession`); `middleware.ts` en la raíz solo la invoca. Nota técnica: Next.js 16 renombró esta convención de archivo a `proxy.ts`, pero `middleware.ts` sigue funcionando (aparece un warning de deprecación al correr `npm run dev`, nada más) — ver el detalle en `CLAUDE.md`.
- **[lib/AuthContext.tsx](lib/AuthContext.tsx)**: `AuthProvider` envuelve toda la app en [app/layout.tsx](app/layout.tsx). El hook `useAuth()` expone `{ user, profile, isLoading, login(email, password), logout() }` — `user` es la sesión de Supabase Auth, `profile` es la fila completa de la tabla `profiles` (nombre, apellidos, `role`, `status`, etc.) para ese usuario. Ya no hay `localStorage` — la sesión vive en cookies (manejadas por `@supabase/ssr`) y se sincroniza automáticamente ante login/logout/expiración de token.

**Validación del formulario de login** ([app/login/page.tsx](app/login/page.tsx)):

- El campo de correo sigue validándose contra un formato básico (`nombre@dominio.tld`) antes de enviar el formulario, igual que antes.
- El campo de contraseña sigue validando que no esté vacío, **pero ahora la contraseña sí se verifica de verdad** contra Supabase Auth (`signInWithPassword`).
- Si las credenciales son incorrectas, el mensaje de error se muestra en el mismo lugar de siempre (bajo el campo de contraseña, mismo estilo rojo), pero ahora viene de traducir el error real de Supabase (`AuthApiError`) a español — ej. "Invalid login credentials" se muestra como "Correo o contraseña incorrectos."
- El formulario sigue usando `noValidate` para mostrar siempre los mensajes de error propios en vez de los del navegador.

**Cómo probarlo (usuarios de prueba sembrados por `supabase/seed.sql`, ver sección 3):**

1. Con Supabase local corriendo (`npx supabase start`) y `npm run dev` activo, ir a [/login](app/login/page.tsx).
2. Escribir un correo con formato inválido (ej. `rafael@`) y dar clic en "Ingresar" → debe aparecer un mensaje de error en rojo bajo el campo, sin llegar a llamar a Supabase.
3. Iniciar sesión con `admin@test.com` / `changeme123` → redirige a `/admin` (rol `admin` real, leído de `profiles`).
4. Iniciar sesión con `carlos.ruiz@example.com` / `changeme123` (rol `guest`) → redirige a `/` (home). Si desde ahí se navega manualmente a `/admin`, el middleware redirige de vuelta a `/`.
5. Escribir una contraseña incorrecta para un correo que sí existe → mensaje "Correo o contraseña incorrectos." bajo el campo de contraseña, sin redirigir.
6. Cerrar sesión desde el botón de "Cerrar sesión" (Navbar o `/perfil`) y confirmar que `/reservar`, `/perfil`, `/carrito` o `/servicios/spa` redirigen de nuevo a `/login`.

**Navbar dinámico** ([components/Navbar.tsx](components/Navbar.tsx)): sigue leyendo `useAuth()` para decidir qué mostrar — si hay sesión activa, muestra los botones de "Perfil" y "Cerrar sesión" (ahora `logout()` es `async`, así que el handler hace `await logout()` antes de redirigir); si no hay sesión, muestra "Iniciar sesión". El resto del comportamiento (ocultar "Carrito" dentro de `/admin`, badge de `totalItems`) no cambió.

**Pantalla de registro** ([app/register/page.tsx](app/register/page.tsx)): **sigue siendo un formulario 100% mock** — no se tocó en esta migración porque no se pidió explícitamente. Al enviarlo, solo muestra un mensaje de éxito simulado y redirige a `/login`; no crea ningún usuario real en Supabase Auth ni en `profiles`. Conectarlo (`supabase.auth.signUp()` + insertar en `profiles`) queda como trabajo pendiente (ver sección 8).

**Vista de Perfil** ([app/perfil/page.tsx](app/perfil/page.tsx)): mismo diseño visual de siempre (avatar con inicial, tarjeta con Nombre/Correo/Rol, botón "Cerrar sesión"), pero ahora los datos vienen de `profile` (Supabase) en vez de un `MockUser`. El nombre completo se arma concatenando `first_name` + `apellido_paterno` + `apellido_materno` (los tres campos separados de `profiles`, a diferencia del `nombre` único que tenía `MockUser`). Sigue teniendo su propia redirección inline a `/login` si no hay sesión, como respaldo del guard de `middleware.ts` (por ejemplo, si la sesión expira mientras la pestaña ya está abierta en `/perfil`).

**Panel de administración** ([app/admin/page.tsx](app/admin/page.tsx)):

- **Sección "Usuarios invitados"**: tabla con los datos de `mockUsers` (nombre, email, rol, estado) usando [components/UsersTable.tsx](components/UsersTable.tsx) — **sigue sin conectarse a la tabla real `profiles`**, sigue siendo de solo lectura sobre datos mockeados. El botón "Editar" de cada fila abre un modal interactivo (fondo `bg-black/40 backdrop-blur-sm`, panel `bg-white rounded-2xl shadow-2xl` con una transición de entrada vía `@keyframes modal-in` en [app/globals.css](app/globals.css)) con un formulario para editar nombre, correo, rol y estado del usuario seleccionado; cierra con "Cancelar", clic fuera del panel, o la tecla Escape. `UsersTable` mantiene su propio estado local de usuarios (`useState`, inicializado con la prop `users` que la página le pasa desde `mockUsers`), así que al guardar los cambios se reflejan de inmediato en la tabla — es solo en memoria del navegador, se pierde al recargar la página. Al enviar el formulario se llama a `handleSaveUser(updatedUser)`, una función `async` que ya está preparada para la integración futura: reemplazar la actualización de `setUsers` dentro de ella por la llamada real a Supabase (mutación/API) es el único cambio necesario — el modal, el formulario y el resto del componente no tendrían que tocarse. El comentario `// TODO: Integración con Supabase` dentro de esa función marca exactamente dónde hacerlo.
- **Sección "Reservaciones"**: tabla con los datos de `mockReservations` usando [components/ReservationsTable.tsx](components/ReservationsTable.tsx), filtrando en la propia página (`app/admin/page.tsx`) para no mostrar las reservaciones con estado `pasada`. Igual que "Usuarios invitados", sigue sin conectarse a la tabla real `reservations`.
- **Ahora sí tiene guard de ruta real**: `middleware.ts` exige sesión con `role === "admin"` en `profiles` antes de dejar pasar a `/admin` (ver arriba) — a diferencia del prototipo anterior, ya no es accesible por URL directa sin cumplir ambas condiciones.

## 7. Carrito de servicios adicionales

Además de la reservación de la estadía (`/reservar`), el prototipo tiene un flujo independiente para agregar servicios adicionales (SPA/Masajes, Comida, Paquete de Vinos) a un carrito y "pagarlos" por separado, manejado por [lib/CartContext.tsx](lib/CartContext.tsx):

- `CartProvider` envuelve la app en [app/layout.tsx](app/layout.tsx) (anidado dentro de `AuthProvider`) y expone el carrito a través de un React Context.
- El carrito se guarda en `localStorage` (clave `casabrava_cart`), igual que la sesión: **persiste al recargar la página**.
- El hook `useCart()` da acceso a `items`, `isLoading`, `addToCart(item)`, `removeFromCart(id)`, `clearCart()`, `totalPrice` y `totalItems` desde cualquier componente cliente.
- Cada `CartItem` es una unión discriminada por `serviceType` (`"spa" | "comida" | "vinos"`), con los detalles específicos tipados como `SpaReservation`, `FoodReservation` o `WineOrder` (todos en `lib/mock-data.ts`).

**Cómo probar el flujo completo:**

1. Desde el Home (`/`), dar clic en "Reservar" dentro de cualquier tarjeta de la sección "Servicios adicionales" → navega a `/servicios/spa`, `/servicios/comida` o `/servicios/vinos`.
2. **SPA**: elegir una masajista → aparece el selector de día (fechas simuladas de esa masajista) → al elegir día aparece el selector de hora. Completar los tres pasos y dar clic en "Agregar al carrito".
3. **Comida**: elegir día, tiempo de comida (Desayuno/Almuerzo/Cena) y tipo de menú (el precio es por persona); ajustar el número de personas con el contador y dar clic en "Agregar al carrito".
4. **Vinos**: sumar botellas individuales con los contadores `+`/`−` y/o el contador del "Paquete de 4 vinos"; el total del pedido se recalcula en vivo. Dar clic en "Agregar al carrito".
5. En cualquiera de los tres flujos, tras agregar aparece un banner de confirmación verde con un link "Ver carrito" ([components/AddedToCartBanner.tsx](components/AddedToCartBanner.tsx)) — el formulario permanece visible para seguir agregando servicios sin perder el progreso.
6. El ícono de carrito en el Navbar ([components/Navbar.tsx](components/Navbar.tsx)) muestra un badge con la cantidad total de items (`useCart().totalItems`) y enlaza a `/carrito`.
7. En [/carrito](app/carrito/page.tsx): revisar el listado (cada fila formatea sus propios detalles según `serviceType`, ver [components/CartItemRow.tsx](components/CartItemRow.tsx)), eliminar algún item con "Eliminar" y confirmar que el total se recalcula.
8. Dar clic en "Pagar servicios" → vacía el carrito (`clearCart()`) y redirige a `/pago-exitoso`, sin procesar ningún cobro real (mismo patrón que el botón "Proceder al pago" de `/reservar`).
9. Recargar el navegador en cualquier punto del flujo: el carrito y sus items persisten porque viven en `localStorage`.

## 8. Qué falta conectar al backend (próximos sprints)

Esto es un prototipo de interfaz, así que lo siguiente **todavía no funciona de verdad** y queda pendiente:

- ~~**Login**~~ / ~~**Sesión mockeada**~~ / ~~**Protección de rutas**~~ — **ya resuelto**: [app/login/page.tsx](app/login/page.tsx) usa Supabase Auth real (`signInWithPassword`), la sesión vive en cookies (no `localStorage`, ver [lib/AuthContext.tsx](lib/AuthContext.tsx)), y [middleware.ts](middleware.ts) protege `/reservar`, `/perfil`, `/carrito`, `/servicios/*` (por sesión) y `/admin` (por sesión + `role === "admin"`) del lado del servidor. Ver el detalle completo en la sección 6.
- **Registro** ([app/register/page.tsx](app/register/page.tsx)): sigue siendo 100% mock — no crea usuarios reales en Supabase Auth ni en `profiles`. Falta conectarlo con `supabase.auth.signUp()`.
- **Políticas RLS pendientes**: la migración inicial (`supabase/migrations/20260901072551_init_schema.sql`) dejó Row Level Security deshabilitado en todas las tablas (ver sección 3.1) — hoy solo `profiles` se usa desde la app (para leer el propio perfil y el rol en el login/middleware), pero cualquier cliente con la `anon key` podría leer o escribir cualquier fila de cualquier tabla. Falta esa migración de políticas antes de exponer más tablas a componentes reales.
- **Disponibilidad de fechas** ([app/reservar/page.tsx](app/reservar/page.tsx)): el selector de fechas no valida contra un calendario de disponibilidad real; solo calcula noches entre dos fechas.
- **Pago** (botón "Proceder al pago"): redirige directo a la pantalla de éxito sin cobrar nada. Falta integrar un proveedor de pagos real (planeado: Stripe).
- **Persistencia de la reservación**: no se guarda en ningún lado; al recargar la página se pierde todo, a pesar de que ya existe la tabla `reservations` en Supabase (ver sección 3.1) — falta conectar el flujo de `/reservar` a ella.
- **Panel de administración** ([app/admin/page.tsx](app/admin/page.tsx)): aunque la ruta ya está protegida por rol (ver sección 6), las tablas de usuarios y reservaciones siguen siendo de solo lectura sobre datos mockeados; el botón "Editar" no hace nada. Falta conectarlas a las tablas reales `profiles`/`reservations`.
- **Disponibilidad de SPA/Comida**: los días y horarios de `SPA_MASSEUSES` y `FOOD_AVAILABLE_DATES` son listas fijas en `mock-data.ts`, no un calendario real — no valida que un horario ya elegido por otro huésped deje de estar disponible.
- **Carrito** ([lib/CartContext.tsx](lib/CartContext.tsx)): sigue viviendo en `localStorage` del navegador sin backend que lo respalde, a pesar de que ya existen las tablas `spa_bookings`/`food_bookings`/`wine_orders` en Supabase (ver sección 3.1). Falta persistirlo ahí (asociado al huésped) y, al "Pagar servicios" en `/carrito`, integrar Stripe en vez de solo vaciar el carrito y redirigir.

Para más detalle técnico sobre el stack y las convenciones de código, ver [CLAUDE.md](CLAUDE.md).
