type DateRangeSelectorProps = {
  checkIn: string;
  checkOut: string;
  onCheckInChange: (value: string) => void;
  onCheckOutChange: (value: string) => void;
};

export default function DateRangeSelector({
  checkIn,
  checkOut,
  onCheckInChange,
  onCheckOutChange,
}: DateRangeSelectorProps) {
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-neutral-700">Fecha de llegada</span>
        <input
          type="date"
          min={today}
          value={checkIn}
          onChange={(e) => onCheckInChange(e.target.value)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 transition-all duration-200 ease-in-out focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/15"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-neutral-700">Fecha de salida</span>
        <input
          type="date"
          min={checkIn || today}
          value={checkOut}
          onChange={(e) => onCheckOutChange(e.target.value)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 transition-all duration-200 ease-in-out focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/15"
        />
      </label>
    </div>
  );
}
