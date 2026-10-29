import type { ButtonHTMLAttributes } from "react";

// Full class strings (not built up piece by piece) so UnoCSS can find and hash them.
const base =
  ":uno: inline-flex items-center justify-center rounded px-4 py-2 text-sm font-bold cursor-pointer border border-solid transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const variants = {
  primary:
    ":uno: border-accent bg-accent text-on-accent shadow hover:enabled:bg-accent-hover hover:enabled:border-accent-hover",
  secondary:
    ":uno: border-line bg-surface text-text shadow hover:enabled:bg-subtle",
} as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** `primary` is the one main action on a screen. */
  variant?: keyof typeof variants;
}

/** A button that never submits a form unless asked to (`type="submit"`). */
export function Button({
  type = "button",
  variant = "secondary",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${base} ${variants[variant]}${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}
