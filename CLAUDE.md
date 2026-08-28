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
- Íconos `.svg` estáticos servidos desde `public/icons/` (amenidades en `public/icons/amenities/<categoría>/`, íconos de sistema en `public/icons/system/`) se renderizan con el tag `<img>` nativo, no con `next/image` — el optimizador de imágenes de Next.js rechaza archivos `.svg` a menos que se habilite `dangerouslyAllowSVG` en `next.config.ts`, y no se ha activado esa opción. `next/image` sigue siendo el estándar para fotografías (`.jpeg`/`.png`) como en `Carousel.tsx`.
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

## Nota sobre lint: `react-hooks/set-state-in-effect`

El ESLint de este proyecto (via `eslint-config-next`) incluye una regla estricta que marca como error llamar a `setState` dentro de un `useEffect` cuando el valor viene de una lectura/computación (como `JSON.parse` de `localStorage`). La hidratación de la sesión en `AuthProvider` es un caso legítimo de sincronización con un sistema externo al montar (no un efecto derivado en cadena), así que ahí se usa un `eslint-disable-next-line` puntual con comentario explicando el motivo. No copiar ese patrón de deshabilitar la regla para otros casos sin justificarlo de la misma forma — antes de hacerlo, intentar resolver el llamado de estado fuera del efecto (ej. `useState` con inicializador perezoso) cuando el componente no requiera compatibilidad con SSR.

## Integración futura planeada (NO implementar todavía sin instrucción explícita)

- **Supabase**: Auth (reemplazar el login mockeado por sesiones reales) y Base de Datos (huéspedes, reservaciones, disponibilidad de fechas, servicios adicionales).
- **Stripe**: procesamiento real de pagos en el flujo de reservación (`app/reservar/page.tsx`), reemplazando la redirección directa a `/pago-exitoso` por un Stripe Checkout o Payment Intent, con confirmación por webhook antes de mostrar la página de éxito.
- Al conectar backend real, mantener `lib/mock-data.ts` como referencia de la forma (shape) de los datos, pero las fuentes de verdad pasarán a ser consultas a Supabase.

## Qué NO hacer

- No agregar autenticación real (verificación de contraseña contra un backend, tokens, hashing), ni llamadas a base de datos hasta que se pida explícitamente. La validación de formato en el cliente (formato de correo, campos no vacíos) sí es parte del prototipo y está implementada — no es lo mismo que autenticación real.
- No introducir librerías de UI pesadas (component libraries completas) para este prototipo salvo que se solicite; preferir Tailwind puro y componentes propios.
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
