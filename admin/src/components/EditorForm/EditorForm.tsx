import { lazy, type ReactNode, type Ref, Suspense } from "react";
import type { EditorHandle } from "../../editor-handle.js";
import { LoadingMessage } from "../LoadingMessage/LoadingMessage.js";

// The editor is a library of its own, so it is fetched when a page is opened
// to edit, and the other screens do not carry it.
const MarkdownEditor = lazy(
  () => import("../MarkdownEditor/MarkdownEditor.js"),
);

/** The `id` of the form, so a Save button elsewhere on the page can submit it. */
export const EDITOR_FORM_ID = "page-editor";

export interface EditorFormProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  editorRef?: Ref<EditorHandle>;
  /** Shown under the text. */
  notice?: ReactNode;
}

/**
 * The text of the page, with nothing drawn around it: it takes the shape of
 * the page it sits on and grows with what is typed, so the page itself
 * scrolls. It holds no state of its own, and has no Save button: that lives in
 * the header (see `SaveControls`) and submits this form.
 */
export function EditorForm({
  value,
  onChange,
  onSubmit,
  editorRef,
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
      <Suspense fallback={<LoadingMessage />}>
        <MarkdownEditor ref={editorRef} value={value} onChange={onChange} />
      </Suspense>
      {notice}
    </form>
  );
}
