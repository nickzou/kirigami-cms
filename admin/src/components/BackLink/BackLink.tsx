import { ArrowLeft } from "lucide-react";
import { Button } from "../Button/Button.js";

/** A link back to the page list, styled as a button. */
export function BackLink() {
  return (
    <p className=":uno: mt-0">
      <Button to="/">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to all pages
      </Button>
    </p>
  );
}
