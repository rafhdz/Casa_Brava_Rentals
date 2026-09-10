# CLAUDE.md

Memoria técnica del proyecto para futuras interacciones con IA. Léelo antes de generar o modificar código en este repositorio.

## Qué es este proyecto

Casa Brava Rentals nació como el sistema de reservaciones de una sola casa privada de renta, de acceso exclusivo por invitación. Desde la Fase 4 del plan de producto, ese sistema vive **dentro** de un marketplace territorial más grande, **Parras Home Hub (PHH)**: un directorio público de hospedaje en Parras de la Fuente, Coahuila, con propiedades de acceso abierto y propiedades exclusivas por invitación (Casa Brava es la primera de estas últimas). Ver "Arquitectura multi-tenant (Fase 4 — Parras Home Hub)" más abajo para el detalle completo — es lectura obligatoria antes de tocar rutas, el Navbar/Footer o `middleware.ts`.

**Arquitectura desacoplada en dos piezas que corren por separado:**

| Pieza | Qué es | Dónde vive | Puerto |
| --- | --- | --- | --- |
| **Frontend** | Next.js 16 (App Router) + React 19 + Tailwind v4 | raíz del repositorio | 3000 |
| **Backend** | Django 6.1 + DRF + SimpleJWT sobre PostgreSQL | [backend/](backend) | 8000 |

El frontend **no tiene base de datos ni ORM propio**. Todo dato de negocio —perfiles, reservaciones, catálogos, disponibilidad, contenido del Home, cobros— se pide al backend por HTTP contra su API REST, autenticada con JWT. La única excepción es el carrito de servicios pre-checkout, que vive en `localStorage` hasta que se paga (ver "Carrito de servicios adicionales").

El único flujo todavía simulado es el **procesamiento de pagos**: el botón de pago redirige a una página de éxito sin cobrar nada real (ver "Integración futura planeada").

> **Regla de oro de esta arquitectura:** el frontend no reimplementa reglas de negocio. La validación de fechas, la detección de solapamiento, el cálculo de montos y el control de inventario del spa corren en el backend, dentro de transacciones con bloqueo de fila. Duplicar esas reglas aquí no solo sería código repetido: sería **inseguro**, porque dos peticiones concurrentes pueden pasar una verificación hecha en el cliente y aun así chocar entre sí.

---

## Arquitectura multi-tenant (Fase 4 — Parras Home Hub)

El backend (Django) sigue siendo de **una sola propiedad**: no sabe nada de un marketplace, de otros anfitriones ni de códigos de invitación. Todo lo territorial (landing pública, directorio de propiedades, portal de anfitrión) es una capa **100% frontend y 100% mock**, construida para no bloquear el diseño del producto en el trabajo de backend multi-tenant que todavía no existe. Casa Brava se re-etiqueta como **"Tenant 0"**: la única propiedad respaldada por datos reales, servida bajo `/p/casa-brava/**`.

### La capa mock y su frontera con `lib/api/`

- **[lib/types/marketplace.ts](lib/types/marketplace.ts)** — `Property`, `AccessType`, `AccessGrant`. Deliberadamente separados de los tipos de [lib/api/types.ts](lib/api/types.ts): unos describen lo que devuelve Django (Casa Brava), los otros el directorio mock.
- **[lib/mock/marketplace-data.ts](lib/mock/marketplace-data.ts)** — `TENANT_ZERO_SLUG` (`"casa-brava"`), `PROPERTIES` (4: Casa Brava `INVITE_ONLY` + 3 ficticias `OPEN`), `ACCESS_GRANTS`, y los helpers `getPropertyBySlug`, `isInviteOnlyBySlug`, `validateInviteCode`. Es JS/TS puro, sin ningún import de Node ni de `next/headers` — lo importa `middleware.ts`, que corre en el Edge Runtime en cada navegación, así que un import roto ahí no es un error de tipos sutil, es un 500 en todas las rutas del sitio.
- **Frontera dura, sin excepciones**: ningún código que atienda una propiedad mock (cualquier slug distinto de `TENANT_ZERO_SLUG`) puede llamar a `checkoutStay`, `checkoutCartServices`, `serverFetch(All)` ni `getActiveReservation`. Esos asumen un backend real con IDs (tarifas, masajistas, menús, vinos) que las propiedades mock no tienen — usarlos con un slug/id inventado produciría un 404/400 real contra Django o, peor, crearía una reservación real a nombre de una propiedad que no existe ahí. Cada archivo bajo `app/p/[slug]/` bifurca explícitamente con `if (slug === TENANT_ZERO_SLUG)` para mantener esta frontera visible en el propio código, no solo en este documento.
- **Código de invitación ≠ login.** `AccessGrant`/`validateInviteCode` solo *encuentran* una propiedad `INVITE_ONLY` para navegar a `/p/<slug>` — no crean sesión. Si esa propiedad exige sesión (ver guards de ruta), `middleware.ts` la sigue exigiendo después del canje. No es una vía paralela de autenticación.

### Navbar/Footer: despachador por ruta, no por carpeta

PHH (directorio público, sin sesión) y Casa Brava (app de huésped autenticado, con carrito/perfil/logout) son dos productos con audiencias distintas montados bajo el mismo `app/layout.tsx`. En vez de duplicar el layout raíz o mover `/login`, `/carrito`, `/perfil`, `/admin` a un route group nuevo, **`components/Navbar.tsx` y `components/Footer.tsx` son despachadores delgados** que leen `usePathname()`:

- En `/`, `/sobre-nosotros`, `/conoce-parras`, `/supplier` → `MarketplaceNavbar`/`MarketplaceFooter`.
- En cualquier otra ruta (`/p/**`, `/login`, `/register`, `/carrito`, `/perfil`, `/admin`) → `TenantNavbar`/`TenantFooter`, que son el contenido *exacto* de los antiguos `Navbar.tsx`/`Footer.tsx` movido a archivo propio.

`app/layout.tsx` no cambió: sigue montando un solo `<Navbar/>`/`<Footer/>`. **No mover esta lógica a `layout.tsx` ni a un route group** — es la decisión de arquitectura, no un paso intermedio a "terminar" después.

### `/p/[slug]`: fachada, reservar, servicios y checkout

Cada página bajo `app/p/[slug]/` bifurca por slug:

- **`slug === "casa-brava"`** → la lógica real, movida tal cual desde las antiguas `app/page.tsx`, `app/reservar/page.tsx` y `app/servicios/{spa,comida,vinos}/page.tsx` (mismos fetches, mismos Server Actions, mismos componentes `ReservarForm`/`SpaBookingForm`/`FoodBookingForm`/`WineBookingForm` — solo se actualizaron los `href` internos que apuntaban a `/reservar`/`/servicios/*`).
- **Cualquier otro slug** (las 3 propiedades `OPEN`) → una versión mock sin ningún fetch al backend: `MockReservarForm` para fechas/huéspedes/resumen, y `ServiceAccessNotice` (reutilizado, sin cambios) para spa/comida/vinos con copy "próximamente" — no se construyó un catálogo mock completo porque eso se leería como funcionalidad real rota.
- **`/p/[slug]/checkout`** es **aditivo**, no reemplaza el flujo real: para Casa Brava, `ReservarForm`/`CartView` siguen llamando a `checkoutStay`/`checkoutCartServices` y redirigiendo a `/pago-exitoso` exactamente como antes de la Fase 4 — cero riesgo de doble escritura. La ruta `/p/casa-brava/checkout` es una pantalla de **solo lectura** (lee `getActiveReservation()`, muestra `gran_total` ya calculado por el backend) para quien navegue ahí directamente. Para las propiedades `OPEN` es la única pantalla de "pago": recalcula el total con `basePricePerNight` mock a partir de la query string que le pasó `MockReservarForm`, y el botón "Confirmar" solo redirige a `/pago-exitoso` — nunca escribe nada.

### `/supplier`: portal de anfitrión sin mutaciones

`app/supplier/` lista `PROPERTIES` (mock) como "Mis propiedades", con un badge de Stripe Connect y una métrica de ocupación **simulados**, y `SupplierPropertiesTable` (que no escribe nada — sus botones disparan un toast "disponible próximamente"). Esto es la decisión, no un recorte por falta de tiempo: no existe todavía un rol "anfitrión" en el backend (`usuarios.role` solo conoce `admin`/`holder`/`guest`), ni tablas de propiedades por dueño, ni Stripe Connect real. Construir un CRUD que persista contra `localStorage` inventaría un modelo de datos que se tiraría por completo en cuanto el backend soporte multi-tenant — exactamente lo que prohíbe "No reintroducir una capa de datos en el frontend" más abajo.

### Redirects que cambiaron de destino

`/` dejó de ser el "home" de un huésped autenticado — ahora es la landing pública de PHH. Cualquier lugar que antes mandaba a un huésped a `/` después de autenticarse ahora manda a `` `/p/${TENANT_ZERO_SLUG}` ``: el redirect post-login de huésped en `app/login/page.tsx`, el redirect post-registro en `app/register/page.tsx`, el logo de `TenantNavbar`, y los dos `href` hardcodeados de `CartView.tsx` ("Reservar estadía", "Explorar servicios"). `TENANT_ZERO_SLUG` se importa siempre desde `lib/mock/marketplace-data.ts` — no repetir el string `"casa-brava"` a mano en código nuevo.

---

## Cómo ejecutar el proyecto localmente

Se necesitan **dos terminales**, una por pieza. El frontend no arranca útilmente sin el backend: toda página con datos falla si la API no responde.

### Requisitos previos

- **Node.js 20+** y npm — para el frontend.
- **Python 3.12+** y [`uv`](https://docs.astral.sh/uv/) — para el backend (`uv` gestiona el entorno virtual y las dependencias; no hace falta activar nada a mano).
- **PostgreSQL** corriendo, si se quiere la protección real contra doble reserva. Con `DB_ENGINE=sqlite` el proyecto arranca en un minuto, pero SQLite **no soporta bloqueo de filas** y Django ignora `select_for_update()` en silencio: la lógica anti double-booking queda desactivada. Ver `backend/README.md` §3.

### Terminal 1 — Backend (Django, puerto 8000)

```bash
cd backend
uv sync
cp .env.example .env
uv run python manage.py migrate
uv run python manage.py seed_demo
uv run python manage.py runserver
```

- `uv sync` instala las dependencias en `backend/.venv`.
- `cp .env.example .env` crea la configuración local; ajustar las credenciales de la base ahí.
- `seed_demo` carga datos de desarrollo (usuarios, tarifas, catálogos, disponibilidad relativa a la fecha de hoy, y el contenido visual del Home: fotos del carrusel, categorías de amenidades y tarjetas de servicios adicionales). Es idempotente: se puede volver a correr sin duplicar.
- Opcional: `uv run python manage.py createsuperuser` para entrar al admin de Django.

Con eso arriba:

- API: <http://localhost:8000>
- Documentación interactiva (OpenAPI/Swagger): <http://localhost:8000/api/docs>
- Admin de Django: <http://localhost:8000/admin>

> `uv run <comando>` ejecuta dentro del entorno del proyecto sin activarlo. Si prefieres activarlo (`source .venv/bin/activate`), los comandos funcionan igual sin el prefijo.

### Terminal 2 — Frontend (Next.js, puerto 3000)

```bash
npm install
npm run dev
```

Abrir <http://localhost:3000>.

### Configuración que conecta las dos piezas

- **Frontend** — `.env.local` en la raíz:

  ```
  API_URL=http://localhost:8000
  ```

  Sin el prefijo `NEXT_PUBLIC_` a propósito: ningún componente del navegador habla con Django directamente. Si falta, se usa `http://localhost:8000` por defecto.

- **Backend** — `backend/.env`: `CORS_ALLOWED_ORIGINS` debe incluir `http://localhost:3000`.

### Usuarios de desarrollo

`seed_demo` crea tres cuentas, todas con la contraseña **`changeme123`** (valor de desarrollo, no un secreto real):

| Correo | Rol | Qué ve |
| --- | --- | --- |
| `admin@test.com` | `admin` | Panel de administración completo |
| `carlos.ruiz@example.com` | `holder` | Experiencia de huésped (lectura ampliada en la API) |
| `maria.gomez@example.com` | `guest` | Experiencia de huésped |

### Comandos útiles

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Frontend en desarrollo |
| `npm run build` | Compila el frontend (verifica tipos) |
| `npm run lint` | ESLint del frontend |
| `npx tsc --noEmit` | Solo verificación de tipos |
| `cd backend && uv run python manage.py test` | Pruebas del backend |
| `cd backend && uv run python manage.py makemigrations` | Tras cambiar `models.py` |

---

## Stack tecnológico (frontend)

- **Next.js 16** (App Router, no Pages Router) con Turbopack.
- **React 19**.
- **TypeScript** en modo `strict`. No usar `any` salvo casos justificados.
- **Tailwind CSS v4** (configuración basada en CSS vía `@import "tailwindcss"` en [app/globals.css](app/globals.css); no existe `tailwind.config.js`, los tokens se definen con `@theme`).
- **Sin cliente de base de datos ni ORM**: el acceso a datos es `fetch` nativo contra la API de Django, encapsulado en [lib/api/](lib/api).
- **Librerías headless permitidas** (ver "Qué NO hacer"): `lucide-react` (íconos del sistema), `react-day-picker` + `date-fns` (calendarios), `sonner` (notificaciones tipo toast). Ninguna trae CSS propio importado — se estilizan 100% con Tailwind vía sus props `classNames`/`className`.
- **`sonner`** está montado en [app/layout.tsx](app/layout.tsx) como hijo de `<CartProvider>` (junto a `<Navbar />`/`<main>`/`<Footer />`, dentro de `<AuthProvider>`), para que cualquier Client Component pueda llamar a `toast.*` sin volver a montar el `<Toaster />`. Se configuró con `unstyled: true` + `toastOptions.classNames` (no el look "richColors" por defecto) para que el toast se vea como una tarjeta más del sistema — `rounded-2xl`, `border-neutral-200`, `bg-white`, `text-neutral-900`, mismo lenguaje visual que los modales de `UsersTable.tsx`/`ReservationsTable.tsx`. Es la señal de carga/éxito/error de los CRUD de `/admin` y de los flujos de checkout: los botones ya no cambian de texto mientras una Server Action está en vuelo, pero siguen deshabilitados vía `isPending`/`isProcessing` para evitar doble envío.
- Alias de imports: `@/*` apunta a la raíz del proyecto (ver `tsconfig.json`). Usar siempre `@/components/...`, `@/lib/...`, nunca rutas relativas largas (`../../../`).

## Convenciones de nomenclatura

- Componentes React: `PascalCase.tsx` dentro de `components/` (ej. `BookingSummary.tsx`).
- Rutas/páginas: carpetas en minúsculas y en español, siguiendo el idioma de la UI (ej. `app/reservar/page.tsx`, `app/pago-exitoso/page.tsx`).
- Funciones y variables: `camelCase`. Tipos e interfaces: `PascalCase`.
- Un componente por archivo. Exportación por defecto para componentes de página y de UI en `components/`.
- No hardcodear precios, amenidades ni textos/imágenes de servicios dentro de los componentes: ese contenido vive en el backend y se consulta desde el Server Component de la página correspondiente.

## Reglas de diseño

- **Mobile-first**: escribir las clases base pensando en mobile y usar prefijos (`sm:`, `md:`, `lg:`) para escalar hacia arriba. Nunca partir de un layout desktop y luego "achicar".
- Paleta minimalista en escala de grises (neutral-\*) con acentos en negro (`neutral-900`) para botones primarios.
- **Íconos del sistema** (Navbar, `BackButton`, controles del carrusel, botones de UI) usan componentes de **`lucide-react`** (ej. `<User className="h-5 w-5" />`), no archivos `.svg` estáticos. Los `.svg` de `public/icons/system/` quedan obsoletos para este propósito — no se borran, pero no se referencian desde componentes nuevos.
- **Íconos de amenidades** (`public/icons/amenities/<categoría>/`) **siguen usando `<img>` nativo** apuntando al `.svg`, no `lucide-react` ni `next/image`. Es intencional: son ilustraciones curadas de la propiedad (cocina, alberca, etc.), no íconos genéricos de interfaz, y `lucide-react` no tiene equivalentes para la mayoría. Además el optimizador de imágenes de Next.js rechaza `.svg` a menos que se habilite `dangerouslyAllowSVG` en `next.config.ts`, y no se ha activado. `next/image` sigue siendo el estándar para fotografías (`.jpeg`/`.png`), como en `Carousel.tsx`.
- Toda vez que se use `<Image fill>`, agregar siempre la prop `sizes` con el ancho real que ocupará la imagen en cada breakpoint (ej. `sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"` para una grilla `sm:grid-cols-2 lg:grid-cols-3`). Sin `sizes`, Next.js emite una advertencia de rendimiento y puede descargar una imagen más pesada de lo necesario. Reservar `priority` únicamente para la imagen arriba del fold en la carga inicial (la primera foto del carrusel en `app/page.tsx`), no para imágenes más abajo (como las de `ServiceCard.tsx`).
- **Calendarios** ([components/Calendar.tsx](components/Calendar.tsx), wrapper de `react-day-picker`): cualquier clase pensada para sobreescribir el estilo por defecto de una celda (`outside`, `disabled`, `range_start`/`range_end`/`range_middle`) debe llevar `!important` en **todas** sus propiedades, no solo en la que a simple vista parece necesitarlo. react-day-picker activa varios modificadores a la vez sobre la misma celda (ej. `selected` + `range_start`, u `outside` + `disabled`), y sin forzarlo el orden de generación de Tailwind decide cuál gana, no la clase semánticamente correcta. Para indicadores de disponibilidad día por día (verde disponible / rojo bloqueado) usar el patrón ya establecido en `AVAILABILITY_MODIFIERS_CLASS_NAMES` (exportado desde `Calendar.tsx`, integrado hoy en `SpaBookingForm.tsx`) en vez de inventar uno nuevo por componente.
- **Fechas ISO nunca se pasan por `new Date("yyyy-MM-dd")`**: se interpreta en UTC y puede desfasar un día según la zona horaria del navegador. Usar `parseISO` de `date-fns`, o `new Date(\`${valor}T00:00:00\`)` cuando no haya `date-fns` a mano (ver `formatSimulatedDate` en [lib/format.ts](lib/format.ts) y `formatDate` en `ReservationsTable.tsx`). Para comparar dos fechas ISO basta comparar los strings: de ancho fijo, ordenan igual lexicográfica que cronológicamente.
- Componentes reutilizables van en `components/`; las páginas (`app/**/page.tsx`) solo componen esos componentes y manejan estado/routing.
- **Patrón "page fetch, form interactúa"**: cuando una página necesita datos del backend **y** estado interactivo de cliente, la página es un Server Component `async` que hace el/los `fetch` y pasa los datos por props a un Client Component dedicado en `components/` (ej. `app/reservar/page.tsx` → `components/ReservarForm.tsx`; `app/servicios/spa/page.tsx` → `components/SpaBookingForm.tsx`; `app/admin/reservations/page.tsx` → `ReservationsTable.tsx`). Ninguna página mezcla `"use client"` con un fetch de servidor: si necesita ambas cosas, se separa en dos archivos.
- La protección de rutas por sesión corre en [middleware.ts](middleware.ts), del lado del servidor, antes de que la página renderice. Ninguna página necesita un wrapper de auth en su JSX.

---

## Capa de acceso a la API ([lib/api/](lib/api))

Todo el tráfico hacia Django pasa por aquí. Seis archivos, cada uno con una responsabilidad:

| Archivo | Qué hace |
| --- | --- |
| [config.ts](lib/api/config.ts) | `API_BASE_URL`, nombres de las cookies de sesión y rutas de autenticación. |
| [types.ts](lib/api/types.ts) | **Todos los contratos de la API en TypeScript.** Escrito a mano contra los serializers del backend; no hay generador. Reemplaza al antiguo archivo de tipos generado desde el esquema de la base. Exporta además dos listas en tiempo de ejecución derivadas de esos enums: `ESTADOS_ACTIVOS` y `MEAL_TYPES` (los tres tiempos de comida, que alimentan el select del catálogo de menús). |
| [client.ts](lib/api/client.ts) | `apiFetch` (petición cruda + `ApiError`), `extractErrorMessage` y `fetchAllPages`. No sabe nada de sesión: recibe el token ya resuelto. |
| [jwt.ts](lib/api/jwt.ts) | Lectura de claims **sin verificar firma**. Aparte de `session.ts` porque `middleware.ts` también lo necesita y no puede importar `next/headers`. |
| [session.ts](lib/api/session.ts) | Lectura/escritura/borrado de las cookies de sesión con `next/headers`. Para Server Components, Server Actions y Route Handlers. |
| [server.ts](lib/api/server.ts) | `serverFetch`, `serverFetchAll`, `publicFetchAll`, `getSessionUser` y `toActionError`. Resuelve la sesión, refresca si hace falta y reintenta ante un 401. |

### Tres cosas que hay que saber antes de tocar esta capa

1. **Los decimales viajan como `string`, no como `number`.**
   `COERCE_DECIMAL_TO_STRING` viene activado por defecto en DRF, así que `nightly_rate` llega como `"4500.00"` y `surcharge_percentage` como `"15.00"`. Es a propósito: evita la pérdida de precisión de un float al serializar dinero. En [types.ts](lib/api/types.ts) esos campos se tipan con el alias `Decimal` (que es `string`).
   **Nunca operar aritméticamente sobre ellos directamente** — `"4500.00" * 2` no es lo que parece. Convertir antes con `toNumber()` de [lib/format.ts](lib/format.ts), o formatear con `formatMoney()`. La conversión se hace **en la página** (Server Component), para que los componentes de presentación sigan recibiendo números limpios.

2. **Las listas vienen paginadas de a 50 y el backend no acepta un tamaño mayor.**
   La respuesta es `{count, next, previous, results}`. Leer solo `.results` de la primera página **trunca en silencio** cualquier colección más grande: la disponibilidad de spa ya pasa de 80 bloques, y el formulario del huésped dejaría de ofrecer los días más lejanos sin ningún error visible. Por eso existe `fetchAllPages` / `serverFetchAll`, que siguen el enlace `next` hasta agotarla. **Usarlos siempre para colecciones**, no `apiFetch` a secas.
   Tres endpoints son la excepción y devuelven un arreglo plano (declaran `pagination_class = None`): fotos, categorías de amenidades y tarjetas de servicios del Home. `fetchAllPages` acepta las dos formas.

3. **Los errores de DRF tienen tres formas distintas**, y `extractErrorMessage` las aplana a un solo mensaje:
   - `{"detail": "..."}` — excepciones de API (401/403/404/409 y errores de dominio).
   - `{"campo": ["mensaje", ...]}` — errores de validación por campo.
   - `["mensaje", ...]` — errores no asociados a un campo.

   Un **409 Conflict** significa que la petición estaba bien formada pero se perdió la carrera contra otro usuario (fechas que se cruzan, bloque de spa ya tomado). Esos mensajes vienen redactados en español pensando en el huésped, así que se muestran tal cual.

---

## Autenticación: JWT en cookies httpOnly

El backend emite un par de tokens (SimpleJWT) y el frontend los guarda en **dos cookies httpOnly**: `cb_access` y `cb_refresh` (nombres en [config.ts](lib/api/config.ts)).

### Por qué httpOnly y no `localStorage`

El token tiene que ser legible **por el servidor de Next.js**: el middleware decide el acceso a una ruta *antes* de renderizarla, y cada Server Component y Server Action necesita el token para llamar a Django. Nada de eso puede leer `localStorage`. Como efecto secundario, un XSS tampoco puede robar el token: el JavaScript de la página no lo ve.

Consecuencia de diseño: **ningún Client Component habla con Django directamente.** Todo pasa por un Server Component o una Server Action.

### Piezas del flujo

- **[app/actions/auth.ts](app/actions/auth.ts)** — `loginAction`, `registerAction`, `logoutAction`. Son Server Actions porque el resultado del login son cookies, y solo el servidor puede escribirlas.
  - `loginAction`: `POST /api/auth/token/` ⇒ `{access, refresh, user}` ⇒ escribe cookies.
  - `registerAction`: `POST /api/auth/registro/` (siempre rol `guest`; el endpoint ni siquiera acepta el campo `role`) y encadena un login, para entrar directo sin pasar por `/login`.
  - `logoutAction`: invalida el refresh en el backend (lista negra) y borra las cookies. Si el backend no responde, **las cookies se borran igual**.
- **[middleware.ts](middleware.ts)** — refresca la sesión en cada navegación y aplica los guards de ruta. Es el único lugar que puede *persistir* un token refrescado durante una navegación normal (un Server Component no puede escribir cookies). Cuando refresca, escribe el token nuevo también en el `request`, para que los Server Components de **esa misma** navegación lo usen ya renovado.
- **[lib/AuthContext.tsx](lib/AuthContext.tsx)** — expone `useAuth()` con `{ user, isLoading, login, logout }`.
  - `user` es un único objeto `Usuario`. **Ya no existe el par `user` + `profile`**: el backend fusiona credenciales y perfil en un solo modelo.
  - El contexto **no guarda estado propio ni consulta el perfil**: lo recibe por prop (`initialUser`) desde el layout raíz, que lo resuelve en el servidor con `getSessionUser()`. Eso elimina el parpadeo de carga inicial y cualquier carrera entre el fetch del perfil y el del login.
  - `initialUser` es la fuente de verdad, no una semilla de `useState`: cada `router.refresh()` vuelve a renderizar el layout en el servidor y baja el perfil actualizado. Copiarlo a estado obligaría a sincronizarlo con un efecto, justo el patrón que prohíbe la regla de lint documentada más abajo.
  - `logout()` es `async`: cualquier caller (`Navbar.tsx`, `app/perfil/page.tsx`) debe hacer `await logout()` antes de redirigir.

### Rotación de tokens

`ROTATE_REFRESH_TOKENS` está **activado** en el backend y el refresh anterior queda en lista negra. Por eso, cada vez que se canjea un refresh hay que guardar **el par completo** que vuelve; conservar el viejo deja la sesión muerta en el siguiente intento. Tanto `middleware.ts` como `refreshSession` en [server.ts](lib/api/server.ts) lo hacen así.

### Guards de ruta (en `middleware.ts`)

- Requieren sesión, por prefijo: `/perfil`, `/carrito`.
- **`/p/<slug>/**` (fachada + `reservar` + `servicios/*` + `checkout` de una propiedad) requiere sesión si y solo si esa propiedad es `INVITE_ONLY`.** Ya no son prefijos fijos (`/reservar`, `/servicios/*` no existen en la raíz desde la Fase 4): el middleware extrae el `slug` con `PROPERTY_ROUTE_PATTERN` (`^/p/([^/]+)(?:\/|$)`) y llama a `isInviteOnlyBySlug(slug)` de [lib/mock/marketplace-data.ts](lib/mock/marketplace-data.ts) — ver "Arquitectura multi-tenant" más abajo para el porqué completo de esta capa mock.
  > ⚠️ **`/` (home) YA NO requiere sesión, y eso es correcto.** En la arquitectura de una sola propiedad (pre-Fase-4), `/` *era* la fachada de Casa Brava y una iteración anterior la dejó pública por error — un bug de seguridad real, documentado aquí en su momento. Desde la Fase 4, `/` es la landing **pública** del marketplace territorial (Parras Home Hub) y la fachada real de Casa Brava vive en `/p/casa-brava`, que sigue exigiendo sesión (es `INVITE_ONLY`). El bug original sigue igual de cerrado; solo cambió el nombre de la ruta protegida. No vuelvas a agregar `/` a una lista de rutas protegidas pensando que se corrige una regresión — haría eso exactamente: bloquear el acceso público al directorio.
- `/admin` requiere sesión **y** rol `admin`. La verificación es doble a propósito:
  1. Camino rápido: se lee el claim `role` del token.
  2. Confirmación contra la API (`GET /api/usuarios/me/`), **solo si el claim ya dice `admin`**.

  El segundo paso no es redundante. El middleware **no verifica firmas**, así que cualquiera puede fabricar un token que declare `role: "admin"`. Ese token no sirve para nada contra Django (toda petición devuelve 401), pero sin la confirmación sí alcanzaría para *entrar* a `/admin` y ver la cáscara de la página. Es *fail closed*: rol distinto de `admin`, token ilegible o API que no responde ⇒ fuera.
- `/login` y `/register` no están en ninguna lista y deben seguir siendo 100% accesibles sin sesión: son la válvula de escape que evita el bucle.

> **Nota sobre el nombre del archivo:** Next.js 16 renombró esta convención a `proxy.ts` (función exportada como `proxy`), pero sigue reconociendo `middleware.ts` vía compatibilidad hacia atrás. Si se retira ese soporte, renombrar el archivo y la función es el único cambio necesario (hay codemod oficial: `npx @next/codemod@canary middleware-to-proxy .`).

---

## Registro de huésped (`/register`)

[app/register/page.tsx](app/register/page.tsx) valida en el cliente (nombre y apellido paterno obligatorios, apellido materno opcional, correo con formato, contraseña de mínimo 8 caracteres que coincida con su confirmación) y llama a `registerAction`.

- La cuenta **siempre** se crea con rol `guest`. Crear `admin`/`holder` es exclusivo del panel de administración.
- El teléfono **sí se persiste** (`phone` en el perfil), a diferencia de iteraciones anteriores donde el campo era decorativo.
- Los mensajes de error (correo duplicado, contraseña demasiado común o corta) los redacta el backend y llegan ya en español: aquí no hay tabla de traducción.
- **No hay compensación que mantener.** En la arquitectura anterior el alta eran dos escrituras (cuenta y perfil por separado) y hacía falta revertir la primera si fallaba la segunda, para no dejar un usuario huérfano que bloqueara ese correo. Ahora la cuenta y su perfil son **la misma fila**, creada en una sola petición que pasa entera o no pasa.

---

## Panel de administración

Tres rutas bajo `/admin`, todas protegidas por el mismo guard de rol del
middleware: usuarios (`/admin`), reservaciones (`/admin/reservations`) y
catálogos (`/admin/catalogos`).

**Navegación** — [components/AdminNav.tsx](components/AdminNav.tsx) es la barra
secundaria que las enlaza entre sí, y las tres páginas la montan arriba de su
contenido. Vive aparte del `Navbar` porque solo tiene sentido dentro de
`/admin/*`, mientras que el Navbar es global. `/admin` se compara por
**igualdad** y las otras dos por prefijo: con `startsWith` la pestaña "Usuarios"
también haría match en `/admin/reservations` y se marcarían dos activas a la vez
(misma distinción exacta/prefijo que hace `middleware.ts` con `/`). Sustituyó a
la tarjeta-enlace "Ver reservaciones" que vivía en `/admin` y al `BackButton` de
`/admin/reservations`, que quedaban duplicados por las pestañas.

### CRUD de usuarios (`/admin`)

- **[app/admin/page.tsx](app/admin/page.tsx)** — Server Component `async`: pide la lista de perfiles y la sesión activa en paralelo, y se los pasa a `UsersTable` como `users`/`currentUserId`.
- **[app/admin/actions.ts](app/admin/actions.ts)** — `createUser`, `updateUser`, `deleteUser`. Las tres devuelven `{ success: true } | { error: string }` (nunca lanzan hacia el caller) y llaman a `revalidatePath("/admin")` al terminar con éxito.
- **[components/UsersTable.tsx](components/UsersTable.tsx)** — no espeja la prop `users` en estado local: la renderiza tal cual, y el refresco tras una acción llega por el `revalidatePath`. Tres modales (crear / editar / eliminar), cada uno con su propio `useTransition`; los errores se muestran con `toast.error(...)`, no con un párrafo en línea.

**Guards que ya no vive el frontend.** El backend rechaza que un admin cambie su propio rol o estado, y que borre su propia cuenta —el camino más corto para dejar el panel sin acceso—. La UI deshabilita esos controles en la propia fila del admin, pero **el límite real es la API**: la UI es una ayuda, no la protección.

> ⚠️ **Contraseña temporal fija.** `createUser` asigna `DEFAULT_TEMP_PASSWORD` (`"changeme123"`) a toda cuenta creada desde `/admin`. Es la misma para *todas* las cuentas y cualquiera con acceso al código la conoce. Aceptable solo mientras el proyecto siga siendo un sistema de acceso invitado con un puñado de usuarios de confianza, donde el admin comparte la contraseña directamente. **Antes de cualquier despliegue real** hay que reemplazarla por: (a) forzar el cambio en el primer login, (b) generar una aleatoria por usuario y comunicarla fuera de banda, o (c) un flujo de invitación por correo donde la persona elija la suya. El copy del modal ya le avisa al admin cuál es la contraseña, para que sepa qué comunicar.

### CRUD de reservaciones (`/admin/reservations`)

Ruta propia, enlazada desde `/admin` con un botón "Ver reservaciones".

- **Dos estados independientes**: `status` (`pendiente` | `confirmada` | `cancelada` | `finalizada`) describe el ciclo de vida operativo; `payment_status` (`pendiente` | `parcial` | `completado` | `reembolsado`) describe el cobro. Están separados —no uno derivado del otro— para poder representar un anticipo sobre una reserva todavía `pendiente` sin acoplar ambos ciclos. El modal los expone como dos `<select>` independientes.
- **Una sola petición trae todo**: el backend resuelve los JOIN (huésped, tarifa, spa/comida/vinos con su catálogo) y expone además `subtotal_servicios` y `gran_total` ya calculados.
- **Desglose de servicios contratados** (dentro de `EditReservationModal`): sección de solo lectura que lista cada línea con su monto. `buildServiceLines()` aplana los tres tipos de servicio a una lista de `{ key, label, amount }`. **No recalcula ningún precio contra el catálogo actual**: usa los montos guardados en cada booking, que son un *snapshot* del precio al momento de contratar. Para los totales muestra el `subtotal_servicios` y el `gran_total` **que devuelve el backend**, en vez de volver a sumarlos aquí, para que el panel y la API nunca puedan discrepar.
- **`total_amount` sí viaja desde el cliente aquí, y solo aquí.** Cuando quien crea es un admin, el backend respeta el monto manual para permitir descuentos. El modal lo sugiere con la misma fórmula que `BookingSummary` (noches × tarifa + recargo + depósito) pero lo deja editable. En el checkout de autoservicio del huésped el total **siempre** se deriva en el servidor.
- **Eliminar es un soft delete.** El `DELETE` de la API marca la reservación como borrada y libera los bloques de spa, sin borrar los bookings: un borrado físico se llevaría en cascada el historial de servicios contratados, que es justo lo que muestra el desglose. En la UI, el botón abre un modal de **doble confirmación en dos pasos**.
- **Toda la lógica de inventario vive ahora en el backend.** Liberar los bloques de spa al cancelar, volver a tomarlos al reactivar (abortando si otro huésped ya los ocupó) y revisar el solapamiento al confirmar corren dentro de la **misma transacción** que aplica el cambio. Eso cierra un hueco real de la arquitectura anterior, donde eran llamadas separadas desde el frontend y un fallo entre una y otra podía dejar el cambio aplicado con el inventario inconsistente.
- **"Casa Brava" como propiedad estática**: el sistema modela una sola casa, así que la página lo muestra como subtítulo fijo, no como columna repetida en cada fila.

### CRUD de catálogos (`/admin/catalogos`)

Cuatro catálogos que antes solo se editaban desde el admin de Django: **tipos de tarifa** (`/api/propiedades/tarifas/`), **masajistas** (`/api/proveedores/masajistas/`), **menús** (`/api/servicios/menus/`) y **vinos** (`/api/servicios/vinos/`). Viven en tres apps distintas del backend, pero comparten la misma clase de permiso (`SoloLecturaAutenticadoEscrituraAdmin`: cualquier sesión lee, solo un admin escribe), así que la página los trata como una sola familia.

- **[app/admin/catalogos/page.tsx](app/admin/catalogos/page.tsx)** — Server Component `async`: cuatro `serverFetchAll` en paralelo (colecciones paginadas de a 50; el catálogo de vinos puede pasar de ahí sin avisar) y la conversión de los decimales con `toNumber()`, para que los componentes de presentación reciban números limpios.
  - Un fallo se convierte en `null` para pintar el aviso de "backend caído", pero **solo si es un `ApiError`**: cualquier otra excepción se vuelve a lanzar, porque `serverFetchAll` señaliza con `redirect()` cuando la sesión ya no sirve y tragarse esa señal dejaría a la persona mirando un mensaje de error en vez de navegar a `/login`. `app/admin/page.tsx` y `app/admin/reservations/page.tsx` todavía usan un `.catch(() => null)` a secas; el camino es casi inalcanzable porque el middleware ya redirigió antes, pero si se tocan esas páginas conviene igualarlas a este patrón.
- **[app/admin/catalogos/actions.ts](app/admin/catalogos/actions.ts)** — doce Server Actions (crear/editar/eliminar × cuatro catálogos). Las doce difieren solo en endpoint, cuerpo y mensaje de respaldo; el resto —`revalidatePath("/admin/catalogos")`, devolver `{ success: true } | { error: string }` sin lanzar nunca— vive una sola vez en el helper interno `escribirCatalogo`.
- **[components/CatalogTable.tsx](components/CatalogTable.tsx)** — el CRUD genérico: tabla, modal de crear/editar y confirmación de borrado en **dos pasos**, igual que en reservaciones. Se describe **con datos** (`fields: CatalogField[]`) en vez de existir cuatro veces copiado. Trabaja siempre con strings (es lo que devuelve un `<input>`); cada fila trae `values` (lo que edita el formulario) y `display` (lo ya formateado para la celda, que puede ser un `ReactNode` para pintar una insignia). El modal de edición lleva `key={row.id}`: el estado del formulario se siembra en el inicializador de `useState`, así que sin esa `key` una segunda edición reutilizaría los valores de la primera.
- **[components/CatalogsView.tsx](components/CatalogsView.tsx)** — el **adaptador**: define los campos de cada catálogo, sus textos y la traducción del formulario (todo strings) al cuerpo tipado de cada Server Action. La conversión de importes con `toNumber()` se hace aquí, en el último punto antes de la petición.

**Un borrado puede fallar por diseño.** Las FK de los cuatro catálogos son `on_delete=PROTECT` desde las reservaciones y sus bookings, para que borrar una fila del catálogo no reescriba lo ya cobrado. Ese intento responde **409** con su mensaje en español y el modal se queda abierto para que el admin dé marcha atrás. La traducción de `ProtectedError` a 409 se agregó en el backend (`casabrava_core/exceptions.py`, registrado como `EXCEPTION_HANDLER`): sin ella salía como 500 con traceback HTML, y `extractErrorMessage` habría metido ese HTML entero dentro de un toast. **El límite real es la API**, no el copy del modal.

**Lo que este panel todavía no cubre**: los paquetes de vino (`/api/servicios/paquetes-vino/`, mismo patrón de permisos y de forma) y la disponibilidad de spa y de cocina. Siguen editándose desde el admin de Django.

---

## Checkout de huésped ([app/actions/checkout.ts](app/actions/checkout.ts))

Regla del dominio: **"estadía primero, servicios después"**. Una reservación es el registro maestro, y los servicios adicionales solo pueden existir colgados de una.

- **`checkoutStay({ check_in, check_out, fare_type_id })`** — la llama `ReservarForm` ("Proceder al pago"). Hace un `POST` con las fechas y la tarifa, y nada más: el huésped y el monto los resuelve el servidor (`guest` se ignora si lo manda un huésped; `total_amount` se deriva). La validación de fechas y el solapamiento corren en el backend, bajo bloqueo.
- **`checkoutCartServices(items)`** — la llama `CartView` ("Pagar servicios"):
  1. Resuelve la reservación activa con `getActiveReservation()` (ver [lib/reservations.ts](lib/reservations.ts)). Si no hay ninguna, devuelve `RESERVATION_REQUIRED_ERROR` en vez de inventar una reservación "placeholder".
  2. Recorre el carrito creando cada servicio: spa, comida o un pedido de vinos completo (cabecera + líneas en **una sola petición** — el backend no acepta crearlas por separado, justo para que no quede un pedido huérfano).
  3. **Compensación ante un fallo parcial**: si un paso falla a media lista, `compensar()` borra en orden inverso lo ya creado en ese mismo checkout. El backend hace lo correcto en cada caso —borrar una sesión de spa libera además su bloque, y un pedido de vinos se lleva sus líneas por cascada—, y un huésped puede borrar servicios mientras su estadía siga activa, que es exactamente el momento en que corre la compensación.
- **[lib/reservations.ts](lib/reservations.ts)** exporta `getActiveReservation()`: pide las reservaciones del huésped en sesión (el backend ya limita la lista a las suyas y excluye las borradas), filtra las activas (`pendiente`/`confirmada`) y toma la más reciente. No vive en `lib/api/` porque esa capa es acceso puro a la API — esto ya es una noción de dominio ("cuál es la reservación relevante"). La consumen tanto `checkoutCartServices` como las tres páginas bajo `app/servicios/*` (ver más abajo), para que ambas usen exactamente la misma reservación.
- **[lib/checkout-errors.ts](lib/checkout-errors.ts)** exporta `RESERVATION_REQUIRED_ERROR`. Vive fuera de `checkout.ts` porque un archivo `"use server"` **solo puede exportar funciones `async`** — una constante de string ahí rompe el build. Lo importan `checkout.ts`, `CartView.tsx` y las tres páginas de `app/servicios/*`, para no duplicar el mensaje como string mágico.
- **Disponibilidad en el calendario de `/reservar`**: la página pide los rangos **activos** (`pendiente` + `confirmada`, no solo confirmada) y se los pasa a `DateRangeSelector`. Es **ayuda de UX** —evita perder tiempo eligiendo fechas que el servidor va a rechazar—, no la protección contra el doble-booking, que vive en el alta bajo bloqueo. Importa que incluya las `pendiente`: `checkoutStay` crea la estadía del huésped en ese estado, así que una reserva `pendiente` ya ocupa esas fechas contra el alta de otra (ver `hay_solapamiento` en `backend/reservaciones/services.py`) — mostrar solo confirmadas dejaría el calendario libre en fechas que el servidor va a rechazar igual. El intervalo es semi-abierto `[check_in, check_out)`: el día de salida de una reserva **no** se deshabilita, porque un huésped nuevo puede entrar ese mismo día. `DateRangeSelector` construye el rango como `{ from: parseISO(check_in), to: subDays(parseISO(check_out), 1) }`, y pasa `excludeDisabled` a `<Calendar mode="range">` para que la librería reinicie la selección si el usuario intenta "saltar" por encima de un rango bloqueado.
- **Acceso a `app/servicios/*` (spa, comida, vinos)**: cada página es un Server Component `async` que, además de su catálogo/disponibilidad, resuelve `getSessionUser()` y `getActiveReservation()` en paralelo y decide qué mostrar antes de renderizar el formulario:
  - Rol `admin` ⇒ `ServiceAccessNotice` ("Los administradores no pueden reservar servicios"), nunca el formulario. Es la misma idea que el doble chequeo de `/admin` en `middleware.ts`: el rol viene de `getSessionUser()` (confirmado contra `/api/usuarios/me/`), no de un claim de JWT sin verificar.
  - Sin reservación activa ⇒ `ServiceAccessNotice` con el mensaje de `RESERVATION_REQUIRED_ERROR` y un atajo a `/reservar`.
  - Con reservación activa ⇒ se renderiza el formulario (`SpaBookingForm`/`FoodBookingForm`/`WineBookingForm`), y en spa/comida se le pasan `stayCheckIn`/`stayCheckOut` (`activeReservation.check_in`/`check_out`) como límites estrictos del calendario — mismo intervalo semi-abierto `[check_in, check_out)` que en `/reservar`. Vinos no tiene calendario, así que solo aplica el filtro de admin/estadía.
  - Como en todo el sistema, esto es **ayuda de UX**, no la protección real: el backend rechaza igual un servicio fuera de la estadía o sin ella. Sin este filtro, un huésped llenaría el formulario entero y solo se enteraría del problema al pagar el carrito.

---

## Carrito de servicios adicionales ([lib/CartContext.tsx](lib/CartContext.tsx))

El carrito es la **única** estructura de datos que vive en `localStorage`, y solo como borrador efímero pre-checkout: la escritura real ocurre en `checkoutCartServices`.

- **Namespaced por huésped**: la clave es `casabrava_cart_<id>` con sesión activa, o `casabrava_cart_anon` sin ella, así que cada usuario en el mismo navegador tiene su propio carrito. Si alguien agregó items antes de iniciar sesión, el bucket anónimo se fusiona una sola vez en el suyo y se limpia (operación idempotente).
- **Tipos del carrito** en [lib/cart-types.ts](lib/cart-types.ts): `CartItem` es una unión discriminada por `serviceType` (`"spa" | "comida" | "vinos"`). `FoodReservation.mealType` usa directamente el enum del backend (`MealType`), cuyos valores ya vienen en español y sirven como label sin traducción aparte. `WineOrder` lleva `packageId` además de `packageQuantity`/`packageUnitPrice`, para poder mandar la línea del paquete al crear el pedido.
- **`generateCartItemId(prefix)`** vive fuera de cualquier componente/hook a propósito: `Date.now()` es impura y el lint `react-hooks/purity` marca error si se llama dentro del cuerpo de un componente, incluso en un handler anidado. Cualquier helper nuevo que use `Date.now()`/`Math.random()` debe extraerse igual.
- **Los tres formularios** (`SpaBookingForm`, `FoodBookingForm`, `WineBookingForm`) solo llaman a `addToCart()`: no escriben en el backend, por eso no necesitan estado de carga. Tras agregar, muestran un `toast.success` con acción "Ver carrito" en vez de redirigir, para poder seguir agregando sin perder el progreso.
- **`SPA_SESSION_PRICE`** es una constante local de `SpaBookingForm.tsx` usada solo para mostrar el precio en el carrito. **El precio real lo fija el servidor** al crear el booking (`SPA_SESSION_PRICE` en los settings del backend): el cliente nunca lo manda. Si se cambia uno, cambiar el otro.

---

## Contenido del Home

[app/page.tsx](app/page.tsx) es un Server Component `async` que pide en paralelo las fotos del carrusel, las categorías de amenidades (con sus amenidades ya anidadas y ordenadas por el backend) y las tarjetas de servicios adicionales.

- Los tres endpoints son de **lectura pública**, por eso se usa `publicFetchAll`: manda el token si hay sesión pero no lo exige. Es contenido de marketing sin datos sensibles. Hoy `/` de todos modos exige sesión vía middleware, pero el contrato de esos endpoints no depende de esa regla, que podría cambiar.
- El orden es responsabilidad del backend (`sort_order`): preserva el recorrido curado de la casa (jardín → estacionamiento → entradas → terraza → habitaciones…) y el orden de las amenidades dentro de cada categoría. **El frontend no reordena nada.**
- El `id` de cada servicio (`"spa"` | `"comida"` | `"vinos"`) coincide con la carpeta de ruta bajo `app/servicios/`, a la que enlaza `ServiceCard`. El backend lo garantiza con una restricción, así que ese enlace nunca puede apuntar a una página inexistente.

`seed_demo` **sí carga el contenido del Home** (60 fotos del carrusel, 11 categorías con 28 amenidades y las 3 tarjetas de servicio), recuperado de `supabase/seed.sql` del historial de git. Con la base recién sembrada, el Home renderiza el carrusel y las listas con este mismo contenido curado. Para modificarlo (agregar categorías, reordenar fotos, etc.) hoy no hay UI dedicada: se edita desde el admin de Django (<http://localhost:8000/admin>) o ajustando las constantes `PROPERTY_PHOTOS`/`AMENITY_CATEGORIES`/`AMENITIES`/`ADDITIONAL_SERVICES` en [seed_demo.py](backend/propiedades/management/commands/seed_demo.py).

---

## Nota sobre lint: `react-hooks/set-state-in-effect`

El ESLint del proyecto (vía `eslint-config-next`) marca como error llamar a `setState` dentro de un `useEffect` cuando el valor viene de una lectura/computación (como `JSON.parse` de `localStorage`). La hidratación del carrito en `CartProvider` es un caso legítimo de sincronización con un sistema externo al montar (no un efecto derivado en cadena), así que ahí se usa un `eslint-disable-next-line` puntual con comentario explicando el motivo. **No copiar ese patrón sin justificarlo igual** — antes, intentar resolver el estado fuera del efecto (ej. `useState` con inicializador perezoso) cuando el componente no requiera compatibilidad con SSR.

`backend/**` está en la lista de ignorados de [eslint.config.mjs](eslint.config.mjs): el entorno virtual de Python trae JavaScript vendorizado (jQuery y select2 del admin de Django) que disparaba cientos de errores ajenos y dejaba `npm run lint` inservible.

---

## El backend en detalle

La documentación completa vive en **[backend/README.md](backend/README.md)**: estructura de las seis apps, comandos de migración, endpoints, reglas de bloqueo y decisiones de diseño. Lo indispensable para no romper nada desde el frontend:

- **Seis apps**: `usuarios` (perfiles + auth + clases de permiso), `propiedades` (configuración, tarifas y contenido del Home), `servicios` (catálogos y disponibilidad), `proveedores` (masajistas y demás externos), `reservaciones` (estadía + bookings + **toda la lógica transaccional**), `pagos` (estado y libro de cobros).
- **La autorización es responsabilidad del backend**, en dos capas que corren siempre juntas: las clases de permiso deciden *si* se puede ejecutar el método, y el filtrado de queryset decide *sobre qué filas*. El queryset es la defensa real: un huésped que pida una fila ajena recibe 404, no 403.
- **`reservaciones/services.py` es el corazón**: bloqueos, solapamientos e inventario de spa. Las vistas no replican esas reglas, y el frontend tampoco.
- **`payments` es la tabla nueva** que no existía en la arquitectura anterior, donde el cobro era una sola columna incapaz de registrar un anticipo, un segundo cargo o un reembolso parcial. La reservación conserva su `payment_status` como **estado agregado**, y ese estado se **deriva** de los movimientos, nunca se escribe suelto. El tipo `Payment` ya está declarado en [lib/api/types.ts](lib/api/types.ts), pero **el frontend todavía no consume `/api/pagos/`**: el panel sigue mostrando y editando el estado agregado de la reservación. Construir la vista del libro de movimientos es trabajo pendiente, no algo que esta migración haya dejado a medias.

---

## Integración futura planeada (NO implementar sin instrucción explícita)

- **Stripe**: procesamiento real de pagos, reemplazando la redirección directa a `/pago-exitoso` por un Checkout o Payment Intent real. El punto de enganche ya existe en el backend: `pagos.services.registrar_pago` asienta el movimiento y deriva el estado de la reservación. Falta que el webhook lo llame con la referencia del pago confirmado. Probablemente convenga combinar ambos checkouts (estadía + servicios) en un solo cobro.
- **Vista de pagos en el panel**: consumir `/api/pagos/` para mostrar y registrar movimientos (anticipos, saldos, reembolsos), en vez de editar a mano el estado agregado.
- **Administración de disponibilidad**: no hay UI para dar de alta bloques de spa ni días de cocina; hoy se cargan con `seed_demo` o desde el admin de Django.

---

## Qué NO hacer

- **No reintroducir una capa de datos en el frontend para lo que el backend ya modela.** Nada de clientes de base de datos, ORM, ni esquemas versionados en este proyecto. El frontend habla HTTP con Django y nada más; la persistencia de reservaciones, catálogos y contenido de Casa Brava es responsabilidad exclusiva del backend.
  > La única excepción deliberada es [lib/mock/marketplace-data.ts](lib/mock/marketplace-data.ts) (ver "Arquitectura multi-tenant"): existe precisamente porque el backend **todavía no modela** un marketplace multi-propiedad, y desbloquea el diseño de ese producto sin esperar a que exista. No es un precedente para hardcodear contenido que el backend **sí** modela (precios, amenidades, textos de servicios de Casa Brava siguen viniendo de Django) — y el día que el backend soporte multi-tenant, ese archivo se reemplaza por el fetch real, no crece.
- **No reimplementar reglas de negocio del backend** (validación de fechas, solapamiento, cálculo de montos, control de inventario) "para dar feedback más rápido". Está bien deshabilitar fechas en un calendario como ayuda de UX, pero esa verificación **no sustituye** a la del servidor y no debe presentarse como si lo hiciera.
- **No operar aritméticamente sobre los campos decimales sin `toNumber()`** — llegan como string (ver "Capa de acceso a la API").
- **No leer solo la primera página de una colección**: usar `serverFetchAll`/`fetchAllPages`.
- **No llamar a la API desde un Client Component.** El token es httpOnly y no está disponible en el navegador; todo acceso pasa por un Server Component o una Server Action.
- **No confiar en el claim `role` del JWT para autorizar.** Sirve para decisiones de UI y para el camino rápido del middleware; la autorización real la resuelve el backend en cada petición.
- **No introducir librerías de UI pesadas** (component libraries completas con estilos monolíticos) salvo que se solicite. **Sí están permitidas** por ser *headless* (sin estilos propios, se skinean 100% con Tailwind), de código abierto y costo $0: **`shadcn/ui`** (basada en Radix UI), **`react-day-picker`**, **`sonner`** y **`lucide-react`**. Esta lista es exhaustiva, no un precedente abierto.

---

## Regla permanente: mantenimiento de documentación

Cada cambio estructural, componente clave nuevo o modificación en el flujo de datos debe venir acompañado —en el mismo turno, sin que el usuario lo pida de nuevo— de la actualización correspondiente en:

- **Este archivo (`CLAUDE.md`)**: cuando cambie el stack, las convenciones, las reglas de diseño, la capa de API o el modelo de autenticación/roles.
- **[DOCUMENTATION.md](DOCUMENTATION.md)**: cuando cambie la estructura de carpetas, se agregue una ruta o componente que el equipo necesite editar, o cambie de dónde sale el contenido de una pantalla.
- **[backend/README.md](backend/README.md)**: cuando cambie el esquema, un endpoint o una regla transaccional del backend.

No se considera terminada una tarea de código si estos archivos quedaron desactualizados respecto al estado real del repositorio.
