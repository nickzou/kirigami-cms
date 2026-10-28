import type { ReactNode, Ref } from "react";
import { Button } from "./Button.js";

export interface EditorFormProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  /** Whether the text differs from what was last saved. */
  dirty: boolean;
  saving: boolean;
  textareaRef?: Ref<HTMLTextAreaElement>;
  /** Shown between the text box and the Save button. */
  notice?: ReactNode;
}

/** The text box and Save button. It holds no state of its own. */
export function EditorForm({
  value,
  onChange,
  onSubmit,
  dirty,
  saving,
  textareaRef,
  notice,
}: EditorFormProps) {
  return (
    <form
      className="editor"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label htmlFor="page-content">Markdown</label>
      <textarea
        id="page-content"
        ref={textareaRef}
        value={value}
        spellCheck
        onChange={(event) => onChange(event.target.value)}
      />
      {notice}
      <div className="actions">
        <Button type="submit" disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <span className="muted">
          {dirty ? "Unsaved changes" : "No changes"}
        </span>
      </div>
    </form>
  );
}
