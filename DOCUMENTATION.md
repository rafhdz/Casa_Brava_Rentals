# Guía del proyecto — Casa Brava Rentals

Guía práctica para el equipo: dónde vive cada cosa y qué archivo tocar para cambiarla. Para las convenciones técnicas y el porqué de cada decisión, ver [CLAUDE.md](CLAUDE.md). Para el detalle del backend, ver [backend/README.md](backend/README.md).

---

## 1. Qué es esto

Casa Brava Rentals es el sistema de reservaciones de una casa privada de renta, de acceso exclusivo por invitación. Un huésped invitado inicia sesión, reserva su estadía, agrega servicios adicionales (spa, comida, vinos) y paga; un administrador gestiona usuarios, reservaciones y catálogos desde su propio panel.

Desde la Fase 4, ese sistema vive bajo `/p/casa-brava` dentro de un directorio público más grande, **Parras Home Hub**, que sirve la landing en `/` y un puñado de propiedades ficticias sin backend propio (ver §3.1 y "Arquitectura multi-tenant" en [CLAUDE.md](CLAUDE.md)).

El proyecto son **dos aplicaciones separadas** que se comunican por HTTP:

```
┌──────────────────────────┐         ┌──────────────────────────┐
│  Frontend                │  HTTP   │  Backend                 │
│  Next.js 16 + React 19   │ ──────► │  Django 6.1 + DRF        │
│  Tailwind CSS v4         │  JWT    │  PostgreSQL              │
│  localhost:3000          │ ◄────── │  localhost:8000          │
│  (raíz del repositorio)  │  JSON   │  (carpeta backend/)      │
└──────────────────────────┘         └──────────────────────────┘
```

El frontend **no tiene base de datos propia**. Toda la información sale de la API del backend. Lo único que se guarda en el navegador es el carrito de servicios antes de pagarlo.

Lo único todavía simulado es el **cobro**: el botón de pago lleva a una pantalla de éxito sin procesar dinero real.

---

## 2. Cómo correrlo localmente

Hacen falta **dos terminales**, una por aplicación. El frontend solo no sirve de mucho: sin el backend, las pantallas con datos fallan.

### Antes de empezar

- **Node.js 20+** y npm.
- **Python 3.12+** y [`uv`](https://docs.astral.sh/uv/).
- **PostgreSQL** (recomendado). Con SQLite el proyecto arranca, pero se pierde la protección contra reservas duplicadas — ver `backend/README.md` §3.

### Terminal 1 — Backend

```bash
cd backend
uv sync
cp .env.example .env
uv run python manage.py migrate
uv run python manage.py seed_demo
uv run python manage.py runserver
```

| Comando | Para qué |
| --- | --- |
| `uv sync` | Instala las dependencias de Python |
| `cp .env.example .env` | Crea la configuración local (ajustar credenciales de la base ahí) |
| `migrate` | Crea las tablas |
| `seed_demo` | Carga datos de desarrollo y el contenido del Home (fotos, amenidades, tarjetas de servicio). Se puede repetir sin duplicar |
| `runserver` | Levanta la API en el puerto 8000 |

Queda disponible:

- API — <http://localhost:8000>
- Documentación interactiva de la API — <http://localhost:8000/api/docs>
- Admin de Django — <http://localhost:8000/admin> (requiere `uv run python manage.py createsuperuser`)

### Terminal 2 — Frontend

```bash
npm install
npm run dev
```

Abrir <http://localhost:3000>.

### Que las dos se vean entre sí

- **Frontend** — archivo `.env.local` en la raíz:
  ```
  API_URL=http://localhost:8000
  ```
  Si falta, se asume ese mismo valor.
- **Backend** — en `backend/.env`, `CORS_ALLOWED_ORIGINS` debe incluir `http://localhost:3000`.

### Usuarios para probar

`seed_demo` crea tres cuentas. Todas usan la contraseña **`changeme123`** (solo desarrollo):

| Correo | Rol | Qué ve |
| --- | --- | --- |
| `admin@test.com` | Administrador | Panel de Control PHH (`/admin`) y panel de gestión de Casa Brava (`/p/casa-brava/owner-panel`) |
| `carlos.ruiz@example.com` | Propietario | Experiencia de huésped |
| `maria.gomez@example.com` | Huésped | Experiencia de huésped |

### Otros comandos

| Comando | Qué hace |
| --- | --- |
| `npm run build` | Compila el frontend y verifica tipos |
| `npm run lint` | Revisa el estilo del código del frontend |
| `cd backend && uv run python manage.py test` | Corre las pruebas del backend |

---

## 3. Estructura de carpetas

```
Casa_Brava_Rentals/
├── app/                          Rutas del frontend (App Router)
│   ├── layout.tsx                Layout raíz: Navbar, Footer, sesión y carrito
│   ├── page.tsx                  Landing editorial de Parras Home Hub (hero, directorio, comisiones, experiencias, reputación)
│   ├── globals.css               Estilos base y tokens de Tailwind
│   ├── sobre-nosotros/page.tsx   Misión de Parras Home Hub
│   ├── conoce-parras/page.tsx    Guía del destino (enoturismo, clima, patrimonio)
│   ├── login/page.tsx            Inicio de sesión
│   ├── register/page.tsx         Alta de huésped
│   ├── perfil/page.tsx           Datos de la sesión y cerrar sesión
│   ├── carrito/page.tsx          Carrito de servicios adicionales (solo Casa Brava)
│   ├── pago-exitoso/page.tsx     Confirmación (pago simulado, cualquier propiedad)
│   ├── p/[slug]/                 Una propiedad del marketplace (ver §3.1)
│   │   ├── page.tsx              Fachada — real para "casa-brava", mock para el resto
│   │   ├── reservar/page.tsx     Selector de fechas + resumen de cobro
│   │   ├── servicios/
│   │   │   ├── spa/page.tsx      Reservar SPA (solo real en casa-brava)
│   │   │   ├── comida/page.tsx   Reservar comida (solo real en casa-brava)
│   │   │   └── vinos/page.tsx    Pedido de vinos (solo real en casa-brava)
│   │   └── checkout/page.tsx     Liquidación unificada (mock/revisión, ver CLAUDE.md)
│   ├── p/casa-brava/owner-panel/ Panel de gestión de Casa Brava (carpeta estática, coexiste con p/[slug])
│   │   ├── page.tsx              Panel: usuarios invitados
│   │   ├── actions.ts            Crear/editar/eliminar usuarios
│   │   ├── reservations/
│   │   │   ├── page.tsx          Panel: reservaciones
│   │   │   └── actions.ts        CRUD de reservaciones
│   │   └── catalogos/
│   │       ├── page.tsx          Panel: tarifas, masajistas, menús y vinos
│   │       └── actions.ts        CRUD de los cuatro catálogos
│   ├── supplier/                 Portal de anfitrión (sin escritura real)
│   │   ├── layout.tsx            Monta SupplierNav
│   │   └── page.tsx              "Mis propiedades": canal en vivo de Casa Brava, simulador de tarifas, métricas
│   ├── admin/
│   │   └── page.tsx              Panel de Control PHH: KPIs de plataforma (GMV, take-rate, ocupación, cohortes) + usuarios
│   └── actions/
│       ├── auth.ts               Iniciar sesión, registrarse, cerrar sesión
│       └── checkout.ts           Pagar la estadía y los servicios (Casa Brava)
│
├── components/                   Componentes reutilizables (ver §4)
│
├── lib/
│   ├── api/                      ⭐ Toda la comunicación con el backend
│   │   ├── config.ts             URL de la API y nombres de cookies
│   │   ├── types.ts              Tipos de todo lo que devuelve la API
│   │   ├── client.ts             Petición HTTP, errores y paginación
│   │   ├── jwt.ts                Lectura de los datos del token
│   │   ├── session.ts            Cookies de sesión
│   │   └── server.ts             Punto de entrada desde el servidor
│   ├── types/
│   │   └── marketplace.ts        Tipos del marketplace mock: Property, AccessGrant,
│   │                             y el vínculo cuenta ↔ propiedad del panel PHH
│   ├── mock/
│   │   └── marketplace-data.ts   Directorio de propiedades mock, colecciones curadas + TENANT_ZERO_SLUG
│   ├── AuthContext.tsx           Sesión disponible para los componentes
│   ├── CartContext.tsx           Carrito (navegador)
│   ├── cart-types.ts             Tipos del carrito
│   ├── checkout-errors.ts        Mensaje compartido servidor/cliente
│   ├── reservations.ts           Reservación activa más reciente del huésped
│   ├── owner-panel.ts            Rutas del panel de gestión de una propiedad (ownerPanelRoutes)
│   ├── user-properties.ts        Qué propiedades le tocan a cada cuenta (/admin)
│   ├── platform-metrics.ts       KPIs de /admin calculados sobre datos reales (funciones puras)
│   ├── revenue-simulator.ts      Motor del simulador de Revenue Management de /supplier
│   ├── commission-rates.ts       Comisión PHH (10 %) y referencia Airbnb (16 %)
│   └── format.ts                 Formato de fechas, horas y dinero (centavos: toCents / toDecimalString)
│
├── middleware.ts                 Protección de rutas y refresco de sesión
├── public/                       Imágenes e íconos
│   ├── images/                   Fotos de la casa y de los servicios
│   └── icons/                    Íconos de amenidades y del sistema
│
└── backend/                      Aplicación Django (ver backend/README.md)
    ├── casabrava_core/           Configuración, rutas y errores de la API
    ├── usuarios/                 Perfiles y autenticación
    ├── propiedades/              Configuración, tarifas y contenido del Home
    ├── servicios/                Catálogos y disponibilidad
    ├── proveedores/              Masajistas
    ├── reservaciones/            Estadías, servicios contratados y reglas
    └── pagos/                    Movimientos de cobro
```

### 3.1 `app/p/[slug]/` — una propiedad del marketplace

Cada página bajo esta ruta dinámica bifurca según el slug:

- `casa-brava` → contenido real, conectado al backend Django (fue movido tal
  cual desde las antiguas `app/page.tsx`, `app/reservar/`, `app/servicios/`).
- Cualquier otro slug (propiedades ficticias de `lib/mock/marketplace-data.ts`)
  → contenido mock, sin llamadas al backend.

`app/p/casa-brava/owner-panel/` es una carpeta **estática** (no `[slug]`)
que vive al mismo nivel que `[slug]/` dentro de `app/p/`. Next.js permite que
un segmento estático y uno dinámico coexistan en el mismo nivel: el estático
gana en el match exacto, así que `/p/casa-brava/owner-panel/**` siempre
resuelve ahí y nunca a `p/[slug]/owner-panel` (que no existe). El resto de
`/p/casa-brava/**` (fachada, `reservar`, `servicios/*`, `checkout`) sigue
resolviendo en `p/[slug]/` con `slug === "casa-brava"`, sin cambios.

Ver "Arquitectura multi-tenant (Fase 4 — Parras Home Hub)" en
[CLAUDE.md](CLAUDE.md) para el porqué completo de esta bifurcación y las
reglas que la mantienen segura (frontera entre `lib/mock/` y `lib/api/`,
despachador de Navbar/Footer, guards de `middleware.ts` por `accessType`).

---

## 4. Dónde editar los componentes visuales

| Quiero cambiar… | Archivo |
| --- | --- |
| Cuál Navbar/Footer se muestra en qué ruta (marketplace vs. Casa Brava) | [components/Navbar.tsx](components/Navbar.tsx), [components/Footer.tsx](components/Footer.tsx) — son despachadores por `usePathname()`, ver "Arquitectura multi-tenant" en [CLAUDE.md](CLAUDE.md) |
| Qué logo (`PHH_logo.svg` / `CBR_logo.svg`) se muestra en qué ruta | [components/TenantNavbar.tsx](components/TenantNavbar.tsx) (decide por pathname), [components/MarketplaceNavbar.tsx](components/MarketplaceNavbar.tsx) (siempre PHH) — regla completa en [CLAUDE.md](CLAUDE.md), "Gestión de logos e identidad visual" |
| Barra superior de Casa Brava (logo, carrito, perfil, logout) | [components/TenantNavbar.tsx](components/TenantNavbar.tsx) |
| Pie de página de Casa Brava | [components/TenantFooter.tsx](components/TenantFooter.tsx) |
| Barra superior del marketplace (PHH) | [components/MarketplaceNavbar.tsx](components/MarketplaceNavbar.tsx) |
| El botón de cuenta ("Mi cuenta" en PHH, el ícono de usuario en Casa Brava) | [components/MarketplaceNavbar.tsx](components/MarketplaceNavbar.tsx), [components/TenantNavbar.tsx](components/TenantNavbar.tsx) — los dos llevan a `/perfil`, nunca a la fachada de una propiedad |
| Pie de página del marketplace (PHH) | [components/MarketplaceFooter.tsx](components/MarketplaceFooter.tsx) |
| Directorio de propiedades, su filtro por huéspedes y las pestañas de colecciones curadas | [components/PropertyDirectory.tsx](components/PropertyDirectory.tsx) |
| Barra de búsqueda flotante (fechas con fin de semana resaltado, huéspedes, canje de invitación en vivo) | [components/MarketplaceSearchBar.tsx](components/MarketplaceSearchBar.tsx) |
| Tarjeta de una propiedad (carrusel en hover, badges, calificación, amenidades) | [components/PropertyCard.tsx](components/PropertyCard.tsx) |
| Comparativa interactiva de comisiones (PHH vs. Airbnb) de la landing | [components/CommissionComparison.tsx](components/CommissionComparison.tsx) |
| **Agregar/editar/quitar una propiedad o una colección curada del directorio mock** | [lib/mock/marketplace-data.ts](lib/mock/marketplace-data.ts) — arrays `PROPERTIES`/`COLLECTIONS` |
| Formulario de reservación mock (propiedades sin backend) | [components/MockReservarForm.tsx](components/MockReservarForm.tsx) |
| Pestañas del portal de anfitrión | [components/SupplierNav.tsx](components/SupplierNav.tsx) |
| Tabla "Mis propiedades" del portal de anfitrión (canal de Casa Brava, botón al panel, "Simular tarifas") | [components/SupplierPropertiesTable.tsx](components/SupplierPropertiesTable.tsx) |
| Simulador de Revenue Management (drawer: escenario, proyección anual, ahorro vs. Airbnb) | [components/RevenueSimulatorDrawer.tsx](components/RevenueSimulatorDrawer.tsx) |
| Multiplicadores, calendario de temporadas y supuestos del simulador | [lib/revenue-simulator.ts](lib/revenue-simulator.ts) |
| Tarjeta de métrica (KPI) compartida por `/admin`, `/supplier` y el simulador | [components/KpiCard.tsx](components/KpiCard.tsx) |
| Carrusel de fotos (zoom, auto-avance, flechas) | [components/Carousel.tsx](components/Carousel.tsx) |
| Lista de amenidades | [components/AmenitiesList.tsx](components/AmenitiesList.tsx) |
| Tarjetas de servicios de la fachada de Casa Brava | [components/ServiceCard.tsx](components/ServiceCard.tsx) |
| Calendario (estilos de celdas) | [components/Calendar.tsx](components/Calendar.tsx) |
| Selección de fechas de la estadía | [components/DateRangeSelector.tsx](components/DateRangeSelector.tsx) |
| Opciones de tarifa | [components/PricingOptions.tsx](components/PricingOptions.tsx) |
| Resumen de cobro de la estadía | [components/BookingSummary.tsx](components/BookingSummary.tsx) |
| Formulario de la estadía completo (Casa Brava, real) | [components/ReservarForm.tsx](components/ReservarForm.tsx) |
| Formularios de spa / comida / vinos | `components/SpaBookingForm.tsx`, `FoodBookingForm.tsx`, `WineBookingForm.tsx` |
| Aviso de "sin acceso" en `/p/[slug]/servicios/*` (admin, sin estadía activa, o propiedad sin ese servicio) | [components/ServiceAccessNotice.tsx](components/ServiceAccessNotice.tsx) |
| Carrito y sus renglones | [components/CartView.tsx](components/CartView.tsx), [components/CartItemRow.tsx](components/CartItemRow.tsx) |
| Tabla de usuarios del owner-panel de Casa Brava | [components/UsersTable.tsx](components/UsersTable.tsx) |
| Tabla de reservaciones del owner-panel de Casa Brava | [components/ReservationsTable.tsx](components/ReservationsTable.tsx) |
| Pestañas del owner-panel de Casa Brava (Usuarios / Reservaciones / Catálogos) | [components/OwnerNav.tsx](components/OwnerNav.tsx) |
| Qué campos y textos tiene cada catálogo del owner-panel | [components/CatalogsView.tsx](components/CatalogsView.tsx) |
| Tabla y modales genéricos de un catálogo | [components/CatalogTable.tsx](components/CatalogTable.tsx) |
| KPIs, tabla y filtros (Rol, Estado, Vínculo, Propiedad) del Panel de Control PHH (`/admin`) | [components/GlobalUsersPanel.tsx](components/GlobalUsersPanel.tsx) |
| Cómo se calculan GMV, take-rate, ocupación y cohortes de `/admin` | [lib/platform-metrics.ts](lib/platform-metrics.ts) |
| Cómo se decide qué propiedad se le atribuye a cada usuario en `/admin` | [lib/user-properties.ts](lib/user-properties.ts) |
| Porcentaje de comisión de PHH / referencia de Airbnb | [lib/commission-rates.ts](lib/commission-rates.ts) |
| Las rutas del panel de gestión de una propiedad (`/p/<slug>/owner-panel/*`) | [lib/owner-panel.ts](lib/owner-panel.ts) |
| Copy e identidad de `/login` y `/register` (marca PHH, "¿Olvidaste tu contraseña?") | [app/login/page.tsx](app/login/page.tsx), [app/register/page.tsx](app/register/page.tsx) |
| Botón "Volver" | [components/BackButton.tsx](components/BackButton.tsx) |

**Estilo general:** todo es Tailwind CSS v4 escrito directamente en las clases. No hay archivo `tailwind.config.js`; los tokens se definen con `@theme` en [app/globals.css](app/globals.css). La paleta es escala de grises (`neutral-*`) con negro para los botones principales, y el diseño se escribe **mobile-first**.

---

## 5. Dónde editar el contenido (todo vive en el backend)

Ningún texto, precio ni imagen de negocio está escrito en el código del frontend: todo sale de la base de datos. Cuatro catálogos ya se editan desde el propio panel; el resto todavía se edita en el **admin de Django** (<http://localhost:8000/admin>) o directamente en la base.

| Contenido | Dónde se edita | Dónde se ve |
| --- | --- | --- |
| **Tipos de tarifa y su recargo** | **`/p/casa-brava/owner-panel/catalogos` → Tipos de tarifa** | `/p/casa-brava/reservar` y panel |
| **Masajistas** | **`/p/casa-brava/owner-panel/catalogos` → Masajistas** | `/p/casa-brava/servicios/spa` |
| **Menús y precio por persona** | **`/p/casa-brava/owner-panel/catalogos` → Menús** | `/p/casa-brava/servicios/comida` |
| **Vinos (precio y existencias)** | **`/p/casa-brava/owner-panel/catalogos` → Vinos** | `/p/casa-brava/servicios/vinos` |
| Fotos del carrusel | Django: Fotos de la propiedad | `/p/casa-brava` |
| Amenidades y sus categorías | Django: Amenidades / Categorías de amenidades | `/p/casa-brava` |
| Tarjetas de servicios adicionales | Django: Información de servicios adicionales | `/p/casa-brava` |
| Tarifa por noche y depósito | Django: Configuración de la propiedad | `/p/casa-brava/reservar` y panel |
| Días y horarios de spa | Django: Disponibilidad de spa | `/p/casa-brava/servicios/spa` |
| Días con servicio de cocina | Django: Disponibilidad de comida | `/p/casa-brava/servicios/comida` |
| Paquetes de vinos | Django: Paquetes de vinos | `/p/casa-brava/servicios/vinos` |
| **Propiedades del directorio** (nombre, precio, capacidad, acceso) | [lib/mock/marketplace-data.ts](lib/mock/marketplace-data.ts) — array `PROPERTIES` (mock, no Django) | `/` y `/supplier` |

`seed_demo` **sí carga el contenido de la fachada de Casa Brava** (60 fotos, 11 categorías con 28 amenidades y las 3 tarjetas de servicio), así que una base recién sembrada renderiza el carrusel y las listas en `/p/casa-brava` con este contenido curado.

**Imágenes:** los archivos viven en `public/images/` y `public/icons/`. En la base solo se guarda la ruta (por ejemplo `/images/jardin_1.jpeg`). Para agregar una foto: copiar el archivo a `public/images/` y crear el registro con esa ruta.

---

## 6. Cómo funcionan las sesiones y los permisos

### Inicio de sesión

`/login` y `/register` son la puerta de entrada de **todo Parras Home Hub**, no
de una propiedad: la cuenta es del marketplace y sirve tanto para las
propiedades abiertas del directorio como para las estancias por invitación
(Casa Brava es una de estas últimas). Por eso ambas pantallas muestran la marca
PHH y su copy habla de Parras Home Hub. Lo que no cambió es a dónde se aterriza
después de entrar: un administrador va a `/admin` y cualquier otra persona a
`/p/casa-brava`.

**"¿Olvidaste tu contraseña?"** — está en `/login`, debajo del campo de
contraseña. Todavía **no hay recuperación por correo** (el backend no tiene ese
endpoint), así que el enlace abre un aviso explicando la vía real: contactar al
soporte de la plataforma o pedirle la reactivación al anfitrión. Es un aviso a
propósito y no un formulario: pedir un correo y no mandar nada sería peor que
no tener la función.

1. La persona envía correo y contraseña en `/login`.
2. El frontend se los pasa al backend, que responde con un **token JWT**.
3. El token se guarda en **cookies de tipo httpOnly**: el JavaScript de la página no puede leerlas, solo el servidor. Por eso el token no se puede robar con un script inyectado.
4. En cada petición al backend, el servidor de Next.js adjunta el token en el encabezado `Authorization: Bearer <token>`.

El token caduca (60 minutos por defecto). Cuando eso pasa, [middleware.ts](middleware.ts) lo renueva solo, usando el token de refresco, sin que la persona note nada.

**Dónde se ve y se cierra la sesión**: siempre en `/perfil`. Es a donde llevan
tanto "Mi cuenta" del marketplace como el ícono de usuario de Casa Brava —
antes el primero llevaba a la fachada de Casa Brava, que dejaba a un visitante
de PHH en una propiedad por invitación y sin ninguna forma visible de cerrar
sesión.

### Rutas protegidas

[middleware.ts](middleware.ts) revisa la sesión **antes** de que la página se dibuje:

| Ruta | Requisito |
| --- | --- |
| `/` (landing de Parras Home Hub) | **Pública** — sin sesión |
| `/p/<slug>/**` (fachada, reservar, servicios, checkout de una propiedad) | Sesión activa solo si esa propiedad es de acceso por invitación (hoy, solo `casa-brava`) |
| `/p/casa-brava/owner-panel/**` (panel de gestión de Casa Brava) | Sesión activa **y** rol `holder` o `admin` |
| `/perfil`, `/carrito` | Sesión activa |
| `/admin` (Panel de Control de todo PHH) | Sesión activa **y** rol de administrador |
| `/login`, `/register` | Abiertas — son la puerta de entrada |
| `/sobre-nosotros`, `/conoce-parras`, `/supplier` | Públicas |

Sin sesión, cualquier ruta protegida redirige a `/login`. Con sesión pero sin rol de administrador, `/admin` redirige a `/`. Con sesión pero sin rol `holder`/`admin`, `/p/casa-brava/owner-panel/**` redirige a `/p/casa-brava` (la fachada de la propiedad, no a `/`, porque ya sabemos que esa sesión tiene invitación válida a Casa Brava).

### Roles

| Rol | Qué puede hacer |
| --- | --- |
| **Administrador** (`admin`) | Todo: el Panel de Control de PHH (`/admin`) **y** el panel de gestión de Casa Brava (`/p/casa-brava/owner-panel`) |
| **Propietario** (`holder`) | Ve la experiencia de huésped y además entra al panel de gestión de Casa Brava; en la API puede consultar todos los registros, pero no modificarlos. Sus estancias nacen **exentas de cobro** (pago "No aplica") |
| **Huésped** (`guest`) | Reserva y consulta lo suyo |

Quien se registra por su cuenta en `/register` siempre queda como **huésped**. Crear administradores o propietarios solo se puede desde el panel de gestión de Casa Brava (`/p/casa-brava/owner-panel`) — el Panel de Control de PHH (`/admin`) solo lista y filtra, no crea ni edita.

Un propietario (`holder`) siempre se crea con la cuenta **activa**: el backend lo fuerza al dar de alta el usuario, sin importar el rol con el que se cree la petición, para que un propietario nunca quede bloqueado fuera de su propio panel.

Cuando un propietario reserva su propia estadía en Casa Brava —o un admin la da de alta por él desde el panel—, el cobro nace **exento (`na`, "No aplica")** en vez de `pendiente`: un propietario no le paga renta a su propia propiedad. Ver "Reservaciones" más abajo.

> Los permisos los decide **el backend** en cada petición. Lo que el frontend hace —ocultar botones, deshabilitar campos— es comodidad visual, no seguridad.

---

## 7. Los flujos principales, paso a paso

### Reservar la estadía (`/p/casa-brava/reservar`)

1. La página pide al backend las tarifas, la configuración de cobro y las fechas ya ocupadas.
2. La persona elige fechas en el calendario (los rangos ocupados aparecen deshabilitados) y un tipo de tarifa.
3. El resumen muestra: noches × tarifa + recargo + depósito.
4. Al pulsar "Proceder al pago" se crea la reservación en el backend, que **recalcula el monto por su cuenta** y verifica que las fechas no choquen con otra reserva **activa** (pendiente o confirmada) — la reservación nueva nace en `pendiente`, así que ya cuenta como ocupación del calendario para todos los demás.
5. Si todo sale bien, va a `/pago-exitoso`. Si las fechas ya estaban tomadas, aparece un aviso y no se crea nada.

> Cualquier otra propiedad del directorio (`/p/<slug>/reservar` con un slug distinto de `casa-brava`) usa un formulario mock que no toca el backend: calcula el mismo resumen con datos de `lib/mock/marketplace-data.ts` y manda a `/p/<slug>/checkout`, donde "Confirmar pago (simulado)" solo redirige a `/pago-exitoso` sin crear nada real.

### Agregar servicios y pagarlos (`/p/casa-brava/servicios/*` → `/carrito`)

1. Cada página de servicio (`/p/casa-brava/servicios/spa`, `/servicios/comida`, `/servicios/vinos`) primero revisa quién entra:
   - Si es **administrador**, no ve el formulario: aparece un aviso de que esa vista es solo para huéspedes.
   - Si es huésped **sin una estadía activa** (pendiente o confirmada), tampoco ve el formulario: aparece el mismo aviso "Primero debes reservar tu estadía…" con un atajo a `/p/casa-brava/reservar`, antes de que la persona pierda tiempo llenando nada.
   - Solo si hay una estadía activa se muestra el formulario.
2. En spa y comida, el calendario **solo habilita los días de esa estadía** (entre `check_in` y `check_out`, sin contar el día de salida) — no todos los días con disponibilidad general. Vinos no tiene calendario, así que solo aplica el filtro de admin/estadía.
3. Al elegir lo que se quiere y pulsar "Agregar al carrito", eso **solo guarda en el navegador**; todavía no se reserva nada.
4. El carrito es propio de cada usuario: dos personas en la misma computadora no se mezclan.
5. En `/carrito`, "Pagar servicios" envía todo al backend y lo asocia a la reservación activa más reciente de esa persona — la misma noción de "estadía activa" que ya filtró el calendario en el paso 1, así que lo que se ve ya reservable en el formulario es justo lo que el pago va a aceptar.
6. Si algo falla a medio camino (por ejemplo, otro huésped tomó ese horario de spa un segundo antes), lo que ya se había creado en ese intento se deshace y el carrito se conserva para poder corregirlo.

> Igual que en el resto del sistema, esto es ayuda de UX: el backend ya rechaza un servicio fuera de la estadía o sin ella (`RESERVATION_REQUIRED_ERROR`), y esta capa solo evita que la persona llegue a ese error después de llenar un formulario entero.

### Panel de gestión de Casa Brava (`/p/casa-brava/owner-panel`)

Tres pestañas — Usuarios, Reservaciones, Catálogos —, accesibles solo con rol
`holder` o `admin`. Es el panel que hasta la Fase 4 vivía en `/admin`; se
movió para dejar `/admin` libre como panel universal de PHH (ver más abajo).

**Cómo se llega**: desde el portal de anfitrión (`/supplier`), con el botón
**"Panel de gestión"** de la fila de Casa Brava — antes había que escribir la
URL a mano. Las otras propiedades del directorio muestran ese mismo botón
deshabilitado con el aviso "Próximamente disponible": son propiedades de
demostración, sin backend ni panel propio. El botón es solo un atajo de
navegación: quien lo pulse sin rol de propietario o administrador termina igual
en `/login` o de vuelta en la fachada de la propiedad, porque el guard de la
ruta no cambia.

**Sigue siendo el panel de una sola propiedad, pero ya no la lleva escrita
dentro.** Cada página declara el slug de su propiedad una sola vez (hoy,
siempre Casa Brava) y de ahí salen sus pestañas y sus encabezados; las rutas
del panel se arman en [lib/owner-panel.ts](lib/owner-panel.ts). Para tener un
panel por propiedad falta lo que el backend todavía no da: endpoints de
usuarios, tarifas y catálogos filtrados por propiedad, y una forma de saber
quién es el dueño de cuál. Ver "Preparado para un panel por propiedad" en
[CLAUDE.md](CLAUDE.md).

#### Usuarios (`/p/casa-brava/owner-panel`)

- Lista las cuentas con su rol y estado.
- **Crear usuario**: la cuenta queda activa de inmediato con la contraseña temporal `changeme123`, que el administrador comparte con la persona.
- **Editar**: cambia rol y estado.
- **Eliminar**: pide confirmación.
- Un administrador **no puede** cambiar su propio rol ni borrarse a sí mismo: sería la forma más rápida de dejar el panel sin acceso.

#### Reservaciones (`/p/casa-brava/owner-panel/reservations`)

- Tabla con huésped, fechas, tarifa, servicios contratados (íconos), monto y los dos estados.
- **Dos estados independientes**: el de la reserva (`Pendiente`, `Confirmada`, `Cancelada`, `Finalizada`) y el del cobro (`Pendiente`, `Parcial`, `Completado`, `Reembolsado`, **`No aplica (exento)`**). Se cambian por separado, para poder registrar un anticipo sobre una reserva todavía pendiente.
- **`No aplica (exento)`** es el estado de cobro de un propietario (`holder`): no paga la renta de su propia propiedad. El backend lo asigna solo cuando nadie especifica un `payment_status` a mano — un admin puede seguir eligiendo cualquier otro estado para esa misma reservación si de verdad quiere cobrarle algo.
- **Solo para propietarios**: en el modal de creación, la opción "No aplica" solo aparece si el huésped elegido es Propietario, y se sugiere sola al elegirlo (cambiar de huésped vuelve a la sugerencia del nuevo). El backend rechaza "No aplica" para cualquier otra persona, así que ninguna reserva de un huésped normal puede quedar fuera del GMV.
- **Solo reservaciones de Casa Brava**: aunque el backend ya conoce otras propiedades, esta tabla pide y muestra únicamente las de esta casa.
- **Editar** abre el desglose de lo contratado (cada masaje, comida y vino con su importe) más estadía, subtotal de servicios y gran total.
- **Crear** sugiere el monto a partir de fechas y tarifa, pero lo deja editable por si hay un descuento. Si el huésped elegido tiene rol `holder`, el campo "Pago" se sugiere en `No aplica (exento)` en vez de `Pendiente` — también editable (esa opción solo existe para propietarios).
- **Eliminar** pide doble confirmación. No borra de verdad: marca la reserva como eliminada y libera los horarios de spa, conservando el historial de lo contratado.
- Confirmar una reserva vuelve a verificar que no choque con otra; si choca, se avisa y no se guarda.

#### Catálogos (`/p/casa-brava/owner-panel/catalogos`)

Lo que se ofrece en Casa Brava, en cuatro pestañas: **tipos de tarifa**, **masajistas**, **menús** y **vinos**. Antes solo se podía editar desde el admin de Django.

- Cada pestaña es la misma tabla con sus propias columnas: crear, editar y eliminar, con confirmación de dos pasos para el borrado.
- **Un borrado puede rebotar, y está bien que rebote.** Si una reservación ya usa esa tarifa, ese menú, ese vino o esa masajista, el servidor no deja borrarlo: hacerlo reescribiría lo que ya se cobró. Aparece un aviso explicándolo y no se borra nada.
  - Para retirar de la oferta algo que ya tiene historial, la vía es **editarlo** — a una masajista se le pone estado *Inactiva*, y deja de ofrecerse sin perder sus sesiones pasadas.
- Los servicios ya contratados **conservan el precio con el que se cobraron**. Cambiar un precio aquí afecta a lo que se contrate de ahora en adelante, nunca a lo ya vendido.
- Lo que todavía **no** está en este panel: los paquetes de vinos y la disponibilidad (horarios de spa, días de cocina). Siguen en el admin de Django.

### Panel de Control PHH (`/admin`)

Panel universal del administrador de Parras Home Hub, accesible solo con rol
`admin`. Dos bloques: métricas de plataforma arriba y, debajo, los usuarios de
todo el sistema con columnas Nombre / Correo / Rol / **Propiedades / Reservas** /
Estado / Fecha de registro.

**Métricas de plataforma**, calculadas en el servidor con datos reales del
backend (usuarios, reservaciones y propiedades):

- **GMV histórico** — suma del gran total de las reservaciones confirmadas o
  finalizadas, sin contar las estancias exentas de propietario.
- **Take-rate capturado (10 %)** — la comisión de PHH proyectada sobre ese GMV
  (el backend todavía no la liquida).
- **Ocupación agregada del año** — noches reservadas ÷ noches disponibles de
  todas las propiedades activas.
- **Cohortes de huéspedes** — recurrentes (más de una estancia concluida) y
  nuevos registros de los últimos 30 días.

**La columna "Propiedades / Reservas" se lee distinto según el rol**, porque las
tres cuentas significan cosas distintas dentro del marketplace:

| Rol | Qué muestra |
| --- | --- |
| **Administrador** | Un distintivo neutro **"Plataforma PHH / Global"**. No lleva ningún estado de reservación: el administrador de PHH opera la plataforma entera, no se hospeda ni es dueño de una casa, así que un badge de estadía —aunque dijera "sin reservaciones"— sugeriría algo que no aplica. |
| **Propietario** | Siempre al menos una propiedad, marcada "· Propietario". Hoy es Casa Brava para todos ellos (ver la nota de abajo). |
| **Huésped** | 0, 1 o varias propiedades, cada una marcada "· Estadía activa" (verde) o "· Estadía pasada". Sin ninguna, la celda dice **"Sin reservaciones activas"**. |

De dónde sale ese dato: la página pide en paralelo los usuarios y **todas las
reservaciones del sistema** (la sesión de administrador las ve completas), y
cruza las dos listas en el servidor. Las estadías son datos reales; la
propiedad de un propietario se atribuye a Casa Brava porque el backend todavía
no tiene forma de decir *de qué cuenta* es cada proveedor. Todo el cruce vive
en [lib/user-properties.ts](lib/user-properties.ts) y ahí está anotado qué
cambia el día que el backend sí lo exponga.

- **Cuatro filtros, todos instantáneos**: rol y estado (pastillas), más
  **Vínculo** (plataforma / propietarios / con estadía activa / sin
  propiedades) y **Propiedad asociada**. Se aplican en el navegador sobre la
  lista ya cargada, sin volver a pedirle nada al backend por cada clic. Cada
  opción muestra cuántos usuarios le corresponden, y "Limpiar filtros" las
  regresa todas a su valor inicial. El select de propiedades solo ofrece las
  que de verdad tienen a alguien vinculado, así que nunca deja la tabla vacía
  por elegir una opción muerta.
- **Es de solo lectura** — no crea, edita ni elimina. Hoy consume el mismo
  `/api/usuarios/` que ya administra por completo el panel de Casa Brava; hacer
  CRUD dos veces sobre la misma colección sería una segunda fuente de verdad
  para la misma escritura. Cuando el backend exponga un listado consolidado por
  propiedad, este panel gana ese endpoint.
- Al navegador solo baja lo que la tabla muestra: nada de teléfono, fecha de
  nacimiento ni identificación, ni el detalle de las reservaciones.

### Portal de anfitrión (`/supplier`)

Público (no pide sesión). Lista las propiedades del directorio con una acción
real por fila — ya no hay botones que solo muestren "próximamente":

- **Casa Brava**: la página le pregunta al backend en ese momento si responde;
  de ahí salen el estado **En línea · Conectado a Django** (o **Sin conexión**),
  su tarifa base real y el botón **Panel de gestión**.
- **Propiedades de demostración**: el botón **Simular tarifas** abre un panel
  lateral donde se combinan temporada, tipo de día, ocupación y eventos sobre la
  tarifa base, con la proyección de ocupación del año y el ahorro frente a la
  comisión de Airbnb (10 % PHH contra 16 %). Es una simulación: no guarda nada.
- Arriba, tres métricas calculadas: ocupación promedio proyectada, RevPAR
  estimado e índice de respuesta operativa (qué parte del portafolio está en
  línea).

---

## 8. Cosas que conviene saber al tocar el código

**Los precios llegan como texto, no como número.** El backend manda `"4500.00"` en vez de `4500` para no perder precisión con los decimales. Antes de sumar o multiplicar hay que convertirlos con `toNumber()` de [lib/format.ts](lib/format.ts); para mostrarlos, `formatMoney()`. La conversión se hace en la página, para que los componentes visuales sigan recibiendo números. Para **sumar dinero** (totales, KPIs) se trabaja en centavos con `toCents()`, y para **mandarlo** al backend se usa `toDecimalString()`, que lo deja con dos decimales exactos.

**Las rutas del panel de gestión salen de `ownerPanelRoutes(slug)`** ([lib/owner-panel.ts](lib/owner-panel.ts)). No escribir `"/p/casa-brava/owner-panel/..."` a mano: el middleware, las pestañas, el portal de anfitrión y los `revalidatePath` usan esa misma función.

**Las listas del backend vienen de 50 en 50.** Para traer una colección completa hay que usar `serverFetchAll` (no `serverFetch`), que va siguiendo las páginas. Si se lee solo la primera, faltan datos **sin ningún error visible** — por ejemplo, desaparecerían los días de spa más lejanos.

**Los componentes del navegador no pueden llamar al backend.** El token está en una cookie que el navegador no puede leer. Todo acceso a datos ocurre en un Server Component (la página) o en una Server Action (`app/actions/`, `app/p/casa-brava/owner-panel/actions.ts`).

**Las reglas de negocio son del backend.** Fechas, choques de reservas, montos e inventario de spa se validan allá, dentro de una transacción. Lo que el frontend hace —deshabilitar fechas en el calendario, ocultar horarios ocupados— sirve para no hacer perder el tiempo, pero no es la protección real.

**Cuidado con las fechas.** `new Date("2026-09-20")` se interpreta en horario universal y puede correrse un día. Usar `parseISO` de `date-fns`, o agregar la hora: `new Date("2026-09-20T00:00:00")`.

---

## 9. Qué falta

| Pendiente | Estado |
| --- | --- |
| **Cobro real con Stripe** | El punto de enganche ya existe en el backend (`pagos.services.registrar_pago`). Falta conectar el proveedor y su webhook. Hoy el pago es simulado. |
| **Vista de pagos en el panel** | El backend ya guarda cada movimiento de cobro por separado (anticipos, saldos, reembolsos), pero el panel todavía solo muestra el estado general de la reserva. |
| **Administrar disponibilidad desde el panel** | Los horarios de spa y los días de cocina se cargan con `seed_demo` o desde el admin de Django; no hay pantalla propia. Los catálogos (tarifas, masajistas, menús y vinos) ya se administran desde `/p/casa-brava/owner-panel/catalogos`; los paquetes de vinos siguen siendo la excepción. |
