"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { Sparkles, Utensils, Wine } from "lucide-react";
import { toast } from "sonner";
import type { Enums } from "@/lib/database.types";
import {
  createReservation,
  deleteReservation,
  updateReservation,
  type CreateReservationInput,
  type FareTypeOption,
  type GuestOption,
  type PropertySettingsSummary,
  type ReservationWithRelations,
} from "@/app/admin/reservations/actions";

type ReservationStatus = Enums<"reservation_status">;
type PaymentStatus = Enums<"payment_status_type">;

function formatFullName(person: {
  first_name: string;
  apellido_paterno: string;
  apellido_materno: string | null;
}): string {
  return [person.first_name, person.apellido_paterno, person.apellido_materno].filter(Boolean).join(" ");
}

// new Date(`${value}T00:00:00`) en vez de new Date(value): mismo truco que
// formatSimulatedDate en lib/mock-data.ts para evitar el bug de zona horaria
// de new Date("yyyy-MM-dd") (se interpreta en UTC y puede desfasar un día
// según el navegador) — ver CLAUDE.md, sección Calendar.tsx.
function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString("es-CR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
  finalizada: "Finalizada",
};

const RESERVATION_STATUS_CLASSES: Record<ReservationStatus, string> = {
  pendiente: "bg-amber-100 text-amber-700",
  confirmada: "bg-green-100 text-green-700",
  cancelada: "bg-red-100 text-red-700",
  finalizada: "bg-neutral-100 text-neutral-500",
};

function ReservationStatusBadge({ status }: { status: ReservationStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${RESERVATION_STATUS_CLASSES[status]}`}
    >
      {RESERVATION_STATUS_LABELS[status]}
    </span>
  );
}

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pendiente: "Pendiente",
  parcial: "Parcial",
  completado: "Completado",
  reembolsado: "Reembolsado",
};

const PAYMENT_STATUS_CLASSES: Record<PaymentStatus, string> = {
  pendiente: "bg-amber-100 text-amber-700",
  parcial: "bg-blue-100 text-blue-700",
  completado: "bg-green-100 text-green-700",
  reembolsado: "bg-purple-100 text-purple-700",
};

function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${PAYMENT_STATUS_CLASSES[status]}`}
    >
      {PAYMENT_STATUS_LABELS[status]}
    </span>
  );
}

// Indicadores compactos de servicios adicionales contratados (SPA/Comida/
// Vinos) para la columna "Servicios" de la tabla — cada ícono lleva su propio
// `title` (tooltip nativo) en vez de una etiqueta de texto, para no ensanchar
// la columna. Solo se evalúa si el arreglo correspondiente tiene elementos
// (length > 0); el conteo exacto no se muestra aquí, ver el detalle día por
// día en el registro de cada servicio si se necesita a futuro.
function ServicesIndicators({
  spaBookings,
  foodBookings,
  wineOrders,
}: {
  spaBookings: { id: string }[];
  foodBookings: { id: string }[];
  wineOrders: { id: string }[];
}) {
  const hasSpa = spaBookings.length > 0;
  const hasFood = foodBookings.length > 0;
  const hasWine = wineOrders.length > 0;

  if (!hasSpa && !hasFood && !hasWine) {
    return <span className="text-neutral-400">—</span>;
  }

  return (
    <div className="flex items-center gap-1.5 text-neutral-600">
      {hasSpa && (
        <span title="SPA / Masajes">
          <Sparkles className="h-4 w-4" aria-label="SPA / Masajes" />
        </span>
      )}
      {hasFood && (
        <span title="Comida">
          <Utensils className="h-4 w-4" aria-label="Comida" />
        </span>
      )}
      {hasWine && (
        <span title="Vinos">
          <Wine className="h-4 w-4" aria-label="Vinos" />
        </span>
      )}
    </div>
  );
}

const INPUT_CLASS =
  "rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 transition-all duration-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-neutral-900";

const PRIMARY_BUTTON_CLASS =
  "rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white transition-all duration-300 ease-in-out enabled:hover:bg-neutral-700 enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-60";

const SECONDARY_BUTTON_CLASS =
  "rounded-full px-4 py-2 text-sm font-medium text-neutral-600 transition-all duration-300 ease-in-out hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-60";

const DANGER_BUTTON_CLASS =
  "rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white transition-all duration-300 ease-in-out enabled:hover:bg-red-700 enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-60";

// Mismo patrón que UsersTable.tsx: listener nativo nada de derivar el cierre
// desde estado.
function useCloseOnEscape(onClose: () => void) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
}

type ServiceLine = {
  key: string;
  label: string;
  amount: number;
};

// Desglose de costos del modal de edición: aplana spa_bookings/food_bookings/
// wine_orders (con sus items) a una lista plana de líneas de recibo. Todos
// los montos (`price_per_hour`, `total_price`, `unit_price`) son columnas
// reales insertadas en el checkout del huésped (ver app/actions/checkout.ts)
// — snapshots del precio al momento de la compra, no se recalculan aquí a
// partir del precio actual del catálogo.
function buildServiceLines(reservation: ReservationWithRelations): ServiceLine[] {
  const spaLines: ServiceLine[] = reservation.spa_bookings.map((booking) => ({
    key: `spa-${booking.id}`,
    label: `Masaje — ${booking.masseuse?.name ?? "Masajista"} (${formatDate(booking.date)})`,
    amount: booking.price_per_hour,
  }));

  const foodLines: ServiceLine[] = reservation.food_bookings.map((booking) => ({
    key: `food-${booking.id}`,
    label: `${booking.menu?.name ?? "Menú"} — ${booking.meal_type} (x${booking.guests_count})`,
    amount: booking.total_price,
  }));

  const wineLines: ServiceLine[] = reservation.wine_orders.flatMap((order) =>
    order.items.map((item) => ({
      key: `wine-${item.id}`,
      label: item.wine
        ? `Vino ${item.wine.name} (x${item.quantity})`
        : `Paquete ${item.package?.name ?? "de vinos"} (x${item.quantity})`,
      amount: item.unit_price * item.quantity,
    }))
  );

  return [...spaLines, ...foodLines, ...wineLines];
}

// Sección visual de solo lectura dentro de EditReservationModal — no forma
// parte del <form> de status/payment_status, solo da contexto de a qué
// corresponde el monto total antes de que el admin edite el estado.
function ServiceBreakdown({ reservation }: { reservation: ReservationWithRelations }) {
  const serviceLines = buildServiceLines(reservation);
  const servicesSubtotal = serviceLines.reduce((sum, line) => sum + line.amount, 0);
  const grandTotal = reservation.total_amount + servicesSubtotal;

  return (
    <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
      <h3 className="text-sm font-semibold text-neutral-900">Desglose de servicios contratados</h3>

      {serviceLines.length === 0 ? (
        <p className="mt-2 text-xs text-neutral-400">Sin servicios adicionales contratados.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-1.5">
          {serviceLines.map((line) => (
            <li key={line.key} className="flex items-baseline justify-between gap-4 text-xs text-neutral-600">
              <span className="truncate">{line.label}</span>
              <span className="shrink-0 tabular-nums text-neutral-900">${line.amount.toFixed(2)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-col gap-1 border-t border-neutral-200 pt-3">
        <div className="flex justify-between text-xs text-neutral-600">
          <span>Estadía</span>
          <span className="tabular-nums">${reservation.total_amount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs text-neutral-600">
          <span>Subtotal servicios</span>
          <span className="tabular-nums">${servicesSubtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm font-semibold text-neutral-900">
          <span>Gran total</span>
          <span className="tabular-nums">${grandTotal.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

function EditReservationModal({
  reservation,
  onClose,
  onSave,
  isPending,
}: {
  reservation: ReservationWithRelations;
  onClose: () => void;
  onSave: (updates: { status: ReservationStatus; payment_status: PaymentStatus }) => void;
  isPending: boolean;
}) {
  const [status, setStatus] = useState<ReservationStatus>(reservation.status);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(reservation.payment_status);

  useCloseOnEscape(onClose);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSave({ status, payment_status: paymentStatus });
  }

  const guestName = reservation.guest ? formatFullName(reservation.guest) : "Huésped no disponible";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm [animation:fade-in_200ms_ease-out]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-reservation-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl [animation:modal-in_200ms_ease-out]"
      >
        <h2 id="edit-reservation-modal-title" className="text-lg font-semibold text-neutral-900">
          Editar reservación
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Actualiza el estado y el estado de pago de la reservación de {guestName}.
        </p>
        <p className="mt-2 text-xs text-neutral-400">
          {formatDate(reservation.check_in)} – {formatDate(reservation.check_out)}
          {reservation.fare_type && ` · ${reservation.fare_type.name}`}
        </p>

        <ServiceBreakdown reservation={reservation} />

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-neutral-700">Estado</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ReservationStatus)}
                className={INPUT_CLASS}
              >
                <option value="pendiente">Pendiente</option>
                <option value="confirmada">Confirmada</option>
                <option value="cancelada">Cancelada</option>
                <option value="finalizada">Finalizada</option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-neutral-700">Pago</span>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                className={INPUT_CLASS}
              >
                <option value="pendiente">Pendiente</option>
                <option value="parcial">Parcial</option>
                <option value="completado">Completado</option>
                <option value="reembolsado">Reembolsado</option>
              </select>
            </label>
          </div>

          <div className="mt-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={isPending} className={SECONDARY_BUTTON_CLASS}>
              Cancelar
            </button>
            <button type="submit" disabled={isPending} className={PRIMARY_BUTTON_CLASS}>
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateReservationModal({
  guests,
  fareTypes,
  propertySettings,
  onClose,
  onCreate,
  isPending,
}: {
  guests: GuestOption[];
  fareTypes: FareTypeOption[];
  propertySettings: PropertySettingsSummary;
  onClose: () => void;
  onCreate: (data: CreateReservationInput) => void;
  isPending: boolean;
}) {
  const [guestId, setGuestId] = useState(guests[0]?.id ?? "");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [fareTypeId, setFareTypeId] = useState(fareTypes[0]?.id ?? "");
  const [status, setStatus] = useState<ReservationStatus>("pendiente");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("pendiente");
  // null hasta que el admin toca el campo a mano; a partir de ahí se
  // "congela" en ese valor y deja de recalcularse aunque cambien
  // fechas/tarifa después. Derivado inline en cada render (ver totalAmount
  // abajo) — sin useEffect/setState, para no chocar con la regla de lint
  // react-hooks/set-state-in-effect ya documentada en CLAUDE.md.
  const [manualTotalAmount, setManualTotalAmount] = useState<number | null>(null);

  useCloseOnEscape(onClose);

  const selectedFareType = fareTypes.find((fareType) => fareType.id === fareTypeId);
  const nights =
    checkIn && checkOut
      ? Math.max(0, differenceInCalendarDays(parseISO(checkOut), parseISO(checkIn)))
      : 0;
  // Misma fórmula que components/BookingSummary.tsx, para que el total
  // sugerido coincida con el que vería un huésped reservando por su cuenta.
  const subtotal = nights * propertySettings.nightly_rate;
  const surcharge = subtotal * ((selectedFareType?.surcharge_percentage ?? 0) / 100);
  const computedTotal = subtotal + surcharge + propertySettings.security_deposit;
  const totalAmount = manualTotalAmount ?? computedTotal;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onCreate({
      guest_id: guestId,
      check_in: checkIn,
      check_out: checkOut,
      fare_type_id: fareTypeId,
      total_amount: totalAmount,
      status,
      payment_status: paymentStatus,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm [animation:fade-in_200ms_ease-out]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-reservation-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl [animation:modal-in_200ms_ease-out]"
      >
        <h2 id="create-reservation-modal-title" className="text-lg font-semibold text-neutral-900">
          Crear reservación
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Casa Brava. El monto se calcula solo a partir de las fechas y la tarifa, pero puedes ajustarlo a
          mano.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-neutral-700">Huésped</span>
            <select
              value={guestId}
              onChange={(e) => setGuestId(e.target.value)}
              required
              className={INPUT_CLASS}
            >
              {guests.map((guest) => (
                <option key={guest.id} value={guest.id}>
                  {formatFullName(guest)} ({guest.email})
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-neutral-700">Check-in</span>
              <input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                required
                className={INPUT_CLASS}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-neutral-700">Check-out</span>
              <input
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                required
                className={INPUT_CLASS}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-neutral-700">Tarifa</span>
            <select
              value={fareTypeId}
              onChange={(e) => setFareTypeId(e.target.value)}
              required
              className={INPUT_CLASS}
            >
              {fareTypes.map((fareType) => (
                <option key={fareType.id} value={fareType.id}>
                  {fareType.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-neutral-700">
              Monto total
              {nights > 0 && (
                <span className="font-normal text-neutral-400">
                  {" "}
                  ({nights} noche{nights !== 1 ? "s" : ""})
                </span>
              )}
            </span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={totalAmount}
              onChange={(e) => setManualTotalAmount(Number(e.target.value))}
              required
              className={INPUT_CLASS}
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-neutral-700">Estado</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ReservationStatus)}
                className={INPUT_CLASS}
              >
                <option value="pendiente">Pendiente</option>
                <option value="confirmada">Confirmada</option>
                <option value="cancelada">Cancelada</option>
                <option value="finalizada">Finalizada</option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-neutral-700">Pago</span>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                className={INPUT_CLASS}
              >
                <option value="pendiente">Pendiente</option>
                <option value="parcial">Parcial</option>
                <option value="completado">Completado</option>
                <option value="reembolsado">Reembolsado</option>
              </select>
            </label>
          </div>

          <div className="mt-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={isPending} className={SECONDARY_BUTTON_CLASS}>
              Cancelar
            </button>
            <button type="submit" disabled={isPending} className={PRIMARY_BUTTON_CLASS}>
              Crear reservación
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteReservationModal({
  reservation,
  onClose,
  onConfirm,
  isPending,
}: {
  reservation: ReservationWithRelations;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  // Doble confirmación en dos pasos dentro del mismo modal — ver CLAUDE.md,
  // "CRUD de reservaciones". Se reinicia solo cada vez que el modal se
  // vuelve a montar (está condicionado en el padre), sin lógica extra.
  const [step, setStep] = useState<1 | 2>(1);
  useCloseOnEscape(onClose);

  const guestName = reservation.guest ? formatFullName(reservation.guest) : "este huésped";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm [animation:fade-in_200ms_ease-out]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-reservation-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl [animation:modal-in_200ms_ease-out]"
      >
        <h2 id="delete-reservation-modal-title" className="text-lg font-semibold text-neutral-900">
          Eliminar reservación
        </h2>

        {step === 1 ? (
          <>
            <p className="mt-2 text-sm text-neutral-600">
              ¿Eliminar la reservación de <span className="font-medium text-neutral-900">{guestName}</span>{" "}
              ({formatDate(reservation.check_in)} – {formatDate(reservation.check_out)})?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={onClose} className={SECONDARY_BUTTON_CLASS}>
                Cancelar
              </button>
              <button type="button" onClick={() => setStep(2)} className={PRIMARY_BUTTON_CLASS}>
                Continuar
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-neutral-600">
              Última confirmación: la reservación dejará de aparecer en esta lista. Se conserva en el
              historial (junto con sus servicios adicionales de SPA, comida y vinos) pero esta acción no se
              puede deshacer desde la interfaz.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={isPending}
                className={SECONDARY_BUTTON_CLASS}
              >
                Atrás
              </button>
              <button type="button" onClick={onConfirm} disabled={isPending} className={DANGER_BUTTON_CLASS}>
                Sí, eliminar reserva
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ReservationsTable({
  reservations,
  guests,
  fareTypes,
  propertySettings,
}: {
  reservations: ReservationWithRelations[];
  guests: GuestOption[];
  fareTypes: FareTypeOption[];
  propertySettings: PropertySettingsSummary;
}) {
  const [selectedReservation, setSelectedReservation] = useState<ReservationWithRelations | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [reservationToDelete, setReservationToDelete] = useState<ReservationWithRelations | null>(null);
  const [isUpdatePending, startUpdateTransition] = useTransition();
  const [isCreatePending, startCreateTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();

  const canCreate = guests.length > 0 && fareTypes.length > 0;

  function handleEditClick(reservation: ReservationWithRelations) {
    setSelectedReservation(reservation);
  }

  function handleCloseEditModal() {
    setSelectedReservation(null);
  }

  function handleSaveReservation(updates: { status: ReservationStatus; payment_status: PaymentStatus }) {
    if (!selectedReservation) return;
    const reservationId = selectedReservation.id;

    startUpdateTransition(async () => {
      const result = await updateReservation(reservationId, updates);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      handleCloseEditModal();
      toast.success("Reservación actualizada correctamente.");
    });
  }

  function handleOpenCreateModal() {
    setIsCreateModalOpen(true);
  }

  function handleCloseCreateModal() {
    setIsCreateModalOpen(false);
  }

  function handleCreateReservation(data: CreateReservationInput) {
    startCreateTransition(async () => {
      const result = await createReservation(data);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      handleCloseCreateModal();
      toast.success("Reservación creada correctamente.");
    });
  }

  function handleDeleteClick(reservation: ReservationWithRelations) {
    setReservationToDelete(reservation);
  }

  function handleCloseDeleteModal() {
    setReservationToDelete(null);
  }

  function handleConfirmDelete() {
    if (!reservationToDelete) return;
    const reservationId = reservationToDelete.id;

    startDeleteTransition(async () => {
      const result = await deleteReservation(reservationId);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      handleCloseDeleteModal();
      toast.success("Reservación eliminada correctamente.");
    });
  }

  return (
    <>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleOpenCreateModal}
          disabled={!canCreate}
          title={
            canCreate ? undefined : "Se necesita al menos un huésped y una tarifa para crear una reservación"
          }
          className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 ease-in-out enabled:hover:bg-neutral-700 enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Crear reservación
        </button>
      </div>

      <div className="block w-full max-w-full overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
              <th className="min-w-[200px] px-4 py-3 font-medium">Huésped</th>
              <th className="min-w-[180px] whitespace-nowrap px-4 py-3 font-medium">Fechas</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">Tarifa</th>
              <th className="min-w-[110px] whitespace-nowrap px-4 py-3 font-medium">Servicios</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">Monto</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">Estado</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">Pago</th>
              <th className="min-w-[160px] whitespace-nowrap px-4 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {reservations.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-sm text-neutral-500">
                  Todavía no hay reservaciones registradas.
                </td>
              </tr>
            ) : (
              reservations.map((reservation) => (
                <tr key={reservation.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium text-neutral-900">
                      {reservation.guest ? formatFullName(reservation.guest) : "Huésped no disponible"}
                    </div>
                    {reservation.guest && (
                      <div className="text-xs text-neutral-500">{reservation.guest.email}</div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-neutral-600">
                    {formatDate(reservation.check_in)} – {formatDate(reservation.check_out)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-neutral-600">
                    {reservation.fare_type?.name ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <ServicesIndicators
                      spaBookings={reservation.spa_bookings}
                      foodBookings={reservation.food_bookings}
                      wineOrders={reservation.wine_orders}
                    />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-neutral-600">
                    ${reservation.total_amount.toFixed(2)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <ReservationStatusBadge status={reservation.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <PaymentStatusBadge status={reservation.payment_status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditClick(reservation)}
                        className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 transition-all duration-300 ease-in-out hover:border-neutral-900 hover:text-neutral-900 active:scale-95"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(reservation)}
                        className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-600 transition-all duration-300 ease-in-out hover:border-red-600 hover:bg-red-50 active:scale-95"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedReservation && (
        <EditReservationModal
          reservation={selectedReservation}
          onClose={handleCloseEditModal}
          onSave={handleSaveReservation}
          isPending={isUpdatePending}
        />
      )}

      {isCreateModalOpen && (
        <CreateReservationModal
          guests={guests}
          fareTypes={fareTypes}
          propertySettings={propertySettings}
          onClose={handleCloseCreateModal}
          onCreate={handleCreateReservation}
          isPending={isCreatePending}
        />
      )}

      {reservationToDelete && (
        <DeleteReservationModal
          reservation={reservationToDelete}
          onClose={handleCloseDeleteModal}
          onConfirm={handleConfirmDelete}
          isPending={isDeletePending}
        />
      )}
    </>
  );
}
