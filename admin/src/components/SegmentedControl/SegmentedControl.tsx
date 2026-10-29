import { useId } from "react";

export interface SegmentedControlOption {
  value: string;
  label: string;
}

export interface SegmentedControlProps {
  /** Names the group for screen readers, e.g. "View". */
  label: string;
  options: readonly SegmentedControlOption[];
  /** The `value` of the chosen option. */
  value: string;
  onChange: (value: string) => void;
}

/**
 * Picks one of a few options, shown side by side (for example Editor or
 * Preview). Each segment is a radio button underneath, so the arrow keys and
 * screen readers work without extra code.
 */
export function SegmentedControl({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps) {
  const name = useId();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className=":uno: flex w-full gap-1 rounded-full border border-solid border-line bg-surface p-1 shadow"
    >
      {options.map((option) => (
        <label key={option.value} className=":uno: flex-1">
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={option.value === value}
            onChange={() => onChange(option.value)}
            className=":uno: peer sr-only"
          />
          {/* One whole string, so the checked and focus styles are found and hashed. */}
          <span className=":uno: block cursor-pointer rounded-full px-4 py-2 text-center text-sm font-bold text-text transition-colors hover:bg-subtle peer-checked:bg-accent peer-checked:text-on-accent peer-checked:hover:bg-accent-hover peer-focus-visible:[outline:2px_solid_var(--accent)] peer-focus-visible:outline-offset-2">
            {option.label}
          </span>
        </label>
      ))}
    </div>
  );
}
