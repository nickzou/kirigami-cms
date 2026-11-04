import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { Annotation, EditorState, Transaction } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { type Ref, useEffect, useImperativeHandle, useRef } from "react";
import type { EditorHandle } from "../../editor-handle.js";

export interface MarkdownEditorProps {
  /** The text. It is the editor's own state: set it to replace what is there. */
  value: string;
  onChange: (value: string) => void;
  /** Names the text box for screen readers. */
  label?: string;
  ref?: Ref<EditorHandle>;
}

/** Marks a change that came from `value`, so it is not reported back or made undoable. */
const fromOutside = Annotation.define<boolean>();

// The look of the old text box: no box, the page's own text color, a fixed-width
// font, and a height that follows the text so the page itself scrolls.
const look = EditorView.theme({
  "&": {
    backgroundColor: "transparent",
    color: "var(--text)",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    fontSize: "0.9375rem",
    lineHeight: "1.625",
    overflow: "visible",
  },
  ".cm-content": {
    // Short pages keep the empty part inside the editor, so a click there lands in it.
    minHeight: "60vh",
    padding: "0",
    caretColor: "var(--text)",
  },
  ".cm-line": { padding: "0" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--text)" },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, ::selection":
    { backgroundColor: "color-mix(in srgb, var(--accent) 30%, transparent)" },
});

/**
 * The page's markdown as editable text. It is plain text for now (the
 * formatting comes later); what it holds is exactly what is saved, so it never
 * changes a character that was not typed. Line breaks are always `\n` here:
 * the page's own line endings are put back when it is saved (see
 * `line-endings.ts`).
 */
export function MarkdownEditor({
  value,
  onChange,
  label = "Markdown",
  ref,
}: MarkdownEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  // The latest callback, so the editor is made once and never rebuilt for it.
  const report = useRef(onChange);
  report.current = onChange;
  // What it starts with; later changes to `value` go through the effect below.
  const first = useRef({ value, label });

  useEffect(() => {
    const parent = host.current;
    if (!parent) return;
    const editor = new EditorView({
      parent,
      state: EditorState.create({
        doc: first.current.value,
        extensions: [
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({
            "aria-label": first.current.label,
            spellcheck: "true",
          }),
          EditorView.updateListener.of((update) => {
            if (
              update.docChanged &&
              !update.transactions.some((t) => t.annotation(fromOutside))
            ) {
              report.current(update.state.doc.toString());
            }
          }),
          look,
        ],
      }),
    });
    view.current = editor;
    return () => {
      editor.destroy();
      view.current = null;
    };
  }, []);

  // Replaces the text when `value` is changed from outside (the page was
  // loaded again), keeping the cursor where it can be.
  useEffect(() => {
    const editor = view.current;
    if (!editor || editor.state.doc.toString() === value) return;
    editor.dispatch({
      changes: { from: 0, to: editor.state.doc.length, insert: value },
      annotations: [fromOutside.of(true), Transaction.addToHistory.of(false)],
    });
  }, [value]);

  useImperativeHandle(ref, () => ({
    focus: () => view.current?.focus(),
    focusEnd: () => {
      const editor = view.current;
      if (!editor) return;
      editor.dispatch({
        selection: { anchor: editor.state.doc.length },
        scrollIntoView: true,
      });
      editor.focus();
    },
    selectAll: () => {
      const editor = view.current;
      if (!editor) return;
      editor.dispatch({
        selection: { anchor: 0, head: editor.state.doc.length },
      });
      editor.focus();
    },
  }));

  return <div ref={host} />;
}

export default MarkdownEditor;
