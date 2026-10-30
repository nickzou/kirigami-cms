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
  const count = options.length;
  const index = options.findIndex((option) => option.value === value);
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className=":uno: relative isolate flex w-full gap-1 rounded-full border border-solid border-line bg-surface p-1 shadow"
    >
      {/* The highlight: one shape that slides to the chosen segment. Its size
          and place follow from how many segments there are and which is chosen
          (each segment is an equal share, with a 0.25rem gap), so they are set
          here. It sits behind the labels (-z-10) inside this control's own
          stacking context (isolate). */}
      {index >= 0 && (
        <span
          aria-hidden="true"
          className=":uno: absolute top-1 bottom-1 left-1 -z-10 rounded-full bg-accent transition-transform duration-200 ease-[ease-in-out] motion-reduce:transition-none"
          style={{
            width: `calc((100% - 0.5rem - ${(count - 1) * 0.25}rem) / ${count})`,
            transform: `translateX(calc(${index} * (100% + 0.25rem)))`,
          }}
        />
      )}
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
          <span className=":uno: block cursor-pointer rounded-full px-4 py-2 text-center text-sm font-bold text-text transition-colors duration-200 ease-[ease-in-out] hover:bg-subtle peer-checked:text-on-accent peer-checked:hover:bg-transparent motion-reduce:transition-none peer-focus-visible:[outline:2px_solid_var(--accent)] peer-focus-visible:outline-offset-2">
            {option.label}
          </span>
        </label>
      ))}
    </div>
  );
}
