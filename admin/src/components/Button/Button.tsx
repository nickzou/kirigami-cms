import type { ButtonHTMLAttributes } from "react";
import { Link, type LinkProps } from "react-router";

// Full class strings (not built up piece by piece) so UnoCSS can find and hash them.
// Hover is "not disabled" rather than "enabled" so it also applies to links.
const base =
  ":uno: inline-flex items-center justify-center gap-2 rounded text-sm font-bold no-underline cursor-pointer border border-solid transition-colors disabled:cursor-not-allowed disabled:opacity-50";
// Padding is by size, so a small button is not fighting the normal one's classes.
const sizes = {
  normal: ":uno: px-4 py-2",
  small: ":uno: px-2 py-1",
} as const;
const variants = {
  primary:
    ":uno: border-accent bg-accent text-on-accent shadow [&:not(:disabled)]:hover:bg-accent-hover [&:not(:disabled)]:hover:border-accent-hover",
  secondary:
    ":uno: border-line bg-surface text-text shadow [&:not(:disabled)]:hover:bg-subtle",
  /** For an action that cannot be undone, like deleting. */
  danger:
    ":uno: border-danger bg-danger text-on-accent shadow [&:not(:disabled)]:hover:opacity-90",
} as const;

interface Common {
  /** `primary` is the one main action on a screen. */
  variant?: keyof typeof variants;
  /** `small` is for actions that sit inside a row or a line of text. */
  size?: keyof typeof sizes;
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
    const {
      variant = "secondary",
      size = "normal",
      className,
      ...rest
    } = props;
    return (
      <Link
        className={`${base} ${sizes[size]} ${variants[variant]}${className ? ` ${className}` : ""}`}
        {...rest}
      />
    );
  }
  const {
    type = "button",
    variant = "secondary",
    size = "normal",
    className,
    ...rest
  } = props;
  return (
    <button
      type={type}
      className={`${base} ${sizes[size]} ${variants[variant]}${className ? ` ${className}` : ""}`}
      {...rest}
    />
  );
}
