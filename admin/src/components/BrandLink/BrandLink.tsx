import { Link } from "react-router";
import { Logo } from "../Logo/Logo.js";

/**
 * The logo and the product name, linking home. `compact` fades the name out,
 * leaving the logo (the name stays for screen readers).
 */
export function BrandLink({
  compact = false,
  onDark = false,
  markOnPhone = false,
}: {
  compact?: boolean;
  /** For the dark sidebar: the light text color instead of the page's. */
  onDark?: boolean;
  /** Under 640px wide, show only the logo, to leave room for a title. */
  markOnPhone?: boolean;
}) {
  return (
    <Link
      to="/"
      className={
        onDark
          ? ":uno: inline-flex items-center gap-2 text-lg font-bold tracking-widest text-side-text uppercase no-underline"
          : ":uno: inline-flex items-center gap-2 text-lg font-bold tracking-widest text-text uppercase no-underline"
      }
    >
      <Logo className=":uno: h-6 w-auto shrink-0" />
      {/* Kept in place and faded, not removed, so it can ease out as the
          sidebar narrows (and stays the link's name for screen readers). */}
      <span
        className={
          compact
            ? ":uno: whitespace-nowrap opacity-0 transition-opacity duration-200 ease-[ease-in-out] motion-reduce:transition-none"
            : markOnPhone
              ? ":uno: whitespace-nowrap opacity-100 transition-opacity duration-200 ease-[ease-in-out] max-sm:sr-only motion-reduce:transition-none"
              : ":uno: whitespace-nowrap opacity-100 transition-opacity duration-200 ease-[ease-in-out] motion-reduce:transition-none"
        }
      >
        Kirigami
      </span>
    </Link>
  );
}
