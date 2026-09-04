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
| **`propiedades`** | La casa: configuración de cobro, tipos de tarifa y el contenido visual del Home. | `PropertySettings`, `FareType`, `PropertyPhoto`, `AmenityCategory`, `Amenity`, `AdditionalServiceInfo` | `/api/propiedades/` |
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
  models.py        Reservation (+ soft delete) y los tres tipos de booking
  services.py      ⭐ Toda la lógica transaccional: bloqueos, solapamientos,
                   inventario de spa. Las vistas no replican estas reglas.
  views.py         Alcance por rol y traducción de errores de dominio a HTTP
  tests.py         33 pruebas de las reglas anteriores
pagos/
  services.py      Registro de cobros y estado agregado de la reservación
propiedades/
  management/commands/seed_demo.py   Semilla de desarrollo
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
| `crear_reservacion` | `checkoutStay` + `createReservation` | Bloquea la fila de `PropertySettings` antes de verificar solapamiento |
| `actualizar_reservacion` | `updateReservation` | Solapamiento al confirmar, re-adquisición al reactivar, liberación al cancelar |
| `eliminar_reservacion` | `deleteReservation` | Soft delete + liberación de inventario |
| `reservar_bloque_spa` | `book_spa_slot()` | `select_for_update()` sobre el bloque de `SpaAvailability` |
| `liberar_spa_booking` | `release_spa_booking()` | Compensación: borra la reserva **y** devuelve el bloque |
| `liberar_slots_de_reservacion` | `release_spa_slots_for_reservation()` | Cancelar libera horarios sin borrar historial |
| `readquirir_slots_de_reservacion` | `reacquire_spa_slots_for_reservation()` | Reactivar una cancelada no puede pisar lo que otro ya tomó |

### Las cuatro reglas que hay que conocer antes de tocar este archivo

1. **Orden de bloqueo fijo**: `PropertySettings` → `Reservation` →
   `SpaAvailability` (recorrida ordenada por masajista, fecha, hora). Dos
   transacciones que tomen los mismos locks en distinto orden se abrazan en un
   deadlock.

2. **El calendario se serializa sobre `PropertySettings`**. Es una casa sola, así
   que su fila única sirve de punto de serialización. No se puede bloquear "las
   reservaciones que se solapan" porque **todavía no existen**: sin este lock,
   dos peticiones concurrentes leen "no hay solape" a la vez y ambas insertan.

3. **El solapamiento se verifica contra reservas *activas* (`pendiente` o
   `confirmada`), no solo `confirmada`.** `checkoutStay` crea la estadía del
   huésped ya en `pendiente`, así que una `pendiente` tiene que ocupar el
   calendario desde que se crea — verificar solo contra confirmadas dejaba una
   ventana real de double-booking: dos huéspedes podían quedarse cada uno con
   una reserva `pendiente` sobre las mismas fechas, y el choque solo salía a la
   luz cuando un admin intentaba confirmar la segunda.
4. **El chequeo de solapamiento corre en varios disparadores**, no solo al cambiar fechas:
   también cuando la reservación se reactiva (`cancelada`/`finalizada` → un
   estado activo) y cuando el estado efectivo queda en `confirmada` sin haber
   pasado por reactivación. El primero cubre el camino real por el que una
   reserva se confirma desde el panel (el PATCH solo manda `status`); el
   segundo, que una reserva cancelada se reactive — incluso solo a
   `pendiente` — pisando fechas que otra reservación tomó mientras esta
   estaba inactiva.

### Montos

`total_amount`, `total_price` y `price_per_hour` **se derivan en el servidor**;
el monto que mande un cliente se descarta. La única excepción es el total de la
estadía cuando quien crea es un admin, que puede ajustarlo a mano (descuentos).
Los precios ya guardados son un *snapshot* del momento de contratar y no se
recalculan contra el catálogo vigente.

### Errores de dominio → HTTP

Un choque de fechas o un bloque ya tomado responde **409 Conflict**, no 400: la
petición estaba bien formada, lo que se perdió fue la carrera contra otro
usuario. El mensaje viaja en español, listo para mostrarse.

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
| Reservaciones | Todo | Lectura de todas | Crear y leer las suyas |
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

/api/propiedades/configuracion/          Tarifa por noche y depósito
/api/propiedades/tarifas/                Tipos de tarifa
/api/propiedades/fotos/                  Carrusel del Home
/api/propiedades/amenidades/categorias/  Amenidades agrupadas y ordenadas
/api/propiedades/servicios-info/         Tarjetas de servicios del Home

/api/proveedores/masajistas/             Catálogo de masajistas

/api/servicios/menus/                    Menús (?meal_type=Cena)
/api/servicios/vinos/                    Botellas
/api/servicios/paquetes-vino/            Paquetes
/api/servicios/spa/disponibilidad/       Bloques (?masseuse=&desde=&hasta=)
/api/servicios/comida/disponibilidad/    Días habilitados (?desde=&hasta=)

/api/reservaciones/reservaciones/        Estadías (?status=&payment_status=)
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
   movimiento que lo produjo, y el estado se deriva de ellos.
3. **Las funciones plpgsql son ahora servicios de Python** (§5). Mismo
   comportamiento, misma estrategia de bloqueo.
4. **RLS pasa a la capa de aplicación** (§6).
5. **`SPA_SESSION_PRICE` es un ajuste de entorno.** No había columna de precio en
   `spa_masseuses` y el frontend lo tenía como constante; aquí vive en `settings`
   para que el cliente nunca mande el precio.

---

## 9. Pendiente

* **Stripe.** El punto de enganche ya existe: `pagos.services.registrar_pago`
  asienta el movimiento y deriva el estado. Falta que el webhook lo llame con el
  `external_reference` del PaymentIntent confirmado.
* **Administración de disponibilidad.** Los bloques de spa y los días de cocina
  se cargan con `seed_demo` o desde el admin de Django; no hay un flujo dedicado.
* **Migración de datos.** No hay script que traiga las filas existentes de
  Supabase; el esquema está listo para recibirlas, pero el volcado es manual.
