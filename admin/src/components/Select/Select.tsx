import { ChevronDown } from "lucide-react";
import { type ReactNode, type SelectHTMLAttributes, useId } from "react";

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "className" | "id"> {
  /** What the choice is for. Shown above it, unless `id` is given for a label drawn elsewhere. */
  label?: string;
  /** Only when the label is drawn elsewhere (a `<label htmlFor>` of its own), and then no `label` is given. */
  id?: string;
  /** The `<option>`s. */
  children: ReactNode;
}

/**
 * A choice from a list, with its label above it, in the same box as
 * `TextField`. It is the browser's own `<select>` (so the keyboard, screen
 * readers and the phone's picker all work), with the browser's arrow swapped
 * for a chevron that matches the rest of the admin.
 */
export function Select({
  label,
  id: givenId,
  children,
  ...props
}: SelectProps) {
  const ownId = useId();
  const id = givenId ?? ownId;
  return (
    <div>
      {label !== undefined && (
        <label htmlFor={id} className=":uno: block font-bold">
          {label}
        </label>
      )}
      <div
        className={
          label !== undefined ? ":uno: relative mt-1" : ":uno: relative"
        }
      >
        <select
          id={id}
          {...props}
          className=":uno: block w-full cursor-pointer appearance-none rounded border border-solid border-line bg-bg py-2.5 pr-10 pl-3 text-text transition-colors duration-200 ease-[ease-in-out] [font:inherit] hover:border-muted focus:border-accent focus:outline-none motion-reduce:transition-none"
        >
          {children}
        </select>
        <ChevronDown
          size={18}
          aria-hidden="true"
          className=":uno: pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted"
        />
      </div>
    </div>
  );
}
