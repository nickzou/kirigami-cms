import { useEffect, useState } from "react";
import { Button } from "../Button/Button.js";

/** A save that finishes sooner than this does not show "Saving…" at all. */
const SLOW_SAVE_MS = 300;

/** True once `active` has stayed true for `ms`; false again as soon as it is not. */
function useAfterDelay(active: boolean, ms: number): boolean {
  const [late, setLate] = useState(false);
  useEffect(() => {
    if (!active) {
      setLate(false);
      return;
    }
    const timer = setTimeout(() => setLate(true), ms);
    return () => clearTimeout(timer);
  }, [active, ms]);
  return late;
}

export interface SaveControlsProps {
  /** Whether the text differs from what was last saved. */
  dirty: boolean;
  saving: boolean;
  /** Something stops the changes being saved (a value that is not valid): Save is off, the note is not. */
  blocked?: boolean;
  /** The `id` of the form that Save submits (it can sit anywhere on the page). */
  formId: string;
}

/** The Save button, with a note on whether there is anything to save. */
export function SaveControls({
  dirty,
  saving,
  blocked = false,
  formId,
}: SaveControlsProps) {
  // Saving to a folder on this machine takes a few milliseconds. Swapping the
  // label for that long is a flash, so "Saving…" waits to see if it is needed.
  const slow = useAfterDelay(saving, SLOW_SAVE_MS);
  return (
    <div className=":uno: flex items-center gap-3">
      <span className=":uno: hidden text-muted sm:inline">
        {dirty ? "Unsaved changes" : "No changes"}
      </span>
      <Button
        type="submit"
        form={formId}
        variant="primary"
        // Wide enough for either label, so the button never changes size.
        className=":uno: min-w-24"
        disabled={!dirty || saving || blocked}
      >
        {saving && slow ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
