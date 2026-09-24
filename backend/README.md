# Casa Brava Rentals — Backend (Django + DRF)

Backend dedicado del sistema de reservaciones de Casa Brava. Sustituye la capa
de datos que vivía en Supabase (Postgres + PostgREST + RLS + funciones plpgsql)
por un proyecto Django con el esquema replicado en el ORM y una API REST
protegida con JWT.

* **Django 6.1** · **Django REST Framework** · **SimpleJWT** · **PostgreSQL**
* Gestión de entorno y dependencias con **`uv`**
* Documentación interactiva del API en `/api/docs/` (OpenAPI vía drf-spectacular)

---

## 1. Arranque rápido

```bash
cd backend
uv sync                                   # instala dependencias en .venv
cp .env.example .env                      # ajustar credenciales de la base
uv run python manage.py migrate           # crea el esquema
uv run python manage.py seed_demo         # datos de desarrollo + contenido del Home (opcional)
uv run python manage.py createsuperuser   # acceso al admin de Django
uv run python manage.py runserver         # http://localhost:8000
```

Con eso arriba: `http://localhost:8000/api/docs/` para explorar la API y
`http://localhost:8000/admin/` para el panel de Django.

> **Sobre `uv run`**: ejecuta el comando dentro del entorno del proyecto sin
> necesidad de activarlo (`source .venv/bin/activate`). Si prefieres activarlo,
> los comandos funcionan igual sin el prefijo `uv run`.

---

## 2. Estructura de las apps

El dominio está repartido en seis apps. La frontera entre ellas es la misma que
se ve en las URLs, y sigue el ciclo de vida de cada entidad — no el orden en que
aparecen en pantalla.

| App | Responsabilidad | Modelos | Prefijo de API |
| --- | --- | --- | --- |
| **`usuarios`** | Perfiles y autenticación. Fusiona `auth.users` + `profiles` de Supabase en un modelo de usuario propio con el correo como identificador. También define las clases de permiso que usan las demás apps. | `Usuario` | `/api/usuarios/` |
| **`propiedades`** | La configuración de cobro heredada de una-sola-casa, el catálogo multi-tenant de propiedades y el contenido visual del Home. | `PropertySettings`, `FareType`, `PropertyPhoto`, `AmenityCategory`, `Amenity`, `AdditionalServiceInfo`, `SupplierProfile`, `Property`, `PropertyAccessGrant` | `/api/propiedades/` |
| **`servicios`** | Catálogos de los servicios adicionales y su disponibilidad. | `FoodMenu`, `Wine`, `WinePackage`, `SpaAvailability`, `FoodAvailability` | `/api/servicios/` |
| **`proveedores`** | Prestadores externos. Hoy solo masajistas; chefs y sommeliers entran aquí. | `SpaMasseuse` | `/api/proveedores/` |
| **`reservaciones`** | La estadía (registro maestro) y los servicios contratados. Contiene toda la lógica transaccional. | `Reservation`, `SpaBooking`, `FoodBooking`, `WineOrder`, `WineOrderItem` | `/api/reservaciones/` |
| **`pagos`** | Estado y libro de movimientos de cobro. | `Payment` | `/api/pagos/` |

### Por qué está partido así

* **`proveedores` separado de `servicios`** — una masajista es una entidad con
  ciclo de vida propio (se da de alta, se suspende, acumula agenda), distinta
  del catálogo de lo que se le ofrece al huésped.
* **`servicios` separado de `reservaciones`** — el catálogo dice *qué se ofrece*,
  la disponibilidad *cuándo puede contratarse*, y el booking *quién lo contrató*.
  Fusionarlos haría imposible retirar un horario de la venta sin tocar historial.
* **`pagos` separado** — `PaymentStatus` vive ahí y `reservaciones` lo importa,
  no al revés: cuando se conecte Stripe, el webhook se implementa en `pagos` sin
  tocar el módulo de reservaciones.

### Archivos que importan dentro de cada app

```
usuarios/
  models.py        Usuario, RoleType, ProfileStatus
  permissions.py   Reemplazo de las políticas RLS (ver §6)
  serializers.py   Incluye el token JWT con el rol dentro
reservaciones/
  models.py        Reservation (+ soft delete, FK a Property) y los tres tipos de booking
  services.py      ⭐ Toda la lógica transaccional: bloqueos por propiedad,
                   solapamientos, inventario de spa, gobernanza INVITE_ONLY.
                   Las vistas no replican estas reglas.
  views.py         Alcance por rol y traducción de errores de dominio a HTTP
  tests.py         42 pruebas de las reglas anteriores + el contrato HTTP de reservaciones
pagos/
  services.py      Registro de cobros y estado agregado de la reservación
propiedades/
  models.py        SupplierProfile, Property, PropertyAccessGrant (§9) +
                   PropertySettings/FareType/contenido del Home
  views.py         PropertyViewSet (solo lectura, público) + catálogos de siempre
  tests.py         Contrato HTTP de los catálogos (escritura solo admin, 409 en uso)
                   y de `/api/propiedades/` (9 pruebas)
  management/commands/seed_demo.py   Semilla de desarrollo (incluye el Tenant 0)
casabrava_core/
  exceptions.py    Manejador de excepciones de la API: ProtectedError ⇒ 409
```

---

## 3. Base de datos y migraciones

### PostgreSQL, no SQLite

`DB_ENGINE=sqlite` sirve para levantar el proyecto en un minuto, pero **SQLite no
soporta bloqueo de filas**: Django ignora `select_for_update()` en silencio, y
toda la protección anti double-booking descrita en §5 queda desactivada. Para
desarrollo serio y para producción, `DB_ENGINE=postgres`.

```bash
# Ejemplo con Docker
docker run --name casabrava-db -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=casabrava -p 5432:5432 -d postgres:16
```

### Comandos

```bash
uv run python manage.py makemigrations          # tras cambiar models.py
uv run python manage.py makemigrations <app>    # solo una app
uv run python manage.py migrate                 # aplicar
uv run python manage.py migrate <app> <número>  # revertir a una migración previa
uv run python manage.py showmigrations          # qué está aplicado
uv run python manage.py sqlmigrate <app> 0001   # ver el SQL sin ejecutarlo
```

Una migración aplicada en un entorno compartido **no se edita**: se crea otra.

### Pruebas

```bash
uv run python manage.py test                # todas
uv run python manage.py test reservaciones  # solo un módulo
```

Las pruebas corren sobre una base temporal, nunca sobre la de desarrollo.

---

## 4. Autenticación (SimpleJWT)

| Endpoint | Qué hace |
| --- | --- |
| `POST /api/auth/token/` | Correo + contraseña ⇒ `{access, refresh, user}` |
| `POST /api/auth/token/refresh/` | `refresh` ⇒ nuevo `access` (y nuevo `refresh`: la rotación está activada) |
| `POST /api/auth/token/verify/` | Valida un token sin consumirlo |
| `POST /api/auth/logout/` | Invalida el `refresh` recibido (lista negra) |
| `POST /api/auth/registro/` | Alta de huésped, sin sesión previa |

```bash
# Obtener un token
curl -X POST http://localhost:8000/api/auth/token/ \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@test.com","password":"changeme123"}'

# Usarlo
curl http://localhost:8000/api/reservaciones/reservaciones/ \
  -H "Authorization: Bearer <access>"
```

El `access` lleva el rol dentro del propio token, para que el frontend no tenga
que consultar el perfil después de iniciar sesión. **Es una conveniencia de UI**:
la autorización real la resuelve el backend en cada petición.

Vigencias configurables por entorno (`JWT_ACCESS_MINUTES`, `JWT_REFRESH_DAYS`);
por defecto 60 minutos y 7 días.

---

## 5. Lógica transaccional (`reservaciones/services.py`)

Es el corazón del backend y el traslado directo de las funciones plpgsql que en
Supabase protegían el inventario. **Las vistas no deciden disponibilidad**: todo
pasa por este módulo, que abre la transacción y toma los bloqueos.

| Función | Reemplaza a | Qué protege |
| --- | --- | --- |
| `crear_reservacion` | `checkoutStay` + `createReservation` | Bloquea la fila de `Property` reservada antes de verificar solapamiento (acotado a esa propiedad), valida `INVITE_ONLY` antes de tocar la base y resuelve la exención de cobro de un propietario (ver "Estado de cobro" más abajo) |
| `actualizar_reservacion` | `updateReservation` | Solapamiento al confirmar, re-adquisición al reactivar, liberación al cancelar — todo acotado a `reservacion.property` —, y rechaza exentar a quien no es propietario |
| `eliminar_reservacion` | `deleteReservation` | Soft delete + liberación de inventario |
| `reservar_bloque_spa` | `book_spa_slot()` | `select_for_update()` sobre el bloque de `SpaAvailability` |
| `liberar_spa_booking` | `release_spa_booking()` | Compensación: borra la reserva **y** devuelve el bloque |
| `liberar_slots_de_reservacion` | `release_spa_slots_for_reservation()` | Cancelar libera horarios sin borrar historial |
| `readquirir_slots_de_reservacion` | `reacquire_spa_slots_for_reservation()` | Reactivar una cancelada no puede pisar lo que otro ya tomó |

### Las cinco reglas que hay que conocer antes de tocar este archivo

1. **Orden de bloqueo fijo**: `Property` (la reservada) → `Reservation` →
   `SpaAvailability` (recorrida ordenada por masajista, fecha, hora). Dos
   transacciones que tomen los mismos locks en distinto orden se abrazan en un
   deadlock.

2. **El calendario se serializa por propiedad, sobre la fila de `Property`**
   (`_bloquear_propiedad`, antes era la fila única de `PropertySettings`). Cada
   `Property` es su propio punto de serialización: dos huéspedes reservando
   fechas en propiedades **distintas** no se bloquean entre sí — el aislamiento
   multi-tenant no le resta concurrencia a propiedades no relacionadas. No se
   puede bloquear "las reservaciones que se solapan" porque **todavía no
   existen**: sin este lock, dos peticiones concurrentes sobre la misma
   propiedad leen "no hay solape" a la vez y ambas insertan.
   `PropertySettings` sigue existiendo solo como fuente de `nightly_rate`/
   `security_deposit` (una lectura simple, sin lock: ya no es el punto de
   serialización).

3. **El solapamiento se verifica contra reservas *activas* (`pendiente` o
   `confirmada`) **de la misma propiedad**, no solo `confirmada`.**
   `checkoutStay` crea la estadía del huésped ya en `pendiente`, así que una
   `pendiente` tiene que ocupar el calendario desde que se crea — verificar solo
   contra confirmadas dejaba una ventana real de double-booking: dos huéspedes
   podían quedarse cada uno con una reserva `pendiente` sobre las mismas
   fechas, y el choque solo salía a la luz cuando un admin intentaba confirmar
   la segunda. El filtro por `property_id` es lo que hace posible el
   aislamiento: los mismos días en dos propiedades distintas no son un
   solapamiento.
4. **El chequeo de solapamiento corre en varios disparadores**, no solo al cambiar fechas:
   también cuando la reservación se reactiva (`cancelada`/`finalizada` → un
   estado activo) y cuando el estado efectivo queda en `confirmada` sin haber
   pasado por reactivación. El primero cubre el camino real por el que una
   reserva se confirma desde el panel (el PATCH solo manda `status`); el
   segundo, que una reserva cancelada se reactive — incluso solo a
   `pendiente` — pisando fechas que otra reservación tomó mientras esta
   estaba inactiva.
5. **Gobernanza `INVITE_ONLY`**: antes de tomar cualquier lock, `crear_reservacion`
   verifica si `propiedad.access_type == INVITE_ONLY` y, de ser así, exige un
   `PropertyAccessGrant` para el **huésped** a cuyo nombre se crea la reserva
   (no para quien hace la petición — un admin puede crear a nombre de un
   huésped sin invitación, y la operación se rechaza igual). Sin propiedad
   explícita en el payload, se usa el Tenant 0 (`_propiedad_tenant_cero`,
   slug `casa-brava`) como fallback de retrocompatibilidad — es la única
   propiedad del MVP actual, y hoy es `INVITE_ONLY` (ver §9).

### Montos

`total_amount`, `total_price` y `price_per_hour` **se derivan en el servidor**;
el monto que mande un cliente se descarta. La única excepción es el total de la
estadía cuando quien crea es un admin, que puede ajustarlo a mano (descuentos).
Los precios ya guardados son un *snapshot* del momento de contratar y no se
recalculan contra el catálogo vigente.

### Estado de cobro (`payment_status`) y el rol `holder`

`PaymentStatus` (`pagos/models.py`) tiene un quinto valor, **`NA`** ("No aplica
/ Exento"), además de `pendiente`/`parcial`/`completado`/`reembolsado`. Es el
estado por defecto de la estadía de un **propietario** (`holder`): no paga la
renta de su propia propiedad, así que su reservación no debe nacer en
`pendiente` como si fuera un huésped esperando pagar.

* **Quién lo asigna y cuándo.** `crear_reservacion` revisa el rol del
  **huésped a cuyo nombre se crea la reservación** (`guest.es_holder`, no el
  de quien hace la petición) y, solo si el payload no manda `payment_status`
  explícito, lo fija en `na` en vez del default del modelo (`pendiente`).
  Cubre por igual al propietario que reserva su propia estadía y al admin que
  la da de alta manualmente por él desde el panel — y sigue siendo posible
  forzar cualquier otro estado a mano si de verdad hay que cobrarle algo.
* **`pagos.services.derivar_estado_de_pago` respeta `na`.** La regla general
  es "sin nada cobrado ⇒ `pendiente`", pero eso reescribiría `na` a
  `pendiente` la primera vez que algo dispare una resincronización (p. ej.
  `registrar_pago` sobre esa misma reservación por otro concepto). La función
  ahora comprueba el `payment_status` actual antes de asumir `pendiente`: si
  ya está en `na` y no hay ningún movimiento registrado, se queda en `na`. En
  cuanto exista un cobro real, vuelve a derivarse con la lógica normal
  (`parcial`/`completado`/`reembolsado`) a partir de ahí.
* **Solo para `holder`.** `_validar_exencion` rechaza `na` —al crear y al
  editar (`actualizar_reservacion`)— para cualquier huésped que no sea
  `holder` (`ExencionInvalidaError` → 400): sin ese guard, cualquier
  reservación se podría sacar del GMV de la plataforma con solo mandar `"na"`.
  Por lo mismo, un `Payment` individual no puede llevar `status = "na"`
  (`PaymentSerializer.validate_status` → 400): `na` describe a la
  reservación, no a un movimiento.
* **El solapamiento no distingue por `payment_status`.** `hay_solapamiento`
  filtra por `status` (`activas()` = `pendiente`/`confirmada`), nunca por
  `payment_status` — una reservación `na` con estado activo ya bloqueaba el
  calendario igual que cualquier otra antes de que existiera este estado; no
  hizo falta ningún cambio ahí.
* **Un `holder` siempre es `is_active=True`.** `UsuarioManager.create_user`
  (en `usuarios/models.py`) lo fuerza para ese rol sin importar qué reciba —
  no es un `setdefault`. Es una salvaguarda defensiva: hoy `is_active` ya es
  de solo lectura en `UsuarioSerializer` y no forma parte de
  `UsuarioCreateSerializer`, así que ningún camino de la API puede
  desactivarlo; esto cierra la puerta si algún día se agrega esa capacidad.
* **`seed_demo`** da de alta una reservación de demostración para
  `carlos.ruiz@example.com` (`holder`) en Casa Brava —`status=confirmada`,
  `payment_status=na`— llamando al propio `reservaciones.services.crear_reservacion`
  (no un `Reservation.objects.create()` a mano), para que pase por las mismas
  reglas que cualquier alta real. Es idempotente: solo se crea si ese
  propietario no tiene ya una reservación vigente en la propiedad.

### Errores de dominio → HTTP

Un choque de fechas o un bloque ya tomado responde **409 Conflict**, no 400: la
petición estaba bien formada, lo que se perdió fue la carrera contra otro
usuario. El mensaje viaja en español, listo para mostrarse.

Marcar como exenta (`payment_status = "na"`) la estancia de alguien que no es
propietario responde **400** con `{"detail": ...}` (`ExencionInvalidaError`,
un `ReglaDeNegocioError` más): es un dato inválido, no una carrera.

Reservar una propiedad `INVITE_ONLY` sin `PropertyAccessGrant` responde
**403 Forbidden** (`AccesoRestringidoError` → `PermissionDenied`), no 400 ni
409: la petición está bien formada y no hay ninguna carrera — es una operación
que ese usuario no tiene permitida, punto.

Bajo el mismo 409 cae **borrar una fila de catálogo que el historial ya
referencia** (una tarifa usada por una reservación, un menú ya contratado, una
masajista que atendió sesiones). Todas esas FK son `on_delete=PROTECT` a
propósito: un borrado en cascada reescribiría lo ya cobrado. La ORM señaliza eso
con `ProtectedError`, que DRF no sabe traducir por su cuenta y dejaría escalar a
un 500 con traceback HTML; `casabrava_core/exceptions.py` lo convierte en 409
con su mensaje, y es lo que muestra el panel de catálogos del frontend.
Registrado como `EXCEPTION_HANDLER` en `REST_FRAMEWORK`, así que aplica a toda
la API — el resto de las excepciones siguen pasando por el manejador de DRF sin
cambios.

---

## 6. Autorización: qué reemplaza a RLS

Al salir de Supabase se pierde Row Level Security como red de última instancia.
Esa protección se reconstruye en dos capas que corren **siempre juntas**:

* **Clases de permiso** (`usuarios/permissions.py`) — deciden *si* se puede
  ejecutar el método.
* **Filtrado de queryset** en cada ViewSet — decide *sobre qué filas*. Es la
  defensa real: un huésped que pida una reservación ajena recibe 404, porque esa
  fila no existe dentro de su universo visible.

| Recurso | admin | holder | guest |
| --- | --- | --- | --- |
| Perfiles | Todo | Lectura de todos | Solo el suyo (sin cambiar rol ni estado) |
| Catálogos y disponibilidad | Escritura | Lectura | Lectura |
| Contenido del Home | Escritura | Lectura pública | Lectura pública |
| Propiedades (`/api/propiedades/`) | Lectura pública (misma API; escritura solo desde el admin de Django, ver §9) | Lectura pública | Lectura pública |
| Reservaciones | Todo | Lectura de todas | Crear y leer las suyas — crear exige `PropertyAccessGrant` si la propiedad es `INVITE_ONLY` (§5, regla 5) |
| Servicios contratados | Todo | Lectura de todos | Crear/leer los suyos; borrarlos solo mientras la estadía siga activa |
| Pagos | Todo | Lectura | Lectura de los suyos |

Guards heredados del panel original, ahora del lado del servidor: nadie cambia su
propio rol o estado, ni un admin borra su propia cuenta (sería el camino más
corto a dejar el panel sin acceso).

---

## 7. Mapa de endpoints

```
/api/auth/…                              Tokens y registro (§4)

/api/usuarios/                           CRUD de perfiles
/api/usuarios/me/                        Perfil de la sesión (GET, PATCH)

/api/propiedades/configuracion/          Tarifa por noche y depósito (Tenant 0, heredado de la casa única)
/api/propiedades/tarifas/                Tipos de tarifa
/api/propiedades/fotos/                  Carrusel del Home
/api/propiedades/amenidades/categorias/  Amenidades agrupadas y ordenadas
/api/propiedades/servicios-info/         Tarjetas de servicios del Home
/api/propiedades/                        Catálogo de propiedades (solo activas), lectura pública — §9
/api/propiedades/<slug>/                 Detalle de una propiedad + `user_has_access` — §9

/api/proveedores/masajistas/             Catálogo de masajistas

/api/servicios/menus/                    Menús (?meal_type=Cena)
/api/servicios/vinos/                    Botellas
/api/servicios/paquetes-vino/            Paquetes
/api/servicios/spa/disponibilidad/       Bloques (?masseuse=&desde=&hasta=)
/api/servicios/comida/disponibilidad/    Días habilitados (?desde=&hasta=)

/api/reservaciones/reservaciones/        Estadías (?property=<slug>&status=&payment_status=) — multi-tenant, §9
/api/reservaciones/reservaciones/ocupadas/   Rangos activos (pendiente + confirmada), para el calendario
/api/reservaciones/spa/                  Sesiones de spa contratadas
/api/reservaciones/comida/               Servicios de cocina contratados
/api/reservaciones/vinos/                Pedidos de vino (cabecera + líneas juntas)

/api/pagos/                              Movimientos de cobro
/api/pagos/<id>/sincronizar/             Recalcula el estado de cobro
```

Al huésped, `/api/servicios/spa/disponibilidad/` le oculta por defecto los
bloques ocupados y los días pasados; el admin ve el inventario completo.

---

## 8. Diferencias frente al esquema de Supabase

Casi todo se replicó tal cual (nombres de tabla y de columna incluidos, para que
los datos existentes migren sin reescribir llaves). Las diferencias son:

1. **`auth.users` + `profiles` ⇒ un solo modelo `Usuario`** sobre la tabla
   `profiles`. Django ya trae su capa de credenciales; mantener dos tablas unidas
   por un `id` compartido solo replicaría la partición que imponía GoTrue.
2. **`payments` es nueva.** En Supabase el cobro era una sola columna
   (`reservations.payment_status`), suficiente mientras el pago estuviera
   simulado pero incapaz de registrar un anticipo, un segundo cargo o un
   reembolso parcial — justo los casos que el estado `parcial` ya contemplaba.
   La reservación conserva su estado agregado; la tabla nueva guarda cada
   movimiento que lo produjo, y el estado se deriva de ellos. El enum suma un
   quinto valor que Supabase no tenía, `na` ("No aplica / Exento"): estancia exenta de
   un propietario (§5, "Estado de cobro").
3. **Las funciones plpgsql son ahora servicios de Python** (§5). Mismo
   comportamiento, misma estrategia de bloqueo.
4. **RLS pasa a la capa de aplicación** (§6).
5. **`SPA_SESSION_PRICE` es un ajuste de entorno.** No había columna de precio en
   `spa_masseuses` y el frontend lo tenía como constante; aquí vive en `settings`
   para que el cliente nunca mande el precio.

---

## 9. Multi-tenant: propiedades, proveedores y aislamiento por propiedad

El sistema dejó de modelar "una sola casa" para modelar un marketplace: varios
proveedores, cada uno dueño de una o más propiedades. La migración de datos que
introdujo esto convirtió la Casa Brava original en la primera fila real de este
esquema — el **Tenant 0** — para que nada de lo que ya existía se rompiera.

### Modelos nuevos (`propiedades/models.py`)

| Modelo | Qué es | Notas |
| --- | --- | --- |
| `SupplierProfile` | Datos de negocio de un proveedor: `business_name`, `stripe_account_id` (vacío hasta que exista cobro real), `commission_rate` (default `10.00`), `is_active`. | 1:1 con `Usuario` — sigue siendo una cuenta de sesión normal (rol `holder`/`SUPPLIER`), esto solo agrega lo que necesita para operar en el marketplace. |
| `Property` | Una propiedad rentable, dueña de un `SupplierProfile`. `slug` único, `access_type` (`OPEN` o `INVITE_ONLY`, default `OPEN`), `require_identity_verification`, `base_price_per_night`, `security_deposit`, `cleaning_fee`, `max_guests`, `is_active`. | `PropertySettings` no se eliminó: sigue siendo la única fuente de `nightly_rate`/`security_deposit` que usa `calcular_total_estadia` (ver §5). No se migró a `Property.base_price_per_night` todavía — ese campo hoy es informativo, no alimenta el cálculo del total. |
| `PropertyAccessGrant` | Otorga a un `Usuario` acceso explícito a una `Property` `INVITE_ONLY`. `unique_together=(property, user)`, `granted_at` (auto). | Sin grant, `crear_reservacion` rechaza con 403 (§5, regla 5). Una propiedad `OPEN` no necesita ninguno. |

`RoleType` (en `usuarios/models.py`) ahora expone `SUPERADMIN`/`SUPPLIER`/`GUEST`
como nombres canónicos sobre los mismos valores almacenados que `ADMIN`/`HOLDER`/
`GUEST` (mismo string en la base — `ADMIN`/`HOLDER` quedan como alias de Python
del mismo miembro), así que ningún dato ni comparación existente cambió.
`Usuario.is_verified` es una propiedad nueva, siempre `False` hasta que exista
el módulo KYC.

### Tenant 0

La migración de datos `reservaciones.0004_tenant_zero_data_migration` (y,
redundantemente, `seed_demo`) crean:

* Un `SupplierProfile` para `admin@test.com` (`business_name="Casa Brava"`).
* La propiedad `Property(slug="casa-brava", access_type="INVITE_ONLY",
  base_price_per_night=4500.00)`.
* Todas las reservaciones preexistentes reasignadas a esa propiedad.
* Un `PropertyAccessGrant` a esa propiedad para `maria.gomez@example.com` y
  `carlos.ruiz@example.com`, para que conserven el acceso que ya tenían.

`reservaciones.services._propiedad_tenant_cero()` (`Property.objects.get(slug=
"casa-brava")`) es el fallback que usa `crear_reservacion` cuando el payload no
especifica propiedad — ver la siguiente sección.

### `GET /api/propiedades/` y `GET /api/propiedades/<slug>/`

Nuevo `PropertyViewSet` (`ReadOnlyModelViewSet`, `propiedades/views.py`),
montado con prefijo vacío en `propiedades/urls.py` — **después** de los demás
`router.register(...)` de esa app, porque su ruta de detalle usa un patrón
"cualquier segmento" (`<slug>`) que interceptaría rutas literales como
`configuracion/` o `tarifas/` si se registrara antes.

* Lectura pública (`AllowAny`) en ambos: el catálogo de propiedades no es dato
  sensible. Solo lista propiedades `is_active=True`.
* Listado → `PropertySerializer`: `id`, `name`, `slug`, `access_type`,
  `base_price_per_night`, `max_guests`, `is_active`. Paginado (50 por página,
  como el resto de los catálogos) — usar `fetchAllPages`/`serverFetchAll` desde
  el frontend, no solo `.results`.
* Detalle → `PropertyDetailSerializer`: agrega `description`,
  `require_identity_verification`, `security_deposit`, `cleaning_fee`,
  `supplier` (anidado mínimo: `id`, `business_name`) y **`user_has_access`**
  (booleano, `SerializerMethodField`): `True` siempre si `access_type == OPEN`;
  si es `INVITE_ONLY`, evalúa `PropertyAccessGrant` contra `request.user` —
  `False` para un visitante anónimo o un huésped sin grant, sin lanzar error
  (es información de solo lectura, no un guard: el guard real vive en
  `crear_reservacion`).
* Alta/edición/baja de propiedades **no está expuesta por API todavía** — sigue
  siendo trabajo del admin de Django (`/admin/`, ver más abajo), igual que la
  disponibilidad de spa/cocina y los paquetes de vino.

### Cambios en `/api/reservaciones/reservaciones/`

**Respuesta** (`ReservationSerializer`) — dos adiciones:

* `property`: representación mínima (`id`, `name`, `slug`) de la propiedad de
  la reservación — no la ficha completa de `/api/propiedades/`, que trae precio
  y aforo, irrelevantes aquí.
* Los cinco campos financieros del modelo multi-tenant: `accommodation_total`,
  `services_total`, `platform_fee`, `supplier_payout`, `grand_total`. Hoy
  `crear_reservacion` solo iguala `accommodation_total` y `grand_total` a
  `total_amount`; el resto queda en `0.00` hasta que exista reparto real de
  comisión/payout (Stripe Connect, pendiente — ver §10). **`gran_total`**
  (la propiedad calculada del modelo, `total_amount + subtotal_servicios`)
  sigue expuesta sin cambios y es, hoy, la fuente de verdad que usa el panel —
  no confundir con el campo nuevo `grand_total` (columna, todavía no poblada
  con el desglose de servicios).

**Filtro por propiedad** — `?property=<slug>` acota la lista a una sola
propiedad. Es lo que usa el panel de gestión de cada casa
(`/p/<slug>/owner-panel/reservations`) para no mezclar reservaciones de otras
propiedades: sin él, un admin/holder recibe las de **todas**. Se aplica encima
del alcance por rol, así que no amplía nada (un huésped sigue viendo solo las
suyas).

**Payload de alta** (`ReservationCreateSerializer`) — dos campos nuevos,
opcionales y equivalentes entre sí:

* `property_id`: UUID de la propiedad (`PrimaryKeyRelatedField`).
* `property_slug`: su slug (`SlugRelatedField`).

Si no se manda ninguno, la vista no pasa `propiedad` a `crear_reservacion`, que
cae al fallback de Tenant 0 — **el mismo comportamiento que tenía el sistema
antes del modelo multi-tenant**, así que el frontend actual (que no manda
ninguno de los dos) sigue funcionando sin cambios. Solo propiedades
`is_active=True` son un destino válido en ambos campos.

Si la propiedad resuelta es `INVITE_ONLY` y el huésped no tiene
`PropertyAccessGrant`, la petición responde **403** (ver §5, regla 5, y
"Errores de dominio → HTTP" más arriba) — nunca crea la reservación.

### Bloqueo pesimista acotado por propiedad

Ver §5, reglas 1 y 2, en detalle. En una frase: `select_for_update()` ya no
bloquea la fila única de `PropertySettings` (que serializaba *todo* el sistema
a la vez) sino la fila de la `Property` reservada — `_bloquear_propiedad`,
`Property.objects.select_for_update().get(pk=propiedad.pk)`. Dos huéspedes
reservando fechas en propiedades distintas nunca se esperan entre sí; dos
huéspedes reservando la misma propiedad sí, exactamente como antes.

### Panel de administración de Django

`propiedades/admin.py` registra los tres modelos nuevos — es, por ahora, la
**única** forma de dar de alta o editar una propiedad, un proveedor o un
grant (no hay UI en el frontend para esto todavía):

* `SupplierProfileAdmin`: `business_name`, `user`, `commission_rate`,
  `is_active`; busca por `business_name` y correo del usuario.
* `PropertyAdmin`: `name`, `slug`, `access_type`, `base_price_per_night`,
  `is_active`; filtros por `access_type`/`is_active`; busca por `name`/`slug`;
  `slug` se auto-sugiere desde `name` al crear.
* `PropertyAccessGrantAdmin`: `property`, `user`, `granted_at`; filtro por
  `property`; busca por correo del usuario.

---

## 10. Pendiente

* **Stripe.** El punto de enganche ya existe: `pagos.services.registrar_pago`
  asienta el movimiento y deriva el estado. Falta que el webhook lo llame con el
  `external_reference` del PaymentIntent confirmado.
* **Administración de disponibilidad.** Los bloques de spa y los días de cocina
  se cargan con `seed_demo` o desde el admin de Django; no hay un flujo dedicado.
  Los catálogos en sí (tarifas, masajistas, menús y vinos) ya se administran
  desde `/p/casa-brava/owner-panel/catalogos` en el frontend; `WinePackage`
  sigue siendo la excepción y solo se edita desde el admin de Django.
* **Alcance de lectura del `holder` por propiedad.** Hoy un `holder` lee las
  reservaciones de *todas* las propiedades (igual que antes del modelo
  multi-tenant). El panel de cada casa ya pide solo las suyas
  (`?property=<slug>`), pero eso es acotamiento de la vista, no autorización:
  cerrar la lectura cruzada exige ligar cada `holder` a sus propiedades
  (`SupplierProfile` → `Property`) y filtrar por ahí en `get_queryset()`. En
  el seed, el dueño de Casa Brava es el admin, no el `holder`, así que ese
  cambio necesita primero una decisión de modelo de datos.
* **Migración de datos.** No hay script que traiga las filas existentes de
  Supabase; el esquema está listo para recibirlas, pero el volcado es manual.
