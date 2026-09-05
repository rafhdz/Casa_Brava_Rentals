type FareTypeOption = {
  id: string;
  name: string;
  surcharge_percentage: number;
};

type PricingOptionsProps = {
  options: FareTypeOption[];
  selected: string;
  onSelect: (value: string) => void;
};

export default function PricingOptions({ options, selected, onSelect }: PricingOptionsProps) {
  return (
    <div className="flex flex-col gap-3">
      {options.map((option) => (
        <label
          key={option.id}
          className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-all duration-200 ease-in-out ${
            selected === option.id
              ? "border-neutral-900 bg-neutral-50"
              : "border-neutral-200 hover:border-neutral-400"
          }`}
        >
          <input
            type="radio"
            name="fare-type"
            value={option.id}
            checked={selected === option.id}
            onChange={() => onSelect(option.id)}
            className="mt-1 h-4 w-4 accent-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/40 focus-visible:ring-offset-2"
          />
          <span>
            <span className="block text-sm font-semibold text-neutral-900">
              {option.name}
              {option.surcharge_percentage > 0 && (
                <span className="ml-2 font-normal text-neutral-500">
                  (+{option.surcharge_percentage}%)
                </span>
              )}
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}
