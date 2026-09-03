"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { success: true } | { error: string };

// Compensación para un registro que falló a medio camino: signUp() ya creó
// la cuenta en auth.users, pero el insert en profiles no se completó, y
// quedaría un usuario huérfano (con cuenta pero sin perfil) que bloquearía
// cualquier reintento con ese mismo correo. Borrar en auth.users requiere la
// Service Role Key (Auth Admin API) — por eso no se puede hacer desde el
// cliente y necesita esta Server Action auxiliar, igual que deleteUser en
// app/admin/actions.ts.
//
// A diferencia de deleteUser (que exige requireAdmin porque el caller ya es
// un admin operando sobre otra cuenta), aquí el caller todavía no tiene
// ningún rol — es la persona que se acaba de registrar. Por eso el guard es
// distinto: en vez de "es admin", se exige que la sesión activa (leída por
// cookies con el cliente estándar, nunca confiando en el userId que manda el
// cliente) pertenezca exactamente al mismo userId que se pide borrar. Si
// signUp no dejó una sesión activa (ej. confirmación de correo habilitada en
// el proyecto), no hay forma segura de verificar la propiedad de la cuenta
// sin esa sesión, así que se rehúsa borrar y se le pide a la persona que
// contacte a soporte — mejor un huérfano manual y raro que un endpoint que
// cualquiera podría usar para borrar cuentas ajenas con solo conocer su uuid.
export async function compensateFailedRegistration(userId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.id !== userId) {
      return {
        error:
          "No se pudo verificar tu sesión para revertir el registro. Contacta a soporte.",
      };
    }

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return { error: error.message };

    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Ocurrió un error inesperado." };
  }
}
