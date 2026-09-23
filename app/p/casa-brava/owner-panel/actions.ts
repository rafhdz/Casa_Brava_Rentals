"use server";

import { revalidatePath } from "next/cache";
import { serverFetch, toActionError } from "@/lib/api/server";
import { ownerPanelRoutes } from "@/lib/owner-panel";
import { TENANT_ZERO_SLUG } from "@/lib/mock/marketplace-data";
import type { ProfileStatus, RoleType, Usuario } from "@/lib/api/types";

type ActionResult = { success: true } | { error: string };

// Ruta a revalidar tras cada escritura. Se arma con `ownerPanelRoutes` en vez
// de escribirse a mano: es el mismo string que usan la página y OwnerNav, y un
// panel montado mañana bajo otro slug no puede quedar revalidando el de Casa
// Brava por descuido (ver lib/owner-panel.ts).
const USERS_PATH = ownerPanelRoutes(TENANT_ZERO_SLUG).root;

/**
 * Contraseña temporal fija asignada a toda cuenta creada desde /admin.
 *
 * ⚠️ Aceptable solo mientras el proyecto siga siendo un sistema de acceso
 * invitado con un puñado de usuarios de confianza, donde el admin le comparte
 * la contraseña a la persona directamente. Es la misma para *todas* las
 * cuentas y cualquiera con acceso al código la conoce. Antes de un despliegue
 * real hay que reemplazarla por: (a) forzar el cambio en el primer login,
 * (b) generar una aleatoria por usuario y comunicarla fuera de banda, o
 * (c) un flujo de invitación por correo donde la persona elija la suya.
 */
const DEFAULT_TEMP_PASSWORD = "changeme123";

/**
 * Crea una cuenta con su perfil.
 *
 * En Supabase esto eran dos escrituras (la cuenta en `auth.users` y el perfil
 * en `profiles`) con una compensación manual por si la segunda fallaba y
 * dejaba un usuario huérfano que bloqueaba el correo. Aquí cuenta y perfil son
 * la misma fila: una sola petición que pasa entera o no pasa.
 */
export async function createUser(
  email: string,
  firstName: string,
  lastName1: string,
  lastName2: string,
  role: RoleType
): Promise<ActionResult> {
  try {
    await serverFetch<Usuario>("/api/usuarios/", {
      method: "POST",
      body: {
        email,
        password: DEFAULT_TEMP_PASSWORD,
        first_name: firstName,
        apellido_paterno: lastName1,
        apellido_materno: lastName2 || null,
        role,
        status: "activo",
      },
    });

    revalidatePath(USERS_PATH);
    return { success: true };
  } catch (error) {
    // El backend ya devuelve "Ya existe un/a usuario con este/a email." para el
    // correo duplicado, que es el único error que un admin puede provocar
    // realmente desde este formulario.
    return { error: toActionError(error, "No se pudo crear el usuario. Intenta de nuevo.") };
  }
}

/**
 * Cambia el rol y/o el estado de una cuenta.
 *
 * El guard contra la auto-modificación (un admin quitándose su propio rol y
 * quedando fuera del panel) vive en el backend, en el `validate()` del
 * serializer: la UI deshabilita los selects en la propia fila, pero el límite
 * real es la API.
 */
export async function updateUser(
  userId: string,
  data: { role?: RoleType; status?: ProfileStatus }
): Promise<ActionResult> {
  try {
    await serverFetch<Usuario>(`/api/usuarios/${userId}/`, { method: "PATCH", body: data });

    revalidatePath(USERS_PATH);
    return { success: true };
  } catch (error) {
    return { error: toActionError(error, "No se pudo actualizar el usuario.") };
  }
}

/**
 * Elimina una cuenta. El backend rechaza que un admin borre la suya —el camino
 * más corto para dejar el panel sin acceso—, igual que la UI deshabilita ese
 * botón en la propia fila.
 */
export async function deleteUser(userId: string): Promise<ActionResult> {
  try {
    await serverFetch(`/api/usuarios/${userId}/`, { method: "DELETE" });

    revalidatePath(USERS_PATH);
    return { success: true };
  } catch (error) {
    return { error: toActionError(error, "No se pudo eliminar el usuario.") };
  }
}
