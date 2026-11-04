import { ensureSyntaxTree, syntaxTree } from "@codemirror/language";
import type { EditorState } from "@codemirror/state";
import type { SyntaxNode } from "@lezer/common";

/** Text inside a table cell, as the formatting it carries. */
export type Inline =
  | { t: "text"; s: string }
  | { t: "strong" | "em" | "del"; c: Inline[] }
  | { t: "code"; s: string }
  | { t: "link"; href: string; c: Inline[] }
  | { t: "image"; src: string; alt: string; title?: string };

export type Align = "left" | "center" | "right" | null;

/** A table, as the rows and cells it holds (the delimiter row only says how columns line up). */
export interface TableModel {
  align: Align[];
  head: Inline[][];
  rows: Inline[][][];
}

/** A table in the text, and where it sits. */
export interface TableBlock {
  from: number;
  to: number;
  model: TableModel;
}

const LINKS = new Set(["Link", "Image", "Autolink"]);
const MARKS = new Set([
  "EmphasisMark",
  "StrikethroughMark",
  "CodeMark",
  "LinkMark",
  "LinkTitle",
  "LinkLabel",
]);

/** The unquoted text of a link title: `"T"`, `'T'` or `(T)`. */
export const titleText = (raw: string): string => raw.slice(1, -1);

/** What a run of inline markdown (the children of `parent`, between `from` and `to`) holds. */
function inlines(
  state: EditorState,
  parent: SyntaxNode,
  from: number,
  to: number,
): Inline[] {
  const slice = (a: number, b: number) => state.doc.sliceString(a, b);
  const out: Inline[] = [];
  const text = (s: string) => {
    if (s === "") return;
    const last = out[out.length - 1];
    if (last?.t === "text") last.s += s;
    else out.push({ t: "text", s });
  };
  let pos = from;
  for (let child = parent.firstChild; child; child = child.nextSibling) {
    text(slice(pos, child.from));
    pos = child.to;
    // The address inside a link or image is not text.
    if (child.name === "URL" && LINKS.has(parent.name)) continue;
    switch (child.name) {
      case "StrongEmphasis":
        out.push({
          t: "strong",
          c: inlines(state, child, child.from, child.to),
        });
        break;
      case "Emphasis":
        out.push({ t: "em", c: inlines(state, child, child.from, child.to) });
        break;
      case "Strikethrough":
        out.push({ t: "del", c: inlines(state, child, child.from, child.to) });
        break;
      case "InlineCode": {
        const [open, close] = [
          child.getChildren("CodeMark")[0],
          child.getChildren("CodeMark").at(-1),
        ];
        out.push({
          t: "code",
          s:
            open && close
              ? slice(open.to, close.from)
              : slice(child.from, child.to),
        });
        break;
      }
      case "Link": {
        const url = child.getChild("URL");
        out.push({
          t: "link",
          href: url ? slice(url.from, url.to) : "",
          c: inlines(state, child, child.from, child.to),
        });
        break;
      }
      case "Autolink":
      case "URL": {
        const url = child.name === "URL" ? child : child.getChild("URL");
        const href = url
          ? slice(url.from, url.to)
          : slice(child.from, child.to);
        out.push({ t: "link", href, c: [{ t: "text", s: href }] });
        break;
      }
      case "Image": {
        const url = child.getChild("URL");
        const [open, close] = child.getChildren("LinkMark");
        if (!url || !open || !close) {
          text(slice(child.from, child.to));
          break;
        }
        const title = child.getChild("LinkTitle");
        out.push({
          t: "image",
          src: slice(url.from, url.to),
          alt: slice(open.to, close.from),
          ...(title ? { title: titleText(slice(title.from, title.to)) } : {}),
        });
        break;
      }
      case "Escape":
        text(slice(child.from + 1, child.to));
        break;
      default:
        // The marks around an element are not text; anything else (html,
        // entities, line breaks) is kept as it was written.
        if (!MARKS.has(child.name)) text(slice(child.from, child.to));
    }
  }
  text(slice(pos, to));
  return out;
}

/** How one delimiter cell (`:--`, `--:`, `:-:`, `---`) aligns its column. */
function alignOf(cell: string): Align {
  const match = /^\s*(:?)-+(:?)\s*$/.exec(cell);
  if (!match) return null;
  const [, left, right] = match;
  return left && right ? "center" : right ? "right" : left ? "left" : null;
}

function cellsOf(state: EditorState, row: SyntaxNode): Inline[][] {
  return row
    .getChildren("TableCell")
    .map((cell) => inlines(state, cell, cell.from, cell.to));
}

/** The table at `node`, or undefined if it is not one that can be drawn as a table. */
function modelOf(state: EditorState, node: SyntaxNode): TableModel | undefined {
  const header = node.getChild("TableHeader");
  const delimiter = node.getChild("TableDelimiter");
  if (!header || !delimiter) return undefined;
  const head = cellsOf(state, header);
  if (head.length === 0) return undefined;
  const align = state.doc
    .sliceString(delimiter.from, delimiter.to)
    .replace(/^\s*\|/, "")
    .replace(/\|\s*$/, "")
    .split("|")
    .map(alignOf);
  const rows = node.getChildren("TableRow").map((row) => {
    const cells = cellsOf(state, row);
    // Every row has the header's columns: extra cells are dropped, missing ones are empty.
    return Array.from({ length: head.length }, (_, i) => cells[i] ?? []);
  });
  return {
    align: Array.from({ length: head.length }, (_, i) => align[i] ?? null),
    head,
    rows,
  };
}

/**
 * The tables in the text that can be drawn as tables: each one that starts and
 * ends on a whole line (a table inside a list or a quote is left as text), and
 * that the cursor (or a selection) is not in. With `reveal` off there is no
 * cursor, so every table is drawn.
 */
export function tablesToDraw(state: EditorState, reveal = true): TableBlock[] {
  const { doc } = state;
  const blocks: TableBlock[] = [];
  const tree = ensureSyntaxTree(state, doc.length, 50) ?? syntaxTree(state);
  tree.iterate({
    enter: (ref) => {
      if (ref.name !== "Table") return;
      const { from, to } = ref;
      if (doc.lineAt(from).from !== from || doc.lineAt(to).to !== to)
        return false;
      const inside = state.selection.ranges.some(
        (range) => range.from <= to && range.to >= from,
      );
      if (reveal && inside) return false;
      const model = modelOf(state, ref.node);
      if (model) blocks.push({ from, to, model });
      return false;
    },
  });
  return blocks;
}
