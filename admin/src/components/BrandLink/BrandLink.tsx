import { Link } from "react-router";
import { Logo } from "../Logo/Logo.js";

/**
 * The logo and the product name, linking home. `compact` shows only the logo
 * (the name stays for screen readers).
 */
export function BrandLink({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      to="/"
      className=":uno: inline-flex items-center gap-2 text-lg font-bold tracking-widest text-text uppercase no-underline"
    >
      <Logo className=":uno: h-6 w-auto shrink-0" />
      <span className={compact ? ":uno: sr-only" : ""}>Kirigami</span>
    </Link>
  );
}
