import UsersTable from "@/components/UsersTable";
import ReservationsTable from "@/components/ReservationsTable";
import { mockUsers, mockReservations } from "@/lib/mock-data";

export default function AdminPage() {
  const upcomingReservations = mockReservations.filter(
    (reservation) => reservation.estado !== "pasada"
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Panel de administración</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Vista simulada para gestionar usuarios invitados y reservaciones de Casa Brava.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-neutral-900">Usuarios invitados</h2>
        <UsersTable users={mockUsers} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-neutral-900">Reservaciones</h2>
        <ReservationsTable reservations={upcomingReservations} />
      </section>
    </div>
  );
}
