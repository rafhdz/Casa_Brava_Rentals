"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/AuthContext";

type ActionResult = { success: true } | { error: string };

// Contraseña temporal fija asignada a toda cuenta creada desde /admin (Fase
// 2 — antes se invitaba por correo con inviteUserByEmail y la persona
// elegía su propia contraseña). Aceptable solo mientras el proyecto siga
// siendo un prototipo de acceso invitado con un puñado de usuarios de
// confianza — ver el aviso completo en CLAUDE.md ("Creación directa de
// usuarios") antes de reutilizar este patrón en producción.
const DEFAULT_TEMP_PASSWORD = "changeme123";

// Traduce los errores más comunes de la Auth Admin API a español, con el
// mismo criterio que translateAuthError en app/login/page.tsx (no exponer
// mensajes internos del proveedor en la UI). Solo cubre el caso que un admin
// realmente puede provocar desde este formulario — crear una cuenta con un
// correo que ya existe; cualquier otro error cae a un mensaje genérico.
function translateCreateError(message: string): string {
  if (message.toLowerCase().includes("already been registered")) {
    return "Ya existe un usuario con este correo.";
  }
  return "No se pudo crear el usuario. Intenta de nuevo.";
}

export async function createUser(
  email: string,
  firstName: string,
  lastName1: string,
  lastName2: string,
  role: Profile["role"]
): Promise<ActionResult> {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return { error: auth.error };

    // createUser (Auth Admin API) solo funciona con la Service Role Key —
    // por eso este paso, a diferencia de updateUser, no puede usar el
    // cliente de sesión estándar. email_confirm: true evita el correo de
    // confirmación: la cuenta queda lista para iniciar sesión de inmediato
    // con DEFAULT_TEMP_PASSWORD.
    const admin = createAdminClient();

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: DEFAULT_TEMP_PASSWORD,
      email_confirm: true,
    });
    if (error) return { error: translateCreateError(error.message) };
    if (!data.user) return { error: "No se pudo crear el usuario." };

    const { error: profileError } = await admin.from("profiles").insert({
      id: data.user.id,
      email,
      first_name: firstName,
      apellido_paterno: lastName1,
      apellido_materno: lastName2 || null,
      role,
    });

    if (profileError) {
      // Compensar: si el perfil no se pudo crear, no dejar un usuario de
      // Auth huérfano (con cuenta pero sin fila en profiles) — quedaría con
      // el correo "ocupado" en auth.users, bloqueando cualquier reintento
      // de creación para ese mismo correo.
      await admin.auth.admin.deleteUser(data.user.id);
      return { error: profileError.message };
    }

    revalidatePath("/admin");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Ocurrió un error inesperado." };
  }
}

export async function updateUser(
  userId: string,
  data: { role?: Profile["role"]; status?: Profile["status"] }
): Promise<ActionResult> {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return { error: auth.error };

    // Guard anti-auto-modificación: si el admin se edita a sí mismo, no se
    // le permite tocar su propio role/status — podría quitarse el rol admin
    // o suspenderse (status: "invitado") y quedar sin acceso a /admin en su
    // siguiente navegación, recuperable solo interviniendo la base de datos
    // a mano (mismo tipo de auto-lockout que ya bloquea deleteUser más
    // abajo). La UI ya deshabilita estos selects en la propia fila del admin
    // (ver UsersTable.tsx), pero esta Server Action es el límite real.
    if (auth.userId === userId) {
      return { error: "No puedes modificar tu propio rol o estado." };
    }

    // A diferencia de createUser, esto sí puede usar el cliente de sesión
    // estándar (no la Service Role Key): el admin ya está autenticado y esta
    // es una actualización sobre una fila existente, no una llamada a la
    // Auth Admin API.
    const { error } = await auth.supabase.from("profiles").update(data).eq("id", userId);
    if (error) return { error: error.message };

    revalidatePath("/admin");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Ocurrió un error inesperado." };
  }
}

export async function deleteUser(userId: string): Promise<ActionResult> {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return { error: auth.error };

    // Guard duro contra el auto-lockout: si el único admin se elimina a sí
    // mismo, nadie más puede volver a entrar a /admin sin intervenir la base
    // de datos a mano. El botón "Eliminar" ya viene deshabilitado en la UI
    // para la propia fila, pero la Server Action es el límite real (la UI es
    // solo una ayuda, no la protección).
    if (auth.userId === userId) {
      return { error: "No puedes eliminar tu propia cuenta." };
    }

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(userId);

    if (error) {
      // profiles.id -> auth.users(id) es "on delete cascade" (ver migración
      // inicial): si el usuario de Auth existe, borrarlo ya elimina su
      // profile automáticamente, sin necesidad de un segundo delete. Este
      // bloque solo cubre el caso contrario — un profile huérfano cuyo
      // usuario de Auth ya no existe (por alguna causa externa a esta app)
      // — para no dejar una fila que ningún flujo normal puede volver a
      // tocar.
      const isNotFound = error.status === 404 || /not found/i.test(error.message);
      if (!isNotFound) return { error: error.message };

      const { error: profileError } = await admin.from("profiles").delete().eq("id", userId);
      if (profileError) return { error: profileError.message };
    }

    revalidatePath("/admin");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Ocurrió un error inesperado." };
  }
}
