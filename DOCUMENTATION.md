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

## 3. Estructura de carpetas

```
app/
  layout.tsx          → Layout global (Navbar + Footer envolviendo todas las páginas)
  page.tsx             → Pantalla principal del huésped (home) — ruta protegida, envuelta en <ProtectedRoute>
  login/page.tsx        → Pantalla de acceso restringido
  reservar/page.tsx     → Flujo de reservación (fechas, tarifa, resumen, pago) — ruta protegida, envuelta en <ProtectedRoute>
  pago-exitoso/page.tsx → Pantalla estática de confirmación de pago
  admin/page.tsx        → Dashboard de administración (usuarios y reservaciones) — sin protección de ruta
  perfil/page.tsx       → Vista de perfil del usuario con sesión activa — protegida con su propia redirección inline

components/
  Navbar.tsx            → Barra superior (logo + Perfil/Iniciar sesión/Cerrar sesión según la sesión)
  Footer.tsx            → Pie de página
  ProtectedRoute.tsx     → Envoltorio cliente que exige sesión activa; redirige a /login si no la hay
  Carousel.tsx          → Carrusel de fotos de la propiedad
  AmenitiesList.tsx      → Lista de amenidades con íconos
  ServiceCard.tsx         → Tarjeta individual de un servicio adicional
  DateRangeSelector.tsx   → Selector de fecha de llegada/salida
  PricingOptions.tsx      → Radio buttons de tipo de tarifa
  BookingSummary.tsx      → Desglose de cobro (noches + recargo + depósito)
  UsersTable.tsx          → Tabla de usuarios invitados (dashboard admin)
  ReservationsTable.tsx   → Tabla de reservaciones (dashboard admin)

lib/
  mock-data.ts          → TODOS los datos de prueba: fotos, amenidades, servicios, precios, usuarios y reservaciones
  AuthContext.tsx       → Estado global de sesión mockeada (Context + localStorage)
```

Regla simple: **si algo se repite visualmente o tiene lógica propia, vive en `components/`. Si es solo texto o números de ejemplo, vive en `lib/mock-data.ts`.**

## 4. Dónde editar los componentes visuales principales

- **Carrusel de fotos**: la lógica de navegación (flechas, puntos) está en [components/Carousel.tsx](components/Carousel.tsx). Usa `<Image>` de `next/image` (`fill` + `object-contain` + `sizes`, `priority` solo en la primera foto) sobre los archivos reales servidos desde `public/images/`; la etiqueta (`label`) se muestra debajo de la foto. Cada objeto `Photo` en `lib/mock-data.ts` requiere un campo `url` (ruta pública de la imagen, ej. `/images/jardin_1.jpeg`) además de `id` y `label`.
  - **Auto-avance**: un `useEffect` con `setInterval` avanza a la siguiente foto cada 4000 ms (`AUTO_ROTATE_INTERVAL_MS`), limpiando el intervalo en el cleanup del efecto. El efecto depende de `index`, así que cualquier interacción manual (flechas o puntos) reinicia el conteo de 4s — en la práctica, pausa temporalmente el auto-avance sin necesitar estado adicional.
  - **Pausa al pasar el cursor**: el contenedor tiene `onMouseEnter`/`onMouseLeave` que activan/desactivan un estado `isPaused`; mientras está en `true`, el efecto de auto-avance no arranca ningún intervalo.
  - **Transición entre fotos**: cada foto usa `key={photo.id}` en el `<Image>` para forzar su remonte al cambiar, combinado con una animación CSS `fade-in` (`@keyframes` definido en [app/globals.css](app/globals.css), aplicada vía `[animation:fade-in_700ms_ease-in-out]`) que produce el efecto de desvanecimiento al entrar cada foto nueva.
  - **Zoom interactivo con paneo**: dos botones flotantes `(+)/(−)` en la esquina superior derecha de la foto (estilo `bg-neutral-900/70`, sin interferir con las flechas `‹ ›` que están a media altura) controlan un estado `zoom` entre `1` y `3`, en pasos de `0.5`, aplicado como `transform: scale(zoom)` sobre el `<Image>` con `transition-transform duration-300`. El contenedor de la foto mantiene `overflow-hidden` para que la imagen ampliada no se desborde. Con `zoom > 1`, mover el cursor sobre la foto (`onMouseMove`) actualiza un estado `transformOrigin` (posición del cursor en porcentaje respecto al contenedor) para desplazarse por la imagen ampliada; el cursor cambia a `cursor-crosshair` mientras tanto, y `onMouseLeave` regresa el origen a `"50% 50%"`. Tanto el `zoom` como el `transformOrigin` se reinician a sus valores por defecto (`1` y `"50% 50%"`) cada vez que cambia la foto (manual o por auto-avance) — útil para examinar de cerca fotos verticales o con detalle.
- **Tarjetas de "Servicios Adicionales"** (Comida, SPA/Masajes, Paquete de Vinos): el diseño de cada tarjeta está en [components/ServiceCard.tsx](components/ServiceCard.tsx), que usa `<Image>` de `next/image` (contenedor `relative h-48` + `object-cover` + `sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"`, acorde a la grilla `sm:grid-cols-2 lg:grid-cols-3` en la que se muestran) en vez del placeholder gris. El contenido (título, descripción, precio) se edita en `lib/mock-data.ts`, no en el componente. Cada servicio en `ADDITIONAL_SERVICES` requiere también un campo `image` (ruta pública a la fotografía en `public/images/`, ej. `/images/servicio_comida_holder.jpg`) — sin este campo, `ServiceCard` no puede renderizar la tarjeta.
- **Amenidades**: el diseño está en [components/AmenitiesList.tsx](components/AmenitiesList.tsx), que ahora itera primero por **categoría** (`AmenityCategory`, subtítulo tipo Airbnb) y luego por cada amenidad dentro de ella, mostrando su ícono `.svg` (tag `<img>` nativo, no `next/image`, porque el optimizador de imágenes de Next.js no sirve SVG sin habilitar `dangerouslyAllowSVG` en `next.config.ts`) seguido del texto. El contenido (categorías, amenidades y la ruta `url` de cada ícono) se edita en `lib/mock-data.ts`; los archivos `.svg` reales viven en `public/icons/amenities/<categoría>/`.
- **Tablas del dashboard de administración**: el diseño de la tabla de usuarios está en [components/UsersTable.tsx](components/UsersTable.tsx) y el de reservaciones en [components/ReservationsTable.tsx](components/ReservationsTable.tsx). El contenido de ambas tablas se edita en `lib/mock-data.ts`, igual que el resto del sitio.

## 5. Dónde están los datos mockeados (para editar antes de la demo)

Todo está en un único archivo: **[lib/mock-data.ts](lib/mock-data.ts)**. Ahí se puede cambiar sin tocar ningún componente:

| Qué quieres cambiar | Variable en `mock-data.ts` |
|---|---|
| Fotos del carrusel (cantidad, etiquetas y `url` del archivo en `public/images/`) | `PROPERTY_PHOTOS` |
| Amenidades de la casa (categorías y, dentro de cada una, sus amenidades con `url` al ícono `.svg`) | `AMENITIES` |
| Servicios adicionales (Comida, SPA, Vinos), incluyendo la `image` de cada uno | `ADDITIONAL_SERVICES` |
| Tipos de tarifa (Estándar / Flexible) y su recargo | `FARE_OPTIONS` |
| Precio por noche y depósito de garantía | `PRICING_CONFIG` |
| Usuarios del panel de administración (nombre, email, rol, estado) | `mockUsers` |
| Reservaciones del panel de administración (huésped, fechas, monto, estado) | `mockReservations` |

Ejemplo: para cambiar el precio por noche de $250 a $300, solo hay que editar `nightlyRate` dentro de `PRICING_CONFIG` en ese archivo. El resumen de cobro en la página de reservación se recalcula solo.

Para agregar un nuevo usuario o una nueva reservación de prueba, basta con agregar un objeto más al array `mockUsers` o `mockReservations` en `lib/mock-data.ts` — las tablas del panel de administración se actualizan automáticamente.

**Estructura de `AMENITIES`**: dejó de ser una lista plana de amenidades para ser un arreglo de categorías (`AmenityCategory[]`). Cada categoría tiene `id`, `category` (el subtítulo visible, ej. "Cocina y comedor") y `items: Amenity[]`; cada `Amenity` tiene `id`, `label` y `url` (ruta pública al ícono `.svg`, ej. `/icons/amenities/cocina/fridge.svg`). Para agregar una amenidad nueva, primero colocar su ícono en `public/icons/amenities/<categoría>/` y luego referenciarlo desde `url` en el `items` correspondiente — si dos amenidades no tienen un ícono dedicado (ej. "congelador" y "refrigerador"), es válido que compartan el mismo archivo `.svg`.

**Íconos del sistema** ([public/icons/system/](public/icons/system/)): íconos `.svg` usados en la UI de navegación (perfil, cerrar sesión, logo, carrito). [components/Navbar.tsx](components/Navbar.tsx) los usa como `<img>` nativo en vez de texto plano para los botones "Perfil" y "Cerrar sesión"; el texto se conserva accesible con `sr-only` para lectores de pantalla.

## 6. Sistema de roles simulado, sesión y panel de administración

El prototipo distingue dos roles: **Huésped** (`guest`) y **Administrador** (`admin`). Sigue sin haber autenticación real (no hay verificación de contraseña ni backend), pero ahora sí existe una **sesión mockeada persistente**, manejada por [lib/AuthContext.tsx](lib/AuthContext.tsx):

- `AuthProvider` envuelve toda la app en [app/layout.tsx](app/layout.tsx) y expone un usuario de sesión (`user`) a través de un React Context.
- La sesión se guarda en `localStorage` (clave `casabrava_session_user`), por lo que **persiste al recargar la página o reiniciar el servidor de desarrollo** — no se pierde hasta que alguien cierra sesión o borra el storage del navegador.
- El hook `useAuth()` (exportado desde el mismo archivo) da acceso a `user`, `isLoading`, `login(email)` y `logout()` desde cualquier componente cliente.

**Validación del formulario de login** ([app/login/page.tsx](app/login/page.tsx)):

- El campo de correo se valida contra un formato básico (`nombre@dominio.tld`) antes de enviar el formulario. Entradas como `rafael` o `rafael@` muestran un mensaje de error en rojo debajo del input y no procesan el envío.
- El campo de contraseña solo valida que no esté vacío (sigue sin comparar contra ninguna contraseña real).
- El formulario usa `noValidate` para desactivar la validación nativa del navegador y mostrar siempre nuestros propios mensajes de error estilizados con Tailwind.

**Cómo probarlo:**

1. Ir a [/login](app/login/page.tsx).
2. Escribir un correo con formato inválido (ej. `rafael@`) y dar clic en "Ingresar" → debe aparecer un mensaje de error en rojo bajo el campo, sin redirigir.
3. Con el correo `admin@test.com` (cualquier contraseña no vacía), el login busca ese usuario en `mockUsers`, lo guarda como sesión activa y redirige a `/admin`.
4. Con cualquier otro correo válido, se guarda una sesión de "Huésped" genérico con ese correo y redirige a `/` (vista de huésped).
5. Recargar el navegador (o reiniciar `npm run dev`) y volver a entrar a la app: la sesión sigue activa porque vive en `localStorage`, no en memoria.

**Navbar dinámico** ([components/Navbar.tsx](components/Navbar.tsx)): lee `useAuth()` para decidir qué mostrar — si hay sesión activa, muestra los botones de "Perfil" y "Cerrar sesión" como íconos (`/icons/system/profile.svg` y `/icons/system/logout.svg`, con texto accesible `sr-only` y `title` como tooltip); si no hay sesión, muestra el enlace de texto "Iniciar sesión".

**Vista de Perfil** ([app/perfil/page.tsx](app/perfil/page.tsx)): muestra Nombre, Correo y Rol del usuario en sesión, en dos tarjetas (avatar + ficha de datos) con la paleta `neutral`. Si no hay ningún usuario en sesión, redirige automáticamente a `/login`.

**Rutas protegidas por sesión (`ProtectedRoute`)**: el Home (`/`) y el flujo de reservación (`/reservar`) ahora exigen sesión activa. La protección se implementa con [components/ProtectedRoute.tsx](components/ProtectedRoute.tsx), un componente `"use client"` que envuelve el contenido de la página: consume `useAuth()`, y si `!isLoading && !user` redirige a `/login`; mientras `isLoading` es `true` muestra un estado de carga breve, y si hay sesión renderiza `children` normalmente. Esto permite que `app/page.tsx` siga siendo un Server Component — solo el wrapper `<ProtectedRoute>` es cliente, no toda la página. `/admin` sigue sin este guard (ver sección 7).

**Panel de administración** ([app/admin/page.tsx](app/admin/page.tsx)):

- **Sección "Usuarios invitados"**: tabla con los datos de `mockUsers` (nombre, email, rol, estado) usando [components/UsersTable.tsx](components/UsersTable.tsx). El botón "Editar" es únicamente visual, no abre ningún formulario todavía.
- **Sección "Reservaciones"**: tabla con los datos de `mockReservations` usando [components/ReservationsTable.tsx](components/ReservationsTable.tsx), filtrando en la propia página (`app/admin/page.tsx`) para no mostrar las reservaciones con estado `pasada`.
- Sigue sin tener ningún guard de ruta: es accesible por URL directa sin pasar por `/login`, incluso si `useAuth()` reporta que no hay sesión o que el rol no es `admin`.

## 7. Qué falta conectar al backend (próximos sprints)

Esto es un prototipo de interfaz, así que lo siguiente **todavía no funciona de verdad** y queda pendiente:

- **Login** ([app/login/page.tsx](app/login/page.tsx)): valida formato de correo y que la contraseña no esté vacía, pero no verifica ninguna contraseña real contra un backend. Falta conectar autenticación real con roles reales (planeado: Supabase Auth).
- **Sesión mockeada** ([lib/AuthContext.tsx](lib/AuthContext.tsx)): la "sesión" es un objeto guardado en `localStorage` del navegador, sin token, sin expiración y sin backend que la respalde. Cualquiera puede editarla manualmente desde las DevTools del navegador. Falta reemplazarla por sesiones reales de Supabase Auth (cookies/JWT).
- **Protección de rutas**: `/admin` no está protegida por ningún guard de ruta — cualquiera que conozca la URL puede entrar directamente sin pasar por el login, incluso sin sesión o con rol `guest`. `/`, `/reservar` (vía `<ProtectedRoute>`) y `/perfil` (redirección inline) sí redirigen a `/login` si no hay sesión, pero es una redirección en el cliente (después de que la página ya cargó), no un guard real de servidor — no evita que el HTML/JS de la página llegue a cargarse brevemente antes de redirigir. Falta un guard de ruta real basado en sesión/rol (planeado: middleware de Next.js + Supabase Auth).
- **Disponibilidad de fechas** ([app/reservar/page.tsx](app/reservar/page.tsx)): el selector de fechas no valida contra un calendario de disponibilidad real; solo calcula noches entre dos fechas.
- **Pago** (botón "Proceder al pago"): redirige directo a la pantalla de éxito sin cobrar nada. Falta integrar un proveedor de pagos real (planeado: Stripe).
- **Persistencia de la reservación**: no se guarda en ningún lado; al recargar la página se pierde todo. Falta una base de datos (planeado: Supabase).
- **Panel de administración** ([app/admin/page.tsx](app/admin/page.tsx)): las tablas de usuarios y reservaciones son de solo lectura sobre datos mockeados; el botón "Editar" no hace nada. Falta conectar a Supabase para leer/escribir usuarios y reservaciones reales.

Para más detalle técnico sobre el stack y las convenciones de código, ver [CLAUDE.md](CLAUDE.md).
