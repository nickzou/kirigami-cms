// Helpers for tests and stories that use the text editor (the admin itself
// never imports this). The editor is CodeMirror, so its text is read and
// changed through its view.
import { EditorView } from "@codemirror/view";

/** The editor view behind the element labelled "Markdown". */
export function editorView(element: HTMLElement): EditorView {
  const view = EditorView.findFromDOM(element);
  if (!view) throw new Error("That element is not in a text editor.");
  return view;
}

/** The text the editor holds. */
export const editorText = (element: HTMLElement): string =>
  editorView(element).state.doc.toString();

/** Replaces all the text, as typing or pasting would: the change is reported, and can be undone. */
export function replaceText(element: HTMLElement, text: string): void {
  const view = editorView(element);
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: text },
    userEvent: "input.type",
  });
}

/** Adds text at the end, as typing would (jsdom cannot type into the editor, so stories use this too). */
export function appendText(element: HTMLElement, text: string): void {
  const view = editorView(element);
  view.dispatch({
    changes: { from: view.state.doc.length, insert: text },
    selection: { anchor: view.state.doc.length + text.length },
    userEvent: "input.type",
  });
}
