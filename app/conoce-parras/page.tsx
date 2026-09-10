const SECTIONS = [
  {
    title: "Enoturismo",
    description:
      "Parras es la cuna del vino mexicano: alberga la vinícola más antigua de América, en operación continua desde 1597. Recorridos, catas y vendimias son el corazón de la experiencia local.",
  },
  {
    title: "Viñedos tradicionales",
    description:
      "Entre huertas de nogal y viñedos familiares, la región conserva un sistema de acequias centenario que sigue regando los cultivos que dan de comer y de beber al pueblo.",
  },
  {
    title: "Clima",
    description:
      "Semidesértico y templado casi todo el año, con veranos cálidos y noches frescas — ideal para caminar el centro histórico o pasar la tarde en una terraza al aire libre.",
  },
  {
    title: "Patrimonio histórico",
    description:
      "Fundado en 1598, el centro de Parras conserva su arquitectura colonial, plazas arboladas y una vida cultural activa alrededor de sus fiestas de la vendimia.",
  },
];

export default function ConoceParrasPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-14 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 sm:text-3xl">
          Conoce Parras de la Fuente
        </h1>
        <p className="mt-3 text-sm text-neutral-600 sm:text-base">
          Uno de los destinos turísticos más importantes del norte de México,
          en el sureste de Coahuila. Un pueblo mágico donde el vino, la
          historia y el paisaje semidesértico conviven a pocas cuadras de
          distancia.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {SECTIONS.map((section) => (
          <div key={section.title} className="rounded-2xl border border-neutral-200 bg-white p-6">
            <h2 className="text-base font-semibold text-neutral-900">{section.title}</h2>
            <p className="mt-2 text-sm text-neutral-500">{section.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
