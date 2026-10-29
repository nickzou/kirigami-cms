import { Button } from "../Button/Button.js";

export interface SaveControlsProps {
  /** Whether the text differs from what was last saved. */
  dirty: boolean;
  saving: boolean;
  /** The `id` of the form that Save submits (it can sit anywhere on the page). */
  formId: string;
}

/** The Save button, with a note on whether there is anything to save. */
export function SaveControls({ dirty, saving, formId }: SaveControlsProps) {
  return (
    <div className=":uno: flex items-center gap-3">
      <span className=":uno: hidden text-muted sm:inline">
        {dirty ? "Unsaved changes" : "No changes"}
      </span>
      <Button
        type="submit"
        form={formId}
        variant="primary"
        disabled={!dirty || saving}
      >
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
