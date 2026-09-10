const PILLARS = [
  {
    title: "Un directorio, no una sola casa",
    description:
      "Parras Home Hub integra propiedades de distintos anfitriones en un mismo lugar — desde residencias abiertas al público hasta casas privadas de acceso exclusivo por invitación.",
  },
  {
    title: "Tecnología compartida, marca propia",
    description:
      "Cada propiedad conserva su identidad y sus reglas de acceso. PHH aporta el motor de reservaciones, pagos y disponibilidad para que cada anfitrión no tenga que construirlo por su cuenta.",
  },
  {
    title: "Pensado para Parras de la Fuente",
    description:
      "No es un marketplace genérico: nace para un destino específico — enoturismo, patrimonio histórico y hospitalidad a escala humana — y crece propiedad por propiedad.",
  },
];

export default function SobreNosotrosPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-14 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 sm:text-3xl">
          Sobre Parras Home Hub
        </h1>
        <p className="mt-3 text-sm text-neutral-600 sm:text-base">
          Somos el integrador tecnológico de hospedaje premium de Parras de la
          Fuente, Coahuila. Nuestra misión es que cualquier anfitrión de la
          región pueda ofrecer una experiencia de reservación tan cuidada como
          la de una sola casa boutique, sin tener que construir su propia
          plataforma desde cero.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {PILLARS.map((pillar) => (
          <div key={pillar.title} className="rounded-2xl border border-neutral-200 bg-white p-6">
            <h2 className="text-base font-semibold text-neutral-900">{pillar.title}</h2>
            <p className="mt-2 text-sm text-neutral-500">{pillar.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
