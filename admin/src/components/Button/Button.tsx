import type { ButtonHTMLAttributes } from "react";
import { Link, type LinkProps } from "react-router";

// Full class strings (not built up piece by piece) so UnoCSS can find and hash them.
// Hover is "not disabled" rather than "enabled" so it also applies to links.
const base =
  ":uno: inline-flex items-center justify-center gap-2 rounded px-4 py-2 text-sm font-bold no-underline cursor-pointer border border-solid transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const variants = {
  primary:
    ":uno: border-accent bg-accent text-on-accent shadow [&:not(:disabled)]:hover:bg-accent-hover [&:not(:disabled)]:hover:border-accent-hover",
  secondary:
    ":uno: border-line bg-surface text-text shadow [&:not(:disabled)]:hover:bg-subtle",
} as const;

interface Common {
  /** `primary` is the one main action on a screen. */
  variant?: keyof typeof variants;
}

export type ButtonAsButtonProps = Common &
  ButtonHTMLAttributes<HTMLButtonElement> & { to?: undefined };

/** Given `to`, the button is a link to another screen (it has an address). */
export type ButtonAsLinkProps = Common &
  Omit<LinkProps, "className"> & { className?: string };

export type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps;

const isLink = (props: ButtonProps): props is ButtonAsLinkProps =>
  props.to !== undefined;

/**
 * Looks like a button either way. Without `to` it is a `<button>` for an
 * action (and never submits a form unless `type="submit"`). With `to` it is a
 * link, for going somewhere.
 */
export function Button(props: ButtonProps) {
  if (isLink(props)) {
    const { variant = "secondary", className, ...rest } = props;
    return (
      <Link
        className={`${base} ${variants[variant]}${className ? ` ${className}` : ""}`}
        {...rest}
      />
    );
  }
  const { type = "button", variant = "secondary", className, ...rest } = props;
  return (
    <button
      type={type}
      className={`${base} ${variants[variant]}${className ? ` ${className}` : ""}`}
      {...rest}
    />
  );
}
