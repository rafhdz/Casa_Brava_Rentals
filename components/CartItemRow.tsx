import type { CartItem } from "@/lib/cart-types";
import { formatSimulatedDate, formatTimeSlot } from "@/lib/format";

function renderTitle(item: CartItem): string {
  switch (item.serviceType) {
    case "spa":
      return `Masaje con ${item.details.masseuseName}`;
    case "comida":
      return `${item.details.mealType} — ${item.details.menuOptionName}`;
    case "vinos":
      return "Pedido de vinos";
  }
}

function renderDetails(item: CartItem): string {
  switch (item.serviceType) {
    case "spa":
      return `${formatSimulatedDate(item.details.day)} · ${formatTimeSlot(item.details.time)}`;
    case "comida": {
      const guests = item.details.guests;
      return `${formatSimulatedDate(item.details.day)} · ${guests} persona${guests !== 1 ? "s" : ""}`;
    }
    case "vinos": {
      const parts = item.details.bottles.map((b) => `${b.quantity}x ${b.bottleName}`);
      if (item.details.packageQuantity > 0) {
        parts.push(`${item.details.packageQuantity}x Paquete de 4 vinos`);
      }
      return parts.join(", ");
    }
  }
}

export default function CartItemRow({
  item,
  onRemove,
}: {
  item: CartItem;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-4">
      <div>
        <p className="text-sm font-semibold text-neutral-900">{renderTitle(item)}</p>
        <p className="mt-1 text-sm text-neutral-500">{renderDetails(item)}</p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <p className="text-sm font-semibold text-neutral-900">${item.totalPrice.toFixed(2)}</p>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="text-xs font-medium text-red-600 transition-colors duration-200 ease-in-out hover:text-red-700 hover:underline"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}
