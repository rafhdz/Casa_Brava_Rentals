import { Lock } from "lucide-react";
import InviteCodeForm from "@/components/InviteCodeForm";
import PropertyDirectory from "@/components/PropertyDirectory";
import { PROPERTIES } from "@/lib/mock/marketplace-data";

// Landing territorial pública de Parras Home Hub. Sin fetch de servidor: el
// directorio es 100% mock (ver lib/mock/marketplace-data.ts) porque el
// backend real (Django) todavía solo conoce una propiedad — Casa Brava, cuya
// fachada real vive en app/p/[slug]/page.tsx bajo /p/casa-brava, no aquí.
export default function HomePage() {
  const inviteOnlyProperties = PROPERTIES.filter((property) => property.accessType === "INVITE_ONLY");

  return (
    <div className="flex flex-col">
      <section className="border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 pt-16 text-center sm:px-6 sm:pt-24">
          <h1 className="text-3xl font-semibold text-neutral-900 sm:text-5xl">
            Te ofrecemos una puerta a uno de los destinos turísticos más
            importantes del Norte del país
          </h1>
          <p className="max-w-2xl text-base text-neutral-600 sm:text-lg">
            Hospedaje curado en Parras de la Fuente, Coahuila — cuna del vino
            mexicano. Casas abiertas al público y residencias exclusivas de
            acceso por invitación, en un mismo directorio.
          </p>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pb-24">
          <PropertyDirectory properties={PROPERTIES} />
        </div>
      </section>

      {inviteOnlyProperties.length > 0 && (
        <section className="border-t border-neutral-200 bg-neutral-50">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-14 text-center sm:px-6">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900 text-white">
              <Lock className="h-5 w-5" strokeWidth={2} aria-hidden />
            </span>
            <h2 className="text-xl font-semibold text-neutral-900 sm:text-2xl">
              ¿Ya tienes acceso a una residencia exclusiva?
            </h2>
            <p className="max-w-xl text-sm text-neutral-600">
              Algunas propiedades de Parras Home Hub son de acceso privado.
              Si un anfitrión te compartió un código de invitación, canjéalo
              aquí para ir directo a su propiedad.
            </p>
            <div className="w-full max-w-md">
              <InviteCodeForm variant="callout" />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
