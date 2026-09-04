"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { registerAction } from "@/app/actions/auth";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

// Ladas de ejemplo para el prototipo — no es un dato de negocio (precio/amenidad/servicio)
// que deba vivir en la base de datos, es configuración fija del propio input de teléfono.
const COUNTRY_CODES = [
  { dial: "+52", label: "México (+52)" },
  { dial: "+1", label: "USA/Canadá (+1)" },
  { dial: "+34", label: "España (+34)" },
  { dial: "+54", label: "Argentina (+54)" },
];

const inputClassName = (hasError: boolean) =>
  `rounded-lg border bg-neutral-50 px-3 py-2 text-sm text-neutral-900 transition-all duration-300 focus:border-transparent focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
    hasError
      ? "border-red-400 focus:ring-red-500"
      : "border-neutral-200 focus:ring-neutral-900"
  }`;

// Los mensajes de error los redacta el backend (correo duplicado, contraseña
// demasiado común o corta, etc.) y llegan ya en español desde la Server
// Action, así que aquí no hay tabla de traducción: se muestran tal cual.

export default function RegisterPage() {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [apellidoPaterno, setApellidoPaterno] = useState("");
  const [apellidoMaterno, setApellidoMaterno] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState(COUNTRY_CODES[0].dial);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [nombreError, setNombreError] = useState<string | null>(null);
  const [apellidoPaternoError, setApellidoPaternoError] = useState<string | null>(null);
  const [apellidoMaternoError, setApellidoMaternoError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const trimmedNombre = nombre.trim();
    const trimmedApellidoPaterno = apellidoPaterno.trim();
    const trimmedApellidoMaterno = apellidoMaterno.trim();
    const trimmedEmail = email.trim();
    const trimmedPhoneNumber = phoneNumber.trim();
    let hasError = false;

    if (!trimmedNombre) {
      setNombreError("El nombre es obligatorio.");
      hasError = true;
    } else {
      setNombreError(null);
    }

    if (!trimmedApellidoPaterno) {
      setApellidoPaternoError("El apellido paterno es obligatorio.");
      hasError = true;
    } else {
      setApellidoPaternoError(null);
    }

    // Apellido materno es opcional (coincide con `apellido_materno` nullable
    // en profiles) — a diferencia de nombre/apellido paterno, no se valida
    // como obligatorio.
    setApellidoMaternoError(null);

    if (!trimmedEmail) {
      setEmailError("El correo electrónico es obligatorio.");
      hasError = true;
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      setEmailError("Ingresa un correo electrónico válido (ej. nombre@dominio.com).");
      hasError = true;
    } else {
      setEmailError(null);
    }

    if (!trimmedPhoneNumber) {
      setPhoneError("El teléfono celular es obligatorio.");
      hasError = true;
    } else {
      setPhoneError(null);
    }

    if (!password) {
      setPasswordError("La contraseña es obligatoria.");
      hasError = true;
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      hasError = true;
    } else {
      setPasswordError(null);
    }

    if (!confirmPassword) {
      setConfirmPasswordError("Confirma tu contraseña.");
      hasError = true;
    } else if (confirmPassword !== password) {
      setConfirmPasswordError("Las contraseñas no coinciden.");
      hasError = true;
    } else {
      setConfirmPasswordError(null);
    }

    if (hasError) return;

    setIsSubmitting(true);

    // La cuenta y su perfil son una sola fila en el backend, así que se crean
    // en una sola petición: ya no hay un segundo insert que pueda fallar y
    // dejar un usuario a medias (con cuenta pero sin perfil) ocupando ese
    // correo. La Server Action encadena además el login, para entrar directo
    // sin pasar por /login. El rol siempre es `guest`: el endpoint de registro
    // ni siquiera acepta el campo.
    const result = await registerAction({
      email: trimmedEmail,
      password,
      password_confirm: confirmPassword,
      first_name: trimmedNombre,
      apellido_paterno: trimmedApellidoPaterno,
      apellido_materno: trimmedApellidoMaterno || null,
      phone: `${countryCode} ${trimmedPhoneNumber}`,
    });

    if ("error" in result) {
      setIsSubmitting(false);
      setFormError(result.error);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 sm:px-6">
      <div className="flex flex-col items-center text-center">
        <h1 className="text-3xl font-light tracking-wide text-neutral-900">
          Regístrate en <span className="font-semibold">Casa Brava</span>
        </h1>
        <p className="mt-3 text-sm text-neutral-500">
          Esta pantalla es de acceso exclusivo mediante liga de invitación. Completa tus
          datos para crear tu cuenta.
        </p>
      </div>

      <div className="mt-8 w-full rounded-2xl border border-neutral-200 bg-white p-8 shadow-lg">
        {formError && (
          <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            {formError}
          </p>
        )}

        <form onSubmit={handleSubmit} noValidate className="flex w-full flex-col gap-4">
          <fieldset disabled={isSubmitting} className="flex w-full flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-neutral-700">Nombre(s)</span>
              <input
                type="text"
                autoComplete="given-name"
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value);
                  if (nombreError) setNombreError(null);
                }}
                placeholder="Rafael"
                className={inputClassName(!!nombreError)}
              />
              {nombreError && <p className="text-xs text-red-600">{nombreError}</p>}
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-neutral-700">Apellido Paterno</span>
              <input
                type="text"
                autoComplete="family-name"
                value={apellidoPaterno}
                onChange={(e) => {
                  setApellidoPaterno(e.target.value);
                  if (apellidoPaternoError) setApellidoPaternoError(null);
                }}
                placeholder="Hernández"
                className={inputClassName(!!apellidoPaternoError)}
              />
              {apellidoPaternoError && (
                <p className="text-xs text-red-600">{apellidoPaternoError}</p>
              )}
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-neutral-700">
                Apellido Materno <span className="font-normal text-neutral-400">(opcional)</span>
              </span>
              <input
                type="text"
                autoComplete="additional-name"
                value={apellidoMaterno}
                onChange={(e) => {
                  setApellidoMaterno(e.target.value);
                  if (apellidoMaternoError) setApellidoMaternoError(null);
                }}
                placeholder="Lorenzo"
                className={inputClassName(!!apellidoMaternoError)}
              />
              {apellidoMaternoError && (
                <p className="text-xs text-red-600">{apellidoMaternoError}</p>
              )}
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-neutral-700">Correo electrónico</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                placeholder="tu@invitado.com"
                className={inputClassName(!!emailError)}
              />
              {emailError && <p className="text-xs text-red-600">{emailError}</p>}
            </label>

            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-neutral-700">Teléfono celular</span>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  aria-label="Lada del país"
                  className={`w-28 shrink-0 ${inputClassName(false)}`}
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.dial} value={c.dial}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  autoComplete="tel-national"
                  inputMode="tel"
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    if (phoneError) setPhoneError(null);
                  }}
                  placeholder="55 1234 5678"
                  className={`min-w-0 flex-1 ${inputClassName(!!phoneError)}`}
                />
              </div>
              {phoneError && <p className="text-xs text-red-600">{phoneError}</p>}
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-neutral-700">Contraseña</span>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError(null);
                }}
                placeholder="••••••••"
                className={inputClassName(!!passwordError)}
              />
              {passwordError && <p className="text-xs text-red-600">{passwordError}</p>}
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-neutral-700">Confirmar contraseña</span>
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (confirmPasswordError) setConfirmPasswordError(null);
                }}
                placeholder="••••••••"
                className={inputClassName(!!confirmPasswordError)}
              />
              {confirmPasswordError && (
                <p className="text-xs text-red-600">{confirmPasswordError}</p>
              )}
            </label>

            <button
              type="submit"
              className="mt-2 rounded-full bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-300 ease-in-out enabled:hover:bg-neutral-700 enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Registrando…" : "Registrarse"}
            </button>
          </fieldset>
        </form>
      </div>

      <p className="mt-6 text-center text-xs text-neutral-400">
        ¿Ya tienes cuenta? Inicia sesión en{" "}
        <span className="font-medium text-neutral-500">/login</span>.
      </p>
    </div>
  );
}
