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
  page.tsx             → Pantalla principal del huésped (home)
  login/page.tsx        → Pantalla de acceso restringido
  reservar/page.tsx     → Flujo de reservación (fechas, tarifa, resumen, pago)
  pago-exitoso/page.tsx → Pantalla estática de confirmación de pago

components/
  Navbar.tsx            → Barra superior (logo + botón "Cerrar sesión")
  Footer.tsx            → Pie de página
  Carousel.tsx          → Carrusel de fotos de la propiedad
  AmenitiesList.tsx      → Lista de amenidades con íconos
  ServiceCard.tsx         → Tarjeta individual de un servicio adicional
  DateRangeSelector.tsx   → Selector de fecha de llegada/salida
  PricingOptions.tsx      → Radio buttons de tipo de tarifa
  BookingSummary.tsx      → Desglose de cobro (noches + recargo + depósito)

lib/
  mock-data.ts          → TODOS los datos de prueba: fotos, amenidades, servicios y precios
```

Regla simple: **si algo se repite visualmente o tiene lógica propia, vive en `components/`. Si es solo texto o números de ejemplo, vive en `lib/mock-data.ts`.**

## 4. Dónde editar los componentes visuales principales

- **Carrusel de fotos**: la lógica de navegación (flechas, puntos) está en [components/Carousel.tsx](components/Carousel.tsx). Actualmente muestra rectángulos grises con el nombre de la foto en vez de imágenes reales — cuando haya fotos definitivas, se reemplaza el bloque `<div className="... bg-neutral-200 ...">` por una etiqueta `<Image>` de Next.js.
- **Tarjetas de "Servicios Adicionales"** (Comida, SPA/Masajes, Paquete de Vinos): el diseño de cada tarjeta está en [components/ServiceCard.tsx](components/ServiceCard.tsx). El contenido (título, descripción, precio) se edita en `lib/mock-data.ts`, no en el componente.
- **Amenidades**: el diseño de la grilla de íconos está en [components/AmenitiesList.tsx](components/AmenitiesList.tsx); el contenido (qué amenidades aparecen) se edita en `lib/mock-data.ts`.

## 5. Dónde están los datos mockeados (para editar antes de la demo)

Todo está en un único archivo: **[lib/mock-data.ts](lib/mock-data.ts)**. Ahí se puede cambiar sin tocar ningún componente:

| Qué quieres cambiar | Variable en `mock-data.ts` |
|---|---|
| Fotos del carrusel (cantidad y etiquetas) | `PROPERTY_PHOTOS` |
| Amenidades de la casa | `AMENITIES` |
| Servicios adicionales (Comida, SPA, Vinos) | `ADDITIONAL_SERVICES` |
| Tipos de tarifa (Estándar / Flexible) y su recargo | `FARE_OPTIONS` |
| Precio por noche y depósito de garantía | `PRICING_CONFIG` |

Ejemplo: para cambiar el precio por noche de $250 a $300, solo hay que editar `nightlyRate` dentro de `PRICING_CONFIG` en ese archivo. El resumen de cobro en la página de reservación se recalcula solo.

## 6. Qué falta conectar al backend (próximos sprints)

Esto es un prototipo de interfaz, así que lo siguiente **todavía no funciona de verdad** y queda pendiente:

- **Login** ([app/login/page.tsx](app/login/page.tsx)): el formulario no valida nada, cualquier dato que se ingrese redirige al home. Falta conectar autenticación real (planeado: Supabase Auth).
- **Cerrar sesión** (botón en el [Navbar](components/Navbar.tsx)): solo redirige a `/login`, no invalida ninguna sesión real porque no existe sesión todavía.
- **Disponibilidad de fechas** ([app/reservar/page.tsx](app/reservar/page.tsx)): el selector de fechas no valida contra un calendario de disponibilidad real; solo calcula noches entre dos fechas.
- **Pago** (botón "Proceder al pago"): redirige directo a la pantalla de éxito sin cobrar nada. Falta integrar un proveedor de pagos real (planeado: Stripe).
- **Persistencia de la reservación**: no se guarda en ningún lado; al recargar la página se pierde todo. Falta una base de datos (planeado: Supabase).

Para más detalle técnico sobre el stack y las convenciones de código, ver [CLAUDE.md](CLAUDE.md).
