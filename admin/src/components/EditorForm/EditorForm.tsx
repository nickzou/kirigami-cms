import type { ReactNode, Ref } from "react";
import { Button } from "../Button/Button.js";

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
      className=":uno: grid gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label htmlFor="page-content" className=":uno: font-bold">
        Markdown
      </label>
      <textarea
        id="page-content"
        ref={textareaRef}
        value={value}
        spellCheck
        className=":uno: block min-h-[60vh] w-full resize-y rounded-lg border border-solid border-line bg-surface p-3 font-mono text-[0.9375rem] leading-relaxed text-text shadow"
        onChange={(event) => onChange(event.target.value)}
      />
      {notice}
      <div className=":uno: flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <span className=":uno: text-muted">
          {dirty ? "Unsaved changes" : "No changes"}
        </span>
      </div>
    </form>
  );
}
