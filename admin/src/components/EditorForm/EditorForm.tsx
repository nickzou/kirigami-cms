import type { ReactNode, Ref } from "react";

/** The `id` of the form, so a Save button elsewhere on the page can submit it. */
export const EDITOR_FORM_ID = "page-editor";

export interface EditorFormProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  textareaRef?: Ref<HTMLTextAreaElement>;
  /** Shown under the text box. */
  notice?: ReactNode;
}

/**
 * The text box. It holds no state of its own, and has no Save button: that
 * lives in the header (see `SaveControls`) and submits this form.
 */
export function EditorForm({
  value,
  onChange,
  onSubmit,
  textareaRef,
  notice,
}: EditorFormProps) {
  return (
    <form
      id={EDITOR_FORM_ID}
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
    </form>
  );
}
