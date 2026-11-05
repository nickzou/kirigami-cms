import { EditorSelection, EditorState } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { formatPieces } from "./markdown-format.js";

/**
 * The editor never shows the marks of the markdown (`**`, `# `, `](address)`),
 * so the cursor needs a few rules to behave as if they were not there. Each is
 * about a mark that is hidden, found the same way the drawing finds it.
 */

interface Hidden {
  from: number;
  to: number;
}

/** The marks hidden on the line at `pos`. */
function hiddenOnLine(state: EditorState, pos: number): Hidden[] {
  const line = state.doc.lineAt(pos);
  return formatPieces(state, line.from, line.to).flatMap((piece) =>
    piece.kind === "hide" ? [{ from: piece.from, to: piece.to }] : [],
  );
}

/**
 * The mark that opens the line at `pos` (a heading's `## `, a quote's `> `, a
 * rule's `---`), which is hidden, so the line starts after it.
 */
function leadingMark(state: EditorState, pos: number): Hidden | undefined {
  const start = state.doc.lineAt(pos).from;
  return hiddenOnLine(state, pos).find((mark) => mark.from === start);
}

/**
 * A cursor never rests in front of a line's opening mark: it would look like
 * the start of the line but type outside the heading or the quote. Moved to
 * the other side of the mark, which is where the line's text starts.
 */
export const keepOffOpeningMarks = EditorState.transactionFilter.of((tr) => {
  if (!tr.selection && !tr.docChanged) return tr;
  let moved = false;
  const ranges = tr.newSelection.ranges.map((range) => {
    if (!range.empty) return range;
    const mark = leadingMark(tr.state, range.head);
    if (!mark || range.head !== mark.from) return range;
    moved = true;
    return EditorSelection.cursor(mark.to);
  });
  if (!moved) return tr;
  return [
    tr,
    {
      selection: EditorSelection.create(ranges, tr.newSelection.mainIndex),
      sequential: true,
    },
  ];
});

/**
 * Backspace (or Delete) next to a hidden mark that sits inside a line steps
 * over it instead of deleting it, so an invisible character is never deleted
 * unseen. (A line's opening mark is deleted with the key: that turns a
 * heading back into a paragraph, as in any word processor.)
 */
export const stepOverMark =
  (direction: 1 | -1) =>
  (view: EditorView): boolean => {
    const { state } = view;
    const { main } = state.selection;
    if (state.selection.ranges.length !== 1 || !main.empty) return false;
    const line = state.doc.lineAt(main.head);
    const mark = hiddenOnLine(state, main.head).find((m) =>
      direction === -1 ? m.to === main.head : m.from === main.head,
    );
    if (!mark || mark.from === line.from) return false;
    view.dispatch({
      selection: { anchor: direction === -1 ? mark.from : mark.to },
      scrollIntoView: true,
      userEvent: "select",
    });
    return true;
  };

/**
 * Enter at the very start of a heading or a quote (after its hidden mark) adds
 * a line above it, as it looks, and does not cut the mark off from its text.
 */
export function enterAtLineStart(view: EditorView): boolean {
  const { state } = view;
  const { main } = state.selection;
  if (state.selection.ranges.length !== 1 || !main.empty) return false;
  const mark = leadingMark(state, main.head);
  if (
    !mark ||
    main.head !== mark.to ||
    mark.to === state.doc.lineAt(main.head).to
  ) {
    return false;
  }
  view.dispatch({
    changes: { from: mark.from, insert: "\n" },
    selection: { anchor: mark.to + 1 },
    scrollIntoView: true,
    userEvent: "input",
  });
  return true;
}
