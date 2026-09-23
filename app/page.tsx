import { Car, CheckCircle2, CloudSun, Eye, EyeOff, Grape, Hourglass, Snowflake, Sparkles, Sun, UtensilsCrossed } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import CommissionComparison from "@/components/CommissionComparison";
import PropertyDirectory from "@/components/PropertyDirectory";
import { PROPERTIES } from "@/lib/mock/marketplace-data";

type SeasonalClimate = { label: string; tempRange: string; Icon: LucideIcon };

// Contenido puramente editorial/ilustrativo del micro-widget del hero — no hay
// integración con una API de clima real (no está configurada ninguna, y el
// proyecto no hace llamadas salientes fuera de lib/api/). Se calcula a partir
// del mes actual, no de datos en vivo, por eso el copy dice "típico" y no
// "en vivo". El ciclo de vendimia (poda → brote → cosecha → reposo) sí
// corresponde al calendario real del viñedo en Parras de la Fuente.
function getVendimiaPhase(monthIndex: number): { label: string; description: string } {
  if (monthIndex >= 6 && monthIndex <= 8) {
    return { label: "Vendimia en curso", description: "Julio–septiembre: cosecha activa en los viñedos de Parras." };
  }
  if (monthIndex === 9) {
    return { label: "Post-vendimia", description: "La uva ya se cosechó; las bodegas inician la fermentación." };
  }
  if (monthIndex >= 10 || monthIndex <= 1) {
    return { label: "Poda de invierno", description: "Las vides descansan mientras se preparan para el siguiente ciclo." };
  }
  return { label: "Brote de primavera", description: "Las vides reverdecen de cara a la próxima vendimia." };
}

function getSeasonalClimate(monthIndex: number): SeasonalClimate {
  if (monthIndex >= 5 && monthIndex <= 8) return { label: "Verano cálido", tempRange: "24–34°C", Icon: Sun };
  if (monthIndex >= 11 || monthIndex <= 1) return { label: "Invierno fresco", tempRange: "4–18°C", Icon: Snowflake };
  return { label: "Clima templado", tempRange: "14–26°C", Icon: CloudSun };
}

const LOCAL_EXPERIENCES: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Car,
    title: "Transporte privado por bodegas enológicas",
    description: "Ruta guiada entre las bodegas históricas de Parras, con chofer dedicado y horarios flexibles.",
  },
  {
    icon: Sparkles,
    title: "Spa botánico en la residencia",
    description: "Circuito de bienestar con insumos locales — sábila, romero y uva — llevado hasta tu propiedad.",
  },
  {
    icon: UtensilsCrossed,
    title: "Cenas maridaje con chef privado",
    description: "Menú de temporada armonizado con vinos de la región, servido en tu propia terraza o jardín.",
  },
];

const REPUTATION_STEPS: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: CheckCircle2,
    title: "Estancia concluida",
    description: "La reservación pasa a estado finalizada al terminar el check-out.",
  },
  {
    icon: Hourglass,
    title: "Ventana de 14 días",
    description: "Huésped y anfitrión tienen dos semanas para escribir su reseña, por separado.",
  },
  {
    icon: EyeOff,
    title: "Reseñas ocultas entre sí",
    description: "Ninguna de las dos partes puede leer lo que escribió la otra mientras tanto.",
  },
  {
    icon: Eye,
    title: "Publicación simultánea",
    description: "Al cerrarse la ventana (o al enviar ambas), las dos reseñas se publican al mismo tiempo.",
  },
];

// Landing territorial pública de Parras Home Hub. Sin fetch de servidor: el
// directorio es 100% mock (ver lib/mock/marketplace-data.ts) porque el
// backend real (Django) todavía solo conoce una propiedad — Casa Brava, cuya
// fachada real vive en app/p/[slug]/page.tsx bajo /p/casa-brava, no aquí.
export default function HomePage() {
  const monthIndex = new Date().getMonth();
  const vendimia = getVendimiaPhase(monthIndex);
  const climate = getSeasonalClimate(monthIndex);
  const ClimateIcon = climate.Icon;

  return (
    <div className="flex flex-col">
      <section className="border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div className="flex flex-col gap-6">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-neutral-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
              <Grape className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
              Cuna del vino en América
            </span>
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl">
              El vino mexicano nació aquí.{" "}
              <span className="text-neutral-400">Tú te hospedas donde nació.</span>
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-neutral-600 sm:text-lg">
              Parras Home Hub reúne las casonas, haciendas y lofts más auténticos de Parras de la Fuente —cuna del
              vino en México— en un solo directorio, con comisiones transparentes y cero cargos ocultos en el
              checkout.
            </p>
          </div>

          <div className="flex flex-col gap-4 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Parras de la Fuente, hoy</p>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
                <ClimateIcon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold text-neutral-900">{climate.label}</p>
                <p className="text-xs text-neutral-500">Temperatura típica de temporada: {climate.tempRange}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 border-t border-neutral-100 pt-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
                <Grape className="h-5 w-5" strokeWidth={1.5} aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold text-neutral-900">{vendimia.label}</p>
                <p className="text-xs text-neutral-500">{vendimia.description}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-8 flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Directorio de propiedades
          </span>
          <h2 className="text-2xl font-semibold text-neutral-900 sm:text-3xl">Encuentra tu residencia en Parras</h2>
        </div>
        <PropertyDirectory properties={PROPERTIES} />
      </section>

      <section className="border-t border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <CommissionComparison />
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Servicios de valor agregado</span>
          <h2 className="text-2xl font-semibold text-neutral-900 sm:text-3xl">Experiencias locales integradas</h2>
          <p className="max-w-2xl text-sm text-neutral-600">
            Servicios que se pueden sumar a una estadía en Parras Home Hub. La disponibilidad real depende de cada
            propiedad y su anfitrión.
          </p>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {LOCAL_EXPERIENCES.map((experience) => (
            <div key={experience.title} className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-900 text-white">
                <experience.icon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
              </span>
              <h3 className="text-base font-semibold text-neutral-900">{experience.title}</h3>
              <p className="text-sm text-neutral-600">{experience.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Confianza y gobernanza</span>
            <h2 className="text-2xl font-semibold text-neutral-900 sm:text-3xl">Protocolo de reputación de doble ciego</h2>
            <p className="max-w-2xl text-sm text-neutral-600">
              Así se protege la honestidad de las reseñas: ninguna de las partes puede leer la reseña de la otra
              antes de publicar la propia.
            </p>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {REPUTATION_STEPS.map((step, index) => (
              <div key={step.title} className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-6">
                <div className="flex items-center justify-between">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-500">
                    {index + 1}
                  </span>
                  <step.icon className="h-4 w-4 text-neutral-400" strokeWidth={1.5} aria-hidden />
                </div>
                <h3 className="text-sm font-semibold text-neutral-900">{step.title}</h3>
                <p className="text-xs leading-relaxed text-neutral-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
