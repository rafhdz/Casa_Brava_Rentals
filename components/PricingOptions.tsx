import type { FareOption, FareType } from "@/lib/mock-data";

type PricingOptionsProps = {
  options: FareOption[];
  selected: FareType;
  onSelect: (value: FareType) => void;
};

export default function PricingOptions({ options, selected, onSelect }: PricingOptionsProps) {
  return (
    <div className="flex flex-col gap-3">
      {options.map((option) => (
        <label
          key={option.id}
          className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${
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
            className="mt-1 h-4 w-4 accent-neutral-900"
          />
          <span>
            <span className="block text-sm font-semibold text-neutral-900">
              {option.title}
              {option.surchargePercent > 0 && (
                <span className="ml-2 font-normal text-neutral-500">
                  (+{option.surchargePercent}%)
                </span>
              )}
            </span>
            <span className="block text-sm text-neutral-500">{option.description}</span>
          </span>
        </label>
      ))}
    </div>
  );
}
