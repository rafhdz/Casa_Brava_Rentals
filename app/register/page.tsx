"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Ladas de ejemplo para el prototipo — no vive en lib/mock-data.ts porque no es un dato de
// negocio (precio/amenidad/servicio), es configuración fija del propio input de teléfono.
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

export default function RegisterPage() {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [apellidoPaterno, setApellidoPaterno] = useState("");
  const [apellidoMaterno, setApellidoMaterno] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState(COUNTRY_CODES[0].dial);
  const [phoneNumber, setPhoneNumber] = useState("");

  const [nombreError, setNombreError] = useState<string | null>(null);
  const [apellidoPaternoError, setApellidoPaternoError] = useState<string | null>(null);
  const [apellidoMaternoError, setApellidoMaternoError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => router.push("/login"), 2000);
    return () => clearTimeout(timer);
  }, [success, router]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

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

    if (!trimmedApellidoMaterno) {
      setApellidoMaternoError("El apellido materno es obligatorio.");
      hasError = true;
    } else {
      setApellidoMaternoError(null);
    }

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

    if (hasError) return;

    // Mock: no se guarda en Supabase ni en la sesión — solo simula el registro exitoso.
    // La creación real de cuentas llegará con Supabase Auth (ver CLAUDE.md).
    setSuccess(true);
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
        {success && (
          <p className="mb-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
            Registro completado con éxito. Redirigiendo...
          </p>
        )}

        <form onSubmit={handleSubmit} noValidate className="flex w-full flex-col gap-4">
          <fieldset disabled={success} className="flex w-full flex-col gap-4">
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
              <span className="text-sm font-medium text-neutral-700">Apellido Materno</span>
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

            <button
              type="submit"
              className="mt-2 rounded-full bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-300 ease-in-out enabled:hover:bg-neutral-700 enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {success ? "Redirigiendo..." : "Registrarse"}
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
