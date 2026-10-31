import { ArrowLeft, ChevronLeft } from "lucide-react";
import { Link } from "react-router";
import { Button } from "../Button/Button.js";

/**
 * A link back to the page list. By default a button with a label; `compact` is
 * just a chevron (its name is still there for screen readers), for the app
 * header.
 */
export function BackLink({ compact = false }: { compact?: boolean }) {
  if (compact) {
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
  return (
    <p className=":uno: mt-0">
      <Button to="/">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to all pages
      </Button>
    </p>
  );
}
