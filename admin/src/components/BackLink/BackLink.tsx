import { ChevronLeft } from "lucide-react";
import { Link } from "react-router";

/**
 * A chevron that goes back to the page list, for the left of a screen's title
 * in the app header. Its name is still there for screen readers.
 */
export function BackLink() {
  return (
    <Link
      to="/"
      aria-label="Back to all pages"
      title="Back to all pages"
      className=":uno: inline-flex size-9 shrink-0 items-center justify-center rounded text-text no-underline transition-colors duration-200 ease-[ease-in-out] hover:bg-subtle motion-reduce:transition-none"
    >
      <ChevronLeft size={20} aria-hidden="true" />
    </Link>
  );
}
