import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * Tarjeta de métrica (stat tile) compartida por el Panel de Control PHH
 * (`/admin`), el portal de anfitrión (`/supplier`) y el simulador de Revenue
 * Management.
 *
 * Puramente de presentación y sin `"use client"`: la montan tanto Server
 * Components como Client Components. Recibe los valores **ya formateados**
 * (`formatMoney`, `formatPercent`): el cálculo vive en lib/, nunca aquí.
 */
export default function KpiCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  /** Contexto de la cifra: base del cálculo, periodo o supuesto. */
  detail?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
        {Icon && <Icon className="h-4 w-4 shrink-0 text-neutral-400" strokeWidth={1.75} aria-hidden />}
      </div>
      <p className="mt-2 break-words text-2xl font-semibold text-neutral-900">{value}</p>
      {detail && <p className="mt-1 text-xs leading-relaxed text-neutral-500">{detail}</p>}
    </div>
  );
}
