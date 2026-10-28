import type { ButtonHTMLAttributes } from "react";

/** A button that never submits a form unless asked to (`type="submit"`). */
export function Button({
  type = "button",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={className ? `button ${className}` : "button"}
      {...props}
    />
  );
}
