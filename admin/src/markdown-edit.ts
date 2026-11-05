import { ensureSyntaxTree, syntaxTree } from "@codemirror/language";
import {
  type ChangeSpec,
  EditorSelection,
  type EditorState,
  type SelectionRange,
  type TransactionSpec,
} from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import type { SyntaxNode } from "@lezer/common";
import { linkRangeAt } from "./markdown-format.js";

/** What the formatting buttons and shortcuts do. */
export type FormatAction =
  | "bold"
  | "italic"
  | "heading"
  | "link"
  | "bullets"
  | "code";

const treeOf = (state: EditorState) =>
  ensureSyntaxTree(state, state.doc.length, 50) ?? syntaxTree(state);

/** The nearest node called one of `names` that holds all of `range` (and the cursor's edge counts as in). */
function enclosing(
  state: EditorState,
  range: SelectionRange,
  ...names: string[]
): SyntaxNode | undefined {
  for (
    let node: SyntaxNode | null = treeOf(state).resolveInner(range.from, 1);
    node;
    node = node.parent
  ) {
    if (
      names.includes(node.name) &&
      node.from <= range.from &&
      node.to >= range.to
    ) {
      return node;
    }
  }
  // The cursor right after an element's last mark is in it too.
  for (
    let node: SyntaxNode | null = treeOf(state).resolveInner(range.from, -1);
    node;
    node = node.parent
  ) {
    if (
      names.includes(node.name) &&
      node.from <= range.from &&
      node.to >= range.to
    ) {
      return node;
    }
  }
  return undefined;
}

/** Where a selection's lines start and end, as [line start, line end] pairs, once each. */
function linesOf(state: EditorState, ranges: readonly SelectionRange[]) {
  const seen = new Set<number>();
  const lines: { from: number; to: number; text: string }[] = [];
  for (const range of ranges) {
    const first = state.doc.lineAt(range.from).number;
    // A selection that ends at the very start of a line does not include that line.
    const endPos =
      range.to > range.from && state.doc.lineAt(range.to).from === range.to
        ? range.to - 1
        : range.to;
    const last = state.doc.lineAt(endPos).number;
    for (let n = first; n <= last; n++) {
      if (seen.has(n)) continue;
      seen.add(n);
      const line = state.doc.line(n);
      lines.push({ from: line.from, to: line.to, text: line.text });
    }
  }
  return lines;
}

/** Marks wrapped around the text from `from` to `to`, one stretch per line (blank lines and the spaces at line edges are left out). */
function wrapChanges(
  state: EditorState,
  from: number,
  to: number,
  mark: string,
): ChangeSpec[] {
  const changes: ChangeSpec[] = [];
  const first = state.doc.lineAt(from).number;
  const last = state.doc.lineAt(to).number;
  for (let n = first; n <= last; n++) {
    const line = state.doc.line(n);
    let start = Math.max(line.from, from);
    let end = Math.min(line.to, to);
    while (start < end && /\s/.test(state.doc.sliceString(start, start + 1)))
      start++;
    while (end > start && /\s/.test(state.doc.sliceString(end - 1, end))) end--;
    if (start >= end) continue;
    changes.push({ from: start, insert: mark }, { from: end, insert: mark });
  }
  return changes;
}

const INLINE = {
  bold: { mark: "**", node: "StrongEmphasis", marks: "EmphasisMark" },
  italic: { mark: "*", node: "Emphasis", marks: "EmphasisMark" },
  code: { mark: "`", node: "InlineCode", marks: "CodeMark" },
} as const;

/** Bold, italic or code: wraps the text in its marks, or takes them off if it is already wrapped. */
function toggleInline(
  state: EditorState,
  kind: keyof typeof INLINE,
): TransactionSpec {
  const { mark, node: nodeName, marks } = INLINE[kind];
  return state.changeByRange((range) => {
    const node = enclosing(state, range, nodeName);
    if (node) {
      const found = node.getChildren(marks);
      const open = found[0];
      const close = found.at(-1);
      if (open && close && open !== close) {
        const changes = state.changes([
          { from: open.from, to: open.to },
          { from: close.from, to: close.to },
        ]);
        return {
          changes,
          range: EditorSelection.range(
            changes.mapPos(range.anchor, 1),
            changes.mapPos(range.head, -1),
          ),
        };
      }
    }

    let from = range.from;
    let to = range.to;
    if (range.empty) {
      const word = state.wordAt(range.head);
      if (!word) {
        // Nothing to wrap: a pair of marks, with the cursor between.
        return {
          changes: { from: range.head, insert: mark + mark },
          range: EditorSelection.cursor(range.head + mark.length),
        };
      }
      from = word.from;
      to = word.to;
    }
    const changes = state.changes(wrapChanges(state, from, to, mark));
    if (changes.empty) return { range };
    return {
      changes,
      range: range.empty
        ? EditorSelection.cursor(range.head + mark.length)
        : EditorSelection.range(
            changes.mapPos(range.from, 1),
            changes.mapPos(range.to, -1),
          ),
    };
  });
}

/** The selection after line edits: a cursor goes after what was put in front of it, a selection takes in what was put at its edges. */
function selectionAfter(
  state: EditorState,
  changes: ReturnType<EditorState["changes"]>,
) {
  return EditorSelection.create(
    state.selection.ranges.map((range) =>
      range.empty
        ? EditorSelection.cursor(changes.mapPos(range.head, 1))
        : EditorSelection.range(
            changes.mapPos(range.from, -1),
            changes.mapPos(range.to, 1),
          ),
    ),
    state.selection.mainIndex,
  );
}

const HEADING = /^(#{1,6})[ \t]+/;
/** A line that is already something else: a list item, a quote, a table row, a fence. */
const OTHER_BLOCK = /^\s*([-*+>|]|\d+[.)]|```|~~~)(\s|$)?/;

/** Sets the heading level of the lines: none, then #, ##, ###, then none again. */
function cycleHeading(state: EditorState): TransactionSpec {
  const lines = linesOf(state, state.selection.ranges).filter(
    (line) => line.text.trim() !== "",
  );
  const target = lines[0];
  if (!target) {
    // An empty line: start a heading there.
    const { head } = state.selection.main;
    return {
      changes: { from: head, insert: "# " },
      selection: EditorSelection.cursor(head + 2),
    };
  }
  const level = HEADING.exec(target.text)?.[1]?.length ?? 0;
  const next = level === 0 ? 1 : level >= 3 ? 0 : level + 1;
  const prefix = next === 0 ? "" : `${"#".repeat(next)} `;
  const changes = lines.flatMap((line): ChangeSpec[] => {
    const heading = HEADING.exec(line.text);
    if (!heading && OTHER_BLOCK.test(line.text)) return [];
    return [
      {
        from: line.from,
        to: line.from + (heading?.[0].length ?? 0),
        insert: prefix,
      },
    ];
  });
  const set = state.changes(changes);
  return { changes: set, selection: selectionAfter(state, set) };
}

const BULLET = /^(\s*)([-*+])[ \t]+/;
const ORDERED = /^(\s*)(\d+[.)])[ \t]+/;

/** Makes the lines a bulleted list, or takes the bullets off if they all are one. */
function toggleBullets(state: EditorState): TransactionSpec {
  const lines = linesOf(state, state.selection.ranges);
  const filled = lines.filter((line) => line.text.trim() !== "");
  const target = filled.length > 0 ? filled : lines;
  const allBullets =
    filled.length > 0 && filled.every((l) => BULLET.test(l.text));
  const changes = target.flatMap((line): ChangeSpec[] => {
    const bullet = BULLET.exec(line.text);
    const ordered = ORDERED.exec(line.text);
    if (allBullets && bullet) {
      return [
        {
          from: line.from + (bullet[1]?.length ?? 0),
          to: line.from + bullet[0].length,
        },
      ];
    }
    if (bullet) return [];
    if (ordered) {
      return [
        {
          from: line.from + (ordered[1]?.length ?? 0),
          to: line.from + ordered[0].length,
          insert: "- ",
        },
      ];
    }
    const indent = /^\s*/.exec(line.text)?.[0].length ?? 0;
    return [{ from: line.from + indent, insert: "- " }];
  });
  const set = state.changes(changes);
  return { changes: set, selection: selectionAfter(state, set) };
}

const WEB = /^https?:\/\/\S+$/;

/**
 * Takes the link the selection is in off, keeping its text. (`undefined` when
 * it is not in one.)
 */
export function unlink(state: EditorState): TransactionSpec | undefined {
  const { from, to } = state.selection.main;
  const link = linkRangeAt(state, from, to);
  if (!link) return undefined;
  const removed = link.textFrom - link.from;
  return {
    changes: state.changes([
      { from: link.from, to: link.textFrom },
      { from: link.textTo, to: link.to },
    ]),
    // What was the link's text, now without the brackets.
    selection: EditorSelection.range(link.from, link.textTo - removed),
  };
}

/**
 * Makes a link of the selected text, with its address left to type in the
 * link's popover. Does nothing in a link that is there already: the popover
 * edits that one.
 */
function toggleLink(state: EditorState): TransactionSpec | undefined {
  const { from, to } = state.selection.main;
  if (linkRangeAt(state, from, to)) return undefined;
  return state.changeByRange((range) => {
    const selected = state.doc.sliceString(range.from, range.to);
    const text = selected && !WEB.test(selected) ? selected : "link text";
    const address = WEB.test(selected) ? selected : "";
    return {
      changes: {
        from: range.from,
        to: range.to,
        insert: `[${text}](${address})`,
      },
      // The link's text is selected, so typing replaces it.
      range: EditorSelection.range(
        range.from + 1,
        range.from + 1 + text.length,
      ),
    };
  });
}

const FENCE = /^\s*(```|~~~)/;

/** Code: inline for part of a line; a fenced block for several lines; and takes either off again. */
function toggleCode(state: EditorState): TransactionSpec {
  const main = state.selection.main;
  const block = enclosing(state, main, "FencedCode");
  if (block) {
    const first = state.doc.lineAt(block.from);
    const last = state.doc.lineAt(block.to);
    const changes: ChangeSpec[] = [
      { from: first.from, to: Math.min(first.to + 1, state.doc.length) },
    ];
    if (last.number !== first.number && FENCE.test(last.text)) {
      changes.push({
        from: Math.max(last.from - 1, first.to + 1),
        to: last.to,
      });
    }
    const set = state.changes(changes);
    return { changes: set, selection: state.selection.map(set, 1) };
  }
  const lines = linesOf(state, [main]);
  if (!main.empty && lines.length > 1) {
    const first = lines[0];
    const last = lines.at(-1);
    if (first && last) {
      return {
        changes: [
          { from: first.from, insert: "```\n" },
          { from: last.to, insert: "\n```" },
        ],
        selection: EditorSelection.range(first.from + 4, last.to + 4),
      };
    }
  }
  return toggleInline(state, "code");
}

/** What a formatting button or shortcut does to the text, as a transaction; undefined if it has nothing to do. */
export function formatChange(
  state: EditorState,
  action: FormatAction,
): TransactionSpec | undefined {
  switch (action) {
    case "bold":
    case "italic":
      return toggleInline(state, action);
    case "heading":
      return cycleHeading(state);
    case "link":
      return toggleLink(state);
    case "bullets":
      return toggleBullets(state);
    case "code":
      return toggleCode(state);
  }
}

/** Does `action` to the text in `view` and keeps the focus there. */
export function applyFormat(view: EditorView, action: FormatAction): boolean {
  const spec = formatChange(view.state, action);
  if (spec) {
    view.dispatch({ ...spec, userEvent: "input", scrollIntoView: true });
  }
  view.focus();
  return true;
}

/** Where Enter means "carry on the list or quote", and not here. */
const NOT_MARKDOWN = new Set([
  "FencedCode",
  "CodeBlock",
  "Table",
  "HTMLBlock",
  "CommentBlock",
]);

const ITEM =
  /^(\s*(?:>\s?)*)(?:([-*+]|\d{1,9}[.)])([ \t]+)(?:(\[[ xX]\])([ \t]+))?)?/;

/**
 * Enter at the end of a list item or quote line starts the next one (the next
 * number, an unticked box, the same quote marks). Enter on one that is empty
 * ends the list. Anywhere else, and inside code or a table, it is left to the
 * editor.
 */
export function continueMarkup(view: EditorView): boolean {
  const { state } = view;
  const { main } = state.selection;
  if (state.selection.ranges.length !== 1 || !main.empty || view.composing) {
    return false;
  }
  const line = state.doc.lineAt(main.head);
  const match = ITEM.exec(line.text);
  if (!match) return false;
  const [prefix, lead = "", marker, gap = "", box, afterBox = ""] = match;
  const quoted = lead.includes(">");
  if (!marker && !quoted) return false;
  if (main.head - line.from < prefix.length) return false;
  for (
    let node: SyntaxNode | null = treeOf(state).resolveInner(main.head, -1);
    node;
    node = node.parent
  ) {
    if (NOT_MARKDOWN.has(node.name)) return false;
  }

  if (line.text.slice(prefix.length).trim() === "") {
    // An empty item: this Enter ends the list (or quote).
    view.dispatch({
      changes: { from: line.from, to: main.head },
      selection: EditorSelection.cursor(line.from),
      userEvent: "input",
    });
    return true;
  }

  let next = marker ?? "";
  const ordered = /^(\d+)([.)])$/.exec(marker ?? "");
  if (ordered) next = `${Number(ordered[1]) + 1}${ordered[2]}`;
  const nextPrefix = `${lead}${next}${marker ? gap : ""}${box ? `[ ]${afterBox}` : ""}`;
  view.dispatch({
    changes: { from: main.head, insert: `\n${nextPrefix}` },
    selection: EditorSelection.cursor(main.head + 1 + nextPrefix.length),
    userEvent: "input",
    scrollIntoView: true,
  });
  return true;
}
