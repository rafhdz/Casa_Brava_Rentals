# CLAUDE.md

Memoria técnica del proyecto para futuras interacciones con IA. Léelo antes de generar o modificar código en este repositorio.

## Qué es este proyecto

Sistema de reservaciones para una casa privada de renta ("Casa Brava Rentals"), de acceso exclusivo por invitación. Estado actual: **prototipo visual (esqueleto)**. No hay backend real conectado.

## Stack tecnológico

- **Next.js 16** (App Router, no Pages Router) con Turbopack.
- **React 19**.
- **TypeScript** en modo `strict`. No usar `any` salvo casos justificados.
- **Tailwind CSS v4** (configuración basada en CSS vía `@import "tailwindcss"` en [app/globals.css](app/globals.css); no existe `tailwind.config.js`, los tokens se definen con `@theme`).
- **Librerías headless permitidas** (ver detalle en "Qué NO hacer"): `lucide-react` (íconos del sistema), `react-day-picker` + `date-fns` (calendarios). Ninguna trae CSS propio importado — se estilizan 100% con Tailwind vía sus props `classNames`/`className`.
- Alias de imports: `@/*` apunta a la raíz del proyecto (ver `tsconfig.json`). Usar siempre `@/components/...`, `@/lib/...`, nunca rutas relativas largas (`../../../`).

## Convenciones de nomenclatura

- Componentes React: `PascalCase.tsx` dentro de `components/` (ej. `BookingSummary.tsx`).
- Rutas/páginas: carpetas en minúsculas y en español, siguiendo el idioma de la UI (ej. `app/reservar/page.tsx`, `app/pago-exitoso/page.tsx`).
- Funciones y variables: `camelCase`. Tipos e interfaces: `PascalCase`.
- Un componente por archivo. Exportación por defecto para componentes de página y de UI en `components/`.
- Datos mockeados centralizados en `lib/mock-data.ts` — no hardcodear precios, amenidades o textos de servicios directamente dentro de los componentes de página.

## Reglas de diseño

- **Mobile-first**: escribir las clases base pensando en mobile y usar prefijos (`sm:`, `md:`, `lg:`) para escalar hacia arriba. Nunca partir de un layout desktop y luego "achicar".
- Paleta minimalista en escala de grises (neutral-*) con acentos en negro (`neutral-900`) para botones primarios. Mantener esa consistencia al agregar nuevas vistas.
- **Íconos del sistema** (Navbar, `BackButton`, controles del carrusel, botones de UI en general) usan componentes de **`lucide-react`** (ej. `<User className="h-5 w-5" />`), no archivos `.svg` estáticos. Los `.svg` de `public/icons/system/` quedan obsoletos para este propósito — no se borran del repo por si algún flujo futuro los necesita, pero no se referencian desde componentes nuevos.
- **Íconos de amenidades** (la lista de amenidades de la casa en `public/icons/amenities/<categoría>/`) **siguen usando el formato estático actual**: tag `<img>` nativo apuntando al `.svg`, no `lucide-react` ni `next/image`. Esto es intencional — son ilustraciones curadas y personalizadas de la propiedad (íconos de cocina, alberca, etc.), no íconos genéricos de interfaz, y `lucide-react` no tiene equivalentes para la mayoría de ellas. El optimizador de imágenes de Next.js además rechaza `.svg` a menos que se habilite `dangerouslyAllowSVG` en `next.config.ts`, y no se ha activado esa opción — por eso siguen siendo `<img>` y no `next/image`. `next/image` sigue siendo el estándar para fotografías (`.jpeg`/`.png`) como en `Carousel.tsx`.
- Toda vez que se use `<Image fill>` (contenedor con tamaño fijo/relativo, foto que llena el espacio), agregar siempre la prop `sizes` con el ancho real que ocupará la imagen en cada breakpoint (ej. `sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"` para una grilla `sm:grid-cols-2 lg:grid-cols-3`, o `sizes="(min-width: 768px) 700px, 100vw"` para un carrusel a ancho de contenedor fijo). Sin `sizes`, Next.js emite una advertencia de rendimiento y puede descargar una imagen más pesada de lo necesario. Reservar `priority` únicamente para la imagen que aparece arriba del fold en la carga inicial (ej. la primera foto del carrusel en `app/page.tsx`), no para imágenes que aparecen más abajo (como las de `ServiceCard.tsx`).
- **Calendarios** ([components/Calendar.tsx](components/Calendar.tsx), wrapper de `react-day-picker`): cualquier clase pensada para sobreescribir el estilo por defecto de una celda (`outside`, `disabled`, `range_start`/`range_end`/`range_middle`) debe llevar `!important` en **todas** sus propiedades (no solo la que a simple vista parece necesitarlo) — react-day-picker activa varios modificadores a la vez sobre la misma celda (ej. `selected` + `range_start`, u `outside` + `disabled`), y sin forzarlo el orden de generación de Tailwind decide cuál gana, no la clase semánticamente correcta (ver detalle en [DOCUMENTATION.md](DOCUMENTATION.md)). Para indicadores de disponibilidad día por día (verde disponible / rojo bloqueado), usar el patrón ya establecido en `AVAILABILITY_MODIFIERS_CLASS_NAMES` (exportado desde `Calendar.tsx`, integrado hoy solo en `SpaBookingForm.tsx` como prueba de concepto) en vez de inventar uno nuevo por componente.
- Componentes reutilizables van en `components/`; las páginas (`app/**/page.tsx`) solo componen esos componentes y manejan estado/routing, no deberían tener bloques grandes de markup propios.
- Los formularios y flujos con estado (login, reservación) son Client Components (`"use client"`) porque dependen de `useState`/`useRouter`. Las páginas puramente de presentación (home, pago exitoso) se mantienen como Server Components cuando sea posible.
- Para proteger una ruta por sesión mockeada sin convertir toda la página en Client Component, envolver su contenido con `<ProtectedRoute>` ([components/ProtectedRoute.tsx](components/ProtectedRoute.tsx)) en vez de agregar `"use client"` + `useEffect` de redirección directamente en `page.tsx`. Esto permite que páginas como `app/page.tsx` sigan siendo Server Components (solo el wrapper es cliente).

## Estado actual: datos mockeados

Todo el contenido dinámico (fotos, amenidades, servicios adicionales, tarifas, precios, usuarios y reservaciones) vive en [lib/mock-data.ts](lib/mock-data.ts). No hay llamadas a APIs ni base de datos. El login valida formato de correo y que la contraseña no esté vacía, pero no verifica credenciales reales contra ningún backend (ver sección de roles simulados abajo). El botón "Proceder al pago" redirige directamente a una página estática de éxito sin procesar ningún cobro real.

## Manejo de roles simulados y sesión mockeada (Huésped vs. Administrador)

El prototipo distingue dos roles — `admin` y `guest` (tipo `UserRole` en `lib/mock-data.ts`) — y ahora tiene una **sesión mockeada persistente**, pero sigue sin haber autenticación ni backend reales:

- **Estado global**: [lib/AuthContext.tsx](lib/AuthContext.tsx) expone `AuthProvider` (montado en [app/layout.tsx](app/layout.tsx), envolviendo Navbar/main/Footer) y el hook `useAuth()` con `{ user, isLoading, login(email), logout() }`.
- **Persistencia**: la sesión se serializa como JSON en `localStorage` bajo la clave `casabrava_session_user`. Se hidrata en un `useEffect` al montar `AuthProvider` (por eso existe `isLoading`: evita parpadeos/redirecciones erróneas antes de leer `localStorage`). No usar `sessionStorage` ni cookies para esto salvo que se pida explícitamente — el requisito era persistencia simple entre recargas.
- **Lógica de `login(email)`**: busca en `mockUsers` un usuario cuyo `email` coincida (case-insensitive) con `admin@test.com`; si coincide, guarda ese `MockUser` completo como sesión. Para cualquier otro correo, crea un usuario `guest` genérico (`nombre: "Huésped"`, `estado: "invitado"`, `id` generado con timestamp) con el correo ingresado. Esta función vive en el contexto, no en la página de login, para que cualquier página futura pueda iniciar sesión de la misma forma.
- En [app/login/page.tsx](app/login/page.tsx), el `handleSubmit` valida el formato del correo (regex simple `algo@algo.algo`) y que la contraseña no esté vacía **antes** de llamar a `login()`; si hay error, se muestra un mensaje bajo el input correspondiente y no se navega. El formulario usa `noValidate` para no depender de la validación nativa del navegador. La contraseña sigue sin verificarse contra nada real.
- **`components/ProtectedRoute.tsx`**: componente `"use client"` que envuelve el contenido de una página y consume `useAuth()`. Mientras `isLoading` es `true` muestra un estado de carga; si `!isLoading && !user` redirige a `/login` (`router.replace`, en un `useEffect`) y muestra un mensaje de "redirigiendo…"; si hay `user`, renderiza `children`. Permite proteger rutas por sesión mockeada sin convertir la página entera en Client Component.
- `/` ([app/page.tsx](app/page.tsx)) y `/reservar` ([app/reservar/page.tsx](app/reservar/page.tsx)) están envueltas en `<ProtectedRoute>`: sin sesión activa, redirigen a `/login`. `/perfil` ([app/perfil/page.tsx](app/perfil/page.tsx)) implementa la misma lógica de redirección inline (no usa `ProtectedRoute` porque ya era Client Component antes de esta regla). `/admin` ([app/admin/page.tsx](app/admin/page.tsx)) **sigue sin protección de ruta real**: es accesible directamente por URL sin sesión ni verificación de rol — esto es intencional, no se debe envolver en `ProtectedRoute` hasta que se pida explícitamente.
- Toda esta protección es una redirección en el cliente, no un guard de servidor/middleware. No agregar un guard real (middleware, cookies de sesión firmadas) hasta que se pida explícitamente — cuando se pida, debe basarse en Supabase Auth, no en una solución mock adicional.
- `mockUsers` (con campos `rol` y `estado`) y `mockReservations` (con campo `estado`: `actual` | `futura` | `pasada`) alimentan las tablas del dashboard de administración ([components/UsersTable.tsx](components/UsersTable.tsx) y [components/ReservationsTable.tsx](components/ReservationsTable.tsx)). Son de solo lectura: el botón "Editar" en la tabla de usuarios es puramente visual y no dispara ninguna acción todavía.
- **Navbar** ([components/Navbar.tsx](components/Navbar.tsx)) es reactivo a `useAuth().user`: sin sesión muestra "Iniciar sesión"; con sesión muestra "Perfil" (link a `/perfil`) y "Cerrar sesión" (llama a `logout()` y redirige a `/login`).
- Al conectar Supabase Auth real, `AuthContext` debe reemplazarse (o su implementación interna) para leer la sesión desde Supabase en vez de `localStorage`, y el `rol` del usuario autenticado debe determinar el acceso a `/admin` mediante un guard real, no solo ocultar/mostrar UI en el cliente.

## Carrito de servicios adicionales (`CartContext`)

Los tres servicios adicionales (SPA/Masajes, Comida, Paquete de Vinos) tienen flujos de reserva propios y un carrito global, todo mockeado — sigue sin haber backend ni procesador de pagos reales:

- **Datos mockeados** (en `lib/mock-data.ts`, junto al resto): `SPA_MASSEUSES` (masajistas con `availableDays`/`availableTimes` simulados), `SPA_SESSION_PRICE`; `MEAL_TYPES`, `FOOD_MENU_OPTIONS` (`Record<MealType, MenuOption[]>`), `FOOD_AVAILABLE_DATES`; `WINE_BOTTLES`, `WINE_PACKAGE`. Los días disponibles (`availableDays` de cada masajista y `FOOD_AVAILABLE_DATES`) son fechas ISO simuladas (ej. `"2026-09-04"`), formateadas para mostrarse con la función `formatSimulatedDate(isoDate)` (también en `mock-data.ts`), no con un selector de fecha nativo — es intencional, ya que representan disponibilidad simulada, no un calendario real.
- **Tipos de detalle**: `SpaReservation`, `FoodReservation` y `WineOrder` (este último contiene `bottles: WineOrderBottle[]` + `packageQuantity`, para soportar botellas individuales y el paquete de 4 en un mismo pedido). El tipo `CartItem` es una unión discriminada por `serviceType` (`"spa" | "comida" | "vinos"`) que envuelve uno de esos detalles junto con `id`, `quantity` y `totalPrice`.
- **Estado global**: [lib/CartContext.tsx](lib/CartContext.tsx) expone `CartProvider` (montado en [app/layout.tsx](app/layout.tsx), anidado dentro de `AuthProvider` y envolviendo Navbar/main/Footer) y el hook `useCart()` con `{ items, isLoading, addToCart, removeFromCart, clearCart, totalPrice, totalItems }`. Sigue el mismo patrón que `AuthContext`: persiste en `localStorage` bajo la clave `casabrava_cart`, se hidrata en un `useEffect` al montar (con el mismo `eslint-disable-next-line react-hooks/set-state-in-effect` justificado, ver sección siguiente), y expone `isLoading` para evitar parpadeos.
- **Generación de ids de item**: `generateCartItemId(prefix)` (exportada desde `lib/CartContext.tsx`) vive fuera de cualquier componente/hook a propósito — `Date.now()` es una función impura y el lint `react-hooks/purity` (parte de `eslint-config-next` vía React Compiler) marca error si se llama directamente dentro del cuerpo de un componente, incluso en un handler anidado como `handleAddToCart`. Cualquier función nueva que necesite generar ids con `Date.now()`/`Math.random()` dentro de un componente debe extraerse igual, a un helper de módulo fuera de la función del componente.
- **Flujos de reserva** (Client Components, uno por servicio): [components/SpaBookingForm.tsx](components/SpaBookingForm.tsx), [components/FoodBookingForm.tsx](components/FoodBookingForm.tsx) y [components/WineBookingForm.tsx](components/WineBookingForm.tsx), montados respectivamente en `app/servicios/spa/page.tsx`, `app/servicios/comida/page.tsx` y `app/servicios/vinos/page.tsx` (páginas Server Component envueltas en `<ProtectedRoute>`, mismo patrón que `/reservar`). Cada uno calcula su propio `totalPrice` y llama a `addToCart()` al enviar; tras agregar, muestran [components/AddedToCartBanner.tsx](components/AddedToCartBanner.tsx) (mensaje + link a `/carrito`) como feedback visual, sin redirigir automáticamente, para permitir seguir agregando servicios.
- **Enlace desde el Home**: [components/ServiceCard.tsx](components/ServiceCard.tsx) ahora incluye un botón "Reservar" que enlaza a `/servicios/${service.id}` — por eso los `id` de `ADDITIONAL_SERVICES` (`"spa"`, `"comida"`, `"vinos"`) deben coincidir exactamente con las carpetas de ruta bajo `app/servicios/`.
- **Página del carrito** ([app/carrito/page.tsx](app/carrito/page.tsx)): Server Component envuelto en `<ProtectedRoute>` que monta [components/CartView.tsx](components/CartView.tsx) (Client Component con toda la interactividad: listado vía [components/CartItemRow.tsx](components/CartItemRow.tsx), eliminar item, total y botón "Pagar servicios"). "Pagar servicios" llama a `clearCart()` y redirige a `/pago-exitoso`, igual que el flujo de `/reservar` — no procesa ningún cobro real.
- **Navbar**: [components/Navbar.tsx](components/Navbar.tsx) agrega un botón de carrito (`/icons/system/cart.svg`, ya existente en `public/icons/system/`) entre el logo y Perfil, con un badge que muestra `useCart().totalItems` cuando es mayor a 0, y enlaza a `/carrito`.

Al conectar Stripe real, el checkout de `/carrito` deberá integrarse con el mismo flujo de pago que reemplace el de `/reservar` (ver sección de integración futura), probablemente combinando ambos carritos (estadía + servicios) en un solo cobro.

## Nota sobre lint: `react-hooks/set-state-in-effect`

El ESLint de este proyecto (via `eslint-config-next`) incluye una regla estricta que marca como error llamar a `setState` dentro de un `useEffect` cuando el valor viene de una lectura/computación (como `JSON.parse` de `localStorage`). La hidratación de la sesión en `AuthProvider` es un caso legítimo de sincronización con un sistema externo al montar (no un efecto derivado en cadena), así que ahí se usa un `eslint-disable-next-line` puntual con comentario explicando el motivo. No copiar ese patrón de deshabilitar la regla para otros casos sin justificarlo de la misma forma — antes de hacerlo, intentar resolver el llamado de estado fuera del efecto (ej. `useState` con inicializador perezoso) cuando el componente no requiera compatibilidad con SSR.

## Infraestructura de Supabase (CLI local, sin uso todavía en la UI)

El CLI de Supabase ya está inicializado para desarrollo local (carpeta `supabase/`, generada con `supabase init`), y el cliente tipado de TypeScript está listo — pero **ningún componente ni página lo usa todavía**. La UI sigue leyendo 100% de `lib/mock-data.ts`; esto es solo la infraestructura de base de datos preparada para cuando se pida conectar el backend real.

- **Levantar el entorno local**: `npx supabase start` (requiere Docker corriendo) levanta Postgres, Auth, Storage, Studio, etc. en contenedores locales; `npx supabase stop` los apaga. La primera vez descarga las imágenes de Docker, lo cual puede tardar varios minutos.
- **Variables de entorno**: `.env.local` (no versionado, ya está en `.gitignore` vía el patrón `.env*`) contiene `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`, tomadas de la salida de `supabase start`. Si se reinicia el entorno local y las claves cambian, hay que actualizar este archivo a mano.
- **Cliente tipado** ([lib/supabase.ts](lib/supabase.ts)): exporta `supabase`, instanciado con `createClient<Database>(supabaseUrl, supabaseAnonKey)`. Lanza un error explícito si las variables de entorno no están definidas (requisito de modo `strict` de TypeScript, ya que `process.env.X` es `string | undefined`) — no usar `!` de aserción no-nula para silenciar esto.
- **Tipos generados** ([lib/database.types.ts](lib/database.types.ts)): generados automáticamente con `npx supabase gen types typescript --local > lib/database.types.ts`. Es un archivo derivado — **no editar a mano**; regenerarlo cada vez que cambie el esquema de la base de datos (nuevas tablas/columnas/enums). Actualmente el esquema está vacío (sin tablas propias), así que el tipo `Database` solo refleja los schemas internos de Supabase.
- No crear tablas, políticas RLS, ni conectar ningún componente/página a `supabase` hasta que se pida explícitamente — este paso fue únicamente dejar la infraestructura lista y tipada.

## Integración futura planeada (NO implementar todavía sin instrucción explícita)

- **Supabase**: Auth (reemplazar el login mockeado por sesiones reales) y Base de Datos (huéspedes, reservaciones, disponibilidad de fechas, servicios adicionales) — el CLI local y el cliente tipado ya existen (ver sección anterior), falta el esquema de tablas y conectar los componentes/contexts reales.
- **Stripe**: procesamiento real de pagos en el flujo de reservación (`app/reservar/page.tsx`), reemplazando la redirección directa a `/pago-exitoso` por un Stripe Checkout o Payment Intent, con confirmación por webhook antes de mostrar la página de éxito.
- **`sonner`**: notificaciones tipo toast globales (ej. confirmar "agregado al carrito", errores de guardado en el modal de `UsersTable.tsx`, feedback de acciones) — todavía no está instalada ni implementada; cuando se agregue, montar su `<Toaster />` en [app/layout.tsx](app/layout.tsx) junto a `AuthProvider`/`CartProvider`.
- Al conectar backend real, mantener `lib/mock-data.ts` como referencia de la forma (shape) de los datos, pero las fuentes de verdad pasarán a ser consultas a Supabase.

## Qué NO hacer

- No agregar autenticación real (verificación de contraseña contra un backend, tokens, hashing), ni llamadas a base de datos hasta que se pida explícitamente. La validación de formato en el cliente (formato de correo, campos no vacíos) sí es parte del prototipo y está implementada — no es lo mismo que autenticación real.
- No introducir librerías de UI pesadas (component libraries completas, con estilos monolíticos propios) para este prototipo salvo que se solicite; preferir Tailwind puro y componentes propios. **Sí están permitidas** las siguientes herramientas por ser *headless* (sin estilos propios, se skinean 100% con Tailwind), de código abierto y costo $0: **`shadcn/ui`** (basada en Radix UI — componentes accesibles sin estilo propio), **`react-day-picker`** (calendarios, ver `components/Calendar.tsx`), **`sonner`** (notificaciones tipo toast — aún no instalada, ver "Integración futura planeada") y **`lucide-react`** (íconos del sistema, ver regla de íconos arriba). No agregar ninguna otra librería de UI (headless o no) sin que se pida explícitamente — esta lista es exhaustiva, no un precedente abierto.
- No romper la estructura de `lib/mock-data.ts` sin actualizar también `DOCUMENTATION.md`.

## Regla permanente: mantenimiento de documentación

A partir de esta iteración, cada cambio estructural, componente clave nuevo, o modificación en el flujo de datos debe venir acompañado — en el mismo turno, sin que el usuario lo pida de nuevo — de la actualización correspondiente en:

- **Este archivo (`CLAUDE.md`)**: cuando cambie el stack, las convenciones, las reglas de diseño, o el modelo de datos/roles simulados.
- **`DOCUMENTATION.md`**: cuando cambie la estructura de carpetas, se agregue una ruta o componente que el equipo necesite editar, o cambien los datos mockeados relevantes para la demo.

No se considera terminada una tarea de código si estos dos archivos quedaron desactualizados respecto al estado real del repositorio.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
