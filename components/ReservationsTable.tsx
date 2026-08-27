import type { MockReservation } from "@/lib/mock-data";

function StatusBadge({ estado }: { estado: MockReservation["estado"] }) {
  const styles: Record<MockReservation["estado"], string> = {
    actual: "bg-green-100 text-green-700",
    futura: "bg-blue-100 text-blue-700",
    pasada: "bg-neutral-100 text-neutral-500",
  };
  const labels: Record<MockReservation["estado"], string> = {
    actual: "Actual",
    futura: "Futura",
    pasada: "Pasada",
  };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[estado]}`}>
      {labels[estado]}
    </span>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-CR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ReservationsTable({ reservations }: { reservations: MockReservation[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
            <th className="px-4 py-3 font-medium">Huésped</th>
            <th className="px-4 py-3 font-medium">Fechas</th>
            <th className="px-4 py-3 font-medium">Monto</th>
            <th className="px-4 py-3 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody>
          {reservations.map((reservation) => (
            <tr key={reservation.id} className="border-b border-neutral-100 last:border-0">
              <td className="px-4 py-3 font-medium text-neutral-900">{reservation.huespedName}</td>
              <td className="px-4 py-3 text-neutral-600">
                {formatDate(reservation.fechaCheckIn)} – {formatDate(reservation.fechaCheckOut)}
              </td>
              <td className="px-4 py-3 text-neutral-600">${reservation.montoTotal.toFixed(2)}</td>
              <td className="px-4 py-3">
                <StatusBadge estado={reservation.estado} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
