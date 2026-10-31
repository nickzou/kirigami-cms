import { type InputHTMLAttributes, type ReactNode, useId } from "react";

export interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "id"> {
  /** What the field is for. Always shown: a placeholder is not a label. */
  label: string;
  /** Text that sits fixed after what is typed, like `.md`. It is not part of the value. */
  suffix?: ReactNode;
  /** Show what is typed in a fixed-width font, for paths and the like. */
  mono?: boolean;
}

// Whole class strings, so UnoCSS can find and hash them.
const box =
  ":uno: flex items-center rounded border border-solid border-line bg-bg px-3 transition-colors duration-200 ease-[ease-in-out] focus-within:border-accent hover:border-muted motion-reduce:transition-none";
const boxInvalid =
  ":uno: flex items-center rounded border border-solid border-danger bg-bg px-3 transition-colors duration-200 ease-[ease-in-out] motion-reduce:transition-none";
const input =
  ":uno: min-w-0 flex-1 border-0 bg-transparent py-2.5 text-text [font:inherit] focus:outline-none";
const inputMono =
  ":uno: min-w-0 flex-1 border-0 bg-transparent py-2.5 font-mono text-base text-text focus:outline-none";

/**
 * A text input with its label above it, roomy padding, and an accent ring while
 * focused (red when it is marked invalid). An optional `suffix` shows fixed
 * text after the typed text. It takes the usual input props.
 */
export function TextField({
  label,
  suffix,
  mono = false,
  ...props
}: TextFieldProps) {
  const id = useId();
  const invalid =
    props["aria-invalid"] === true || props["aria-invalid"] === "true";
  return (
    <div>
      <label htmlFor={id} className=":uno: block font-bold">
        {label}
      </label>
      <div className={`${invalid ? boxInvalid : box} mt-1`}>
        <input id={id} {...props} className={mono ? inputMono : input} />
        {suffix && (
          <label
            htmlFor={id}
            aria-hidden="true"
            className={
              mono
                ? ":uno: shrink-0 cursor-text pl-1 font-mono text-base text-muted select-none"
                : ":uno: shrink-0 cursor-text pl-1 text-muted select-none"
            }
          >
            {suffix}
          </label>
        )}
      </div>
    </div>
  );
}
