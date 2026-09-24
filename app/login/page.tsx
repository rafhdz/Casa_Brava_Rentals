"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { TENANT_ZERO_SLUG } from "@/lib/mock/marketplace-data";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// La traducción de los errores de autenticación vive ahora en la Server Action
// (app/actions/auth.ts): es quien habla con SimpleJWT y la única que ve el
// mensaje crudo del backend. Aquí solo se muestra lo que devuelve.

// Esta pantalla es la puerta de entrada de TODO Parras Home Hub, no de Casa
// Brava: una sola cuenta sirve para el directorio público y para las estancias
// exclusivas por invitación. Por eso la marca de aquí es PHH (ver también
// components/Navbar.tsx, que monta MarketplaceNavbar en /login y /register, y
// CLAUDE.md, "Gestión de logos e identidad visual").

// No existe todavía endpoint de recuperación por correo en el backend (no hay
// `/api/auth/password-reset/` ni configuración de envío de correo). En vez de
// un enlace muerto o de un formulario que simule un envío que nunca ocurre, el
// botón abre este aviso con la vía real: soporte de la plataforma o el
// anfitrión que emitió la invitación.
const PASSWORD_HELP_MESSAGE =
  "Para recuperar o restablecer el acceso a tu cuenta de Parras Home Hub, contacta al soporte de la plataforma o solicita la reactivación a tu anfitrión.";

function PasswordHelpModal({ onClose }: { onClose: () => void }) {
  // Mismo patrón de cierre con Escape que los modales del panel de gestión
  // (components/UsersTable.tsx, ReservationsTable.tsx, CatalogTable.tsx).
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm [animation:fade-in_200ms_ease-out]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-help-title"
        aria-describedby="password-help-description"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl [animation:modal-in_200ms_ease-out]"
      >
        <h2 id="password-help-title" className="text-lg font-semibold text-neutral-900">
          Recuperar el acceso
        </h2>
        <p id="password-help-description" className="mt-2 text-sm text-neutral-600">
          {PASSWORD_HELP_MESSAGE}
        </p>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            autoFocus
            onClick={onClose}
            className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 ease-in-out hover:bg-neutral-700 active:scale-95"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordHelpOpen, setIsPasswordHelpOpen] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const trimmedEmail = email.trim();
    let hasError = false;

    if (!trimmedEmail) {
      setEmailError("El correo electrónico es obligatorio.");
      hasError = true;
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      setEmailError(
        "Ingresa un correo electrónico válido (ej. nombre@dominio.com).",
      );
      hasError = true;
    } else {
      setEmailError(null);
    }

    if (!password) {
      setPasswordError("La contraseña es obligatoria.");
      hasError = true;
    } else {
      setPasswordError(null);
    }

    if (hasError) return;

    setIsSubmitting(true);
    const { error, role } = await login(trimmedEmail, password);

    if (error) {
      setIsSubmitting(false);
      setPasswordError(error);
      return;
    }

    // "/" ya no es el home del huésped (es la landing pública del
    // marketplace) — un huésped inicia sesión en la fachada real de Casa
    // Brava, /p/<TENANT_ZERO_SLUG>.
    router.push(role === "admin" ? "/admin" : `/p/${TENANT_ZERO_SLUG}`);
    router.refresh();
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 sm:px-6">
      <div className="flex flex-col items-center text-center">
        <h1 className="text-3xl font-light tracking-wide text-neutral-900">
          Bienvenido a <span className="font-semibold">Parras Home Hub</span>
        </h1>
        <p className="mt-3 text-sm text-neutral-500">
          Inicia sesión en Parras Home Hub: una sola cuenta te abre el
          directorio de hospedaje de Parras y también las estancias exclusivas
          por invitación, como Casa Brava.
        </p>
      </div>

      <div className="mt-8 w-full rounded-2xl border border-neutral-200 bg-white p-8 shadow-lg">
        <form onSubmit={handleSubmit} noValidate className="flex w-full flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-neutral-700">
              Correo electrónico
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError(null);
              }}
              placeholder="tu@correo.com"
              className={`rounded-lg border bg-neutral-50 px-3 py-2 text-sm text-neutral-900 transition-all duration-300 focus:border-transparent focus:outline-none focus:ring-2 ${
                emailError
                  ? "border-red-400 focus:ring-red-500"
                  : "border-neutral-200 focus:ring-neutral-900"
              }`}
            />
            {emailError && <p className="text-xs text-red-600">{emailError}</p>}
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-neutral-700">
              Contraseña
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError(null);
              }}
              placeholder="••••••••"
              className={`rounded-lg border bg-neutral-50 px-3 py-2 text-sm text-neutral-900 transition-all duration-300 focus:border-transparent focus:outline-none focus:ring-2 ${
                passwordError
                  ? "border-red-400 focus:ring-red-500"
                  : "border-neutral-200 focus:ring-neutral-900"
              }`}
            />
            {passwordError && (
              <p className="text-xs text-red-600">{passwordError}</p>
            )}
          </label>

          {/* Debajo del campo de contraseña y alineado a la derecha: el lugar
              convencional para esta acción, donde la persona ya está mirando
              cuando se da cuenta de que no la recuerda. */}
          <div className="-mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => setIsPasswordHelpOpen(true)}
              className="rounded text-xs font-medium text-neutral-500 underline-offset-2 transition-colors hover:text-neutral-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 rounded-full bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-300 ease-in-out enabled:hover:bg-neutral-700 enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Ingresando…" : "Ingresar"}
          </button>
        </form>
      </div>

      <p className="mt-4 text-center text-xs text-neutral-400">
        (Tip para demo: usa admin@test.com para ver el Panel de Control PHH)
      </p>

      <p className="mt-6 text-center text-xs text-neutral-400">
        ¿Aún no tienes cuenta?{" "}
        <Link href="/register" className="font-medium text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline">
          Regístrate en Parras Home Hub
        </Link>
        . Para una propiedad por invitación, pídele el acceso a tu anfitrión.
      </p>

      {isPasswordHelpOpen && <PasswordHelpModal onClose={() => setIsPasswordHelpOpen(false)} />}
    </div>
  );
}
