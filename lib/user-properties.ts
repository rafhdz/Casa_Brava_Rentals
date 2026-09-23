// Qué propiedades del directorio le corresponden a cada cuenta de PHH.
//
// Lo consume hoy el Panel de Control PHH (`/admin`), que necesita responder
// tres preguntas distintas según el rol:
//
//   * `admin`  — administra la plataforma entera; no reserva ni pertenece a
//     una propiedad, así que su fila no debe mostrar estado de estadía alguno.
//   * `holder` — proveedor/anfitrión: siempre al menos una propiedad.
//   * `guest`  — 0, 1 o N propiedades, según su historial de estadías.
//
// No vive en lib/api/ porque esa capa es acceso puro a la API, y esto ya es
// una noción de dominio ("a qué propiedad pertenece esta persona") — mismo
// criterio que lib/reservations.ts ("cuál es la reservación relevante").
//
// De dónde sale cada mitad, y qué tan real es:
//
//   * Las estadías son REALES: salen de `/api/reservaciones/reservaciones/`,
//     que para una sesión admin devuelve las de todo el sistema, y cada
//     reservación trae su propiedad anidada (`reservation.property`). Cuando
//     Django sirva varias propiedades, esta mitad ya es correcta sola.
//   * La propiedad de un `holder` se ATRIBUYE a Tenant 0. No es un capricho:
//     el modelo del backend ya relaciona proveedor → propiedades
//     (`SupplierProfile` → `Property`), pero ningún endpoint expone ese
//     vínculo por usuario (`/api/propiedades/` no dice de qué cuenta es cada
//     proveedor, y no hay listado de `PropertyAccessGrant`), así que hoy no
//     hay forma de consultarlo. Mientras Tenant 0 sea la única propiedad con
//     backend real, atribuirla es exacto; el día que exista el endpoint, se
//     reemplaza `ownedPropertySlugs()` y nada más de este archivo cambia.
//
// Lo que este módulo NO hace: inventar estadías, adivinar invitaciones ni
// escribir nada. Es una derivación pura sobre datos ya traídos por la página.

import { ESTADOS_ACTIVOS, type Reservation, type Usuario } from "@/lib/api/types";
import { getPropertyName, TENANT_ZERO_SLUG } from "@/lib/mock/marketplace-data";
import type { UserPropertyLink, UserPropertyScope } from "@/lib/types/marketplace";

/** Texto de la celda de un administrador de PHH: opera la plataforma, no una casa. */
export const PLATFORM_SCOPE_LABEL = "Plataforma PHH / Global";

/** Texto de la celda de una cuenta sin ninguna propiedad atribuida. */
export const NO_PROPERTIES_LABEL = "Sin reservaciones activas";

/** Cuenta mínima que necesita la derivación — no hace falta el perfil entero. */
type CuentaMinima = Pick<Usuario, "id" | "role">;

/**
 * Propiedades que son *de* esta cuenta (no en las que se hospeda).
 *
 * Ver la nota de arriba: hoy todo `holder` es proveedor de Tenant 0 porque es
 * la única propiedad con backend real y la API no expone el vínculo
 * proveedor → propiedad. Este es el único punto a cambiar cuando lo exponga.
 */
function ownedPropertySlugs(user: CuentaMinima): string[] {
  return user.role === "holder" ? [TENANT_ZERO_SLUG] : [];
}

/**
 * Índice `id de huésped` → (`slug` → vínculo) construido de las reservaciones.
 *
 * Se colapsa por propiedad a propósito: alguien con tres estadías en la misma
 * casa es **una** fila en la celda, con `hasActiveStay` en `true` si al menos
 * una de esas tres sigue viva (`pendiente`/`confirmada`).
 */
function indexarEstadias(reservations: Reservation[]): Map<string, Map<string, UserPropertyLink>> {
  const porHuesped = new Map<string, Map<string, UserPropertyLink>>();

  for (const reservation of reservations) {
    const { slug, name } = reservation.property;
    const porPropiedad = porHuesped.get(reservation.guest.id) ?? new Map<string, UserPropertyLink>();
    const previo = porPropiedad.get(slug);

    porPropiedad.set(slug, {
      propertySlug: slug,
      propertyName: name,
      // Aquí todo vínculo es una estadía; `attachPropertyScopes` es quien lo
      // promueve a "owner" si además resulta ser su propiedad.
      kind: "stay",
      hasActiveStay:
        (previo?.hasActiveStay ?? false) || ESTADOS_ACTIVOS.includes(reservation.status),
    });
    porHuesped.set(reservation.guest.id, porPropiedad);
  }

  return porHuesped;
}

/**
 * Agrega a cada cuenta su `propertyScope`, listo para renderizar y filtrar.
 *
 * Genérica en `T` para devolver la misma forma que recibió más el campo nuevo:
 * la página pasa `Usuario[]` y obtiene algo asignable a `GlobalUser[]` (ver
 * components/GlobalUsersPanel.tsx) sin que este módulo tenga que importar un
 * tipo declarado dentro de un Client Component.
 */
export function attachPropertyScopes<T extends CuentaMinima>(
  users: T[],
  reservations: Reservation[]
): Array<T & { propertyScope: UserPropertyScope }> {
  const estadias = indexarEstadias(reservations);

  return users.map((user) => {
    if (user.role === "admin") {
      const propertyScope: UserPropertyScope = { scope: "platform" };
      return { ...user, propertyScope };
    }

    // Copia: el índice se comparte entre usuarios y agregar aquí la propiedad
    // de un `holder` no debe filtrarse a la fila de nadie más.
    const links = new Map(estadias.get(user.id) ?? []);

    for (const slug of ownedPropertySlugs(user)) {
      const previo = links.get(slug);
      links.set(slug, {
        propertySlug: slug,
        // Si ya se hospedó ahí, el nombre real de la API gana sobre el del
        // directorio mock; si no, el directorio es la única fuente que hay.
        propertyName: previo?.propertyName ?? getPropertyName(slug),
        // "owner" pisa a "stay": un propietario que además se hospeda en su
        // propia casa se lee como propietario, no como huésped ocasional.
        kind: "owner",
        hasActiveStay: previo?.hasActiveStay ?? false,
      });
    }

    const propertyScope: UserPropertyScope = {
      scope: "properties",
      links: [...links.values()].sort((a, b) =>
        a.propertyName.localeCompare(b.propertyName, "es")
      ),
    };

    return { ...user, propertyScope };
  });
}
