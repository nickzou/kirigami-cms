import { syntaxTree } from "@codemirror/language";
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

interface Fence {
  /** The line with the opening fence and the language. */
  open: number;
  /** The line with the closing fence, if the block has one. */
  close?: number;
}

/** The fenced code block that holds `pos`, as the numbers of the lines of its fences. */
function fenceAt(state: EditorState, pos: number): Fence | undefined {
  // A position at the very end of the block belongs to what comes after it
  // when looked at from the right, so look from both sides.
  for (const side of [1, -1] as const) {
    for (
      let node = syntaxTree(state).resolveInner(pos, side);
      node;
      node = node.parent as typeof node
    ) {
      if (node.name !== "FencedCode") continue;
      const marks = node.getChildren("CodeMark");
      return {
        open: state.doc.lineAt(node.from).number,
        ...(marks[1] ? { close: state.doc.lineAt(marks[1].from).number } : {}),
      };
    }
  }
  return undefined;
}

/**
 * The closing fence of a code block is not shown (it is only the block's
 * bottom edge), so a cursor is never left on it: typing there would break the
 * block. It goes on to the line after the block when it was moving forward,
 * and back to the end of the code when it was not.
 */
export const keepOffClosingFence = EditorState.transactionFilter.of((tr) => {
  if (!tr.selection && !tr.docChanged) return tr;
  const { doc } = tr.state;
  let moved = false;
  const before = tr.startState.selection.main.head;
  const ranges = tr.newSelection.ranges.map((range) => {
    if (!range.empty) return range;
    const fence = fenceAt(tr.state, range.head);
    if (fence?.close === undefined) return range;
    const line = doc.line(fence.close);
    if (range.head < line.from || range.head > line.to) return range;
    moved = true;
    if (range.head > before && fence.close < doc.lines) {
      return EditorSelection.cursor(doc.line(fence.close + 1).from);
    }
    return EditorSelection.cursor(doc.line(Math.max(1, fence.close - 1)).to);
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
 * Backspace at the start of a code block's first line of code, and Delete at
 * the end of its last, would join the code to a fence line, which is not
 * shown; they move the cursor across the fence instead and delete nothing.
 */
export const stepOverFence =
  (direction: 1 | -1) =>
  (view: EditorView): boolean => {
    const { state } = view;
    const { main } = state.selection;
    if (state.selection.ranges.length !== 1 || !main.empty) return false;
    const line = state.doc.lineAt(main.head);
    const edge =
      direction === -1 ? main.head === line.from : main.head === line.to;
    const nextNumber = line.number + direction;
    if (!edge || nextNumber < 1 || nextNumber > state.doc.lines) return false;
    const next = state.doc.line(nextNumber);
    const fence = fenceAt(state, next.from);
    if (!fence || (fence.open !== nextNumber && fence.close !== nextNumber)) {
      return false;
    }
    // Over the fence, to the code (or to what is outside) on its far side.
    const beyond = state.doc.line(
      Math.min(Math.max(nextNumber + direction, 1), state.doc.lines),
    );
    const at =
      fence.open === nextNumber && direction === -1
        ? next.to
        : direction === -1
          ? beyond.to
          : beyond.from;
    view.dispatch({
      selection: { anchor: at },
      scrollIntoView: true,
      userEvent: "select",
    });
    return true;
  };
