# CLAUDE.md

Memoria técnica del proyecto para futuras interacciones con IA. Léelo antes de generar o modificar código en este repositorio.

## Qué es este proyecto

Sistema de reservaciones para una casa privada de renta ("Casa Brava Rentals"), de acceso exclusivo por invitación. Estado actual: **prototipo visual (esqueleto)**. No hay backend real conectado.

## Stack tecnológico

- **Next.js 16** (App Router, no Pages Router) con Turbopack.
- **React 19**.
- **TypeScript** en modo `strict`. No usar `any` salvo casos justificados.
- **Tailwind CSS v4** (configuración basada en CSS vía `@import "tailwindcss"` en [app/globals.css](app/globals.css); no existe `tailwind.config.js`, los tokens se definen con `@theme`).
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
- Componentes reutilizables van en `components/`; las páginas (`app/**/page.tsx`) solo componen esos componentes y manejan estado/routing, no deberían tener bloques grandes de markup propios.
- Los formularios y flujos con estado (login, reservación) son Client Components (`"use client"`) porque dependen de `useState`/`useRouter`. Las páginas puramente de presentación (home, pago exitoso) se mantienen como Server Components cuando sea posible.

## Estado actual: datos mockeados

Todo el contenido dinámico (fotos, amenidades, servicios adicionales, tarifas y precios) vive en [lib/mock-data.ts](lib/mock-data.ts). No hay llamadas a APIs ni base de datos. El login no valida credenciales reales: cualquier submit del formulario redirige al home simulando éxito. El botón "Proceder al pago" redirige directamente a una página estática de éxito sin procesar ningún cobro real.

## Integración futura planeada (NO implementar todavía sin instrucción explícita)

- **Supabase**: Auth (reemplazar el login mockeado por sesiones reales) y Base de Datos (huéspedes, reservaciones, disponibilidad de fechas, servicios adicionales).
- **Stripe**: procesamiento real de pagos en el flujo de reservación (`app/reservar/page.tsx`), reemplazando la redirección directa a `/pago-exitoso` por un Stripe Checkout o Payment Intent, con confirmación por webhook antes de mostrar la página de éxito.
- Al conectar backend real, mantener `lib/mock-data.ts` como referencia de la forma (shape) de los datos, pero las fuentes de verdad pasarán a ser consultas a Supabase.

## Qué NO hacer

- No agregar autenticación real, validación de contraseñas, ni llamadas a base de datos hasta que se pida explícitamente.
- No introducir librerías de UI pesadas (component libraries completas) para este prototipo salvo que se solicite; preferir Tailwind puro y componentes propios.
- No romper la estructura de `lib/mock-data.ts` sin actualizar también `DOCUMENTATION.md`.
