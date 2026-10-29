import {
  type ReactNode,
  type Ref,
  useCallback,
  useLayoutEffect,
  useRef,
} from "react";

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
 * The text box, with nothing drawn around it: it takes the shape of the page
 * it sits on and grows with what is typed, so the page itself scrolls. It
 * holds no state of its own, and has no Save button: that lives in the header
 * (see `SaveControls`) and submits this form.
 */
export function EditorForm({
  value,
  onChange,
  onSubmit,
  textareaRef,
  notice,
}: EditorFormProps) {
  const box = useRef<HTMLTextAreaElement | null>(null);
  // Our own reference (to size the box) and the caller's, both kept up to date.
  const setBox = useCallback(
    (element: HTMLTextAreaElement | null) => {
      box.current = element;
      if (typeof textareaRef === "function") textareaRef(element);
      else if (textareaRef) textareaRef.current = element;
    },
    [textareaRef],
  );

  // Fit the box to its text. Its minimum height (in the class) still keeps the
  // empty part of a short page inside the box, so a click there lands in it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `value` is what changes the height.
  useLayoutEffect(() => {
    const element = box.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, [value]);

  return (
    <form
      id={EDITOR_FORM_ID}
      className=":uno: grid gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label htmlFor="page-content" className=":uno: sr-only">
        Markdown
      </label>
      <textarea
        id="page-content"
        ref={setBox}
        value={value}
        spellCheck
        className=":uno: block min-h-[60vh] w-full resize-none overflow-hidden border-0 bg-transparent p-0 font-mono text-[0.9375rem] leading-relaxed text-text focus-visible:outline-none"
        onChange={(event) => onChange(event.target.value)}
      />
      {notice}
    </form>
  );
}
