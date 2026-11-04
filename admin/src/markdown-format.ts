import {
  defineLanguageFacet,
  ensureSyntaxTree,
  Language,
  LanguageSupport,
  syntaxTree,
} from "@codemirror/language";
import type { EditorState } from "@codemirror/state";
import { Decoration, type DecorationSet } from "@codemirror/view";
import type { SyntaxNode } from "@lezer/common";
import { GFM, parser } from "@lezer/markdown";

// Markdown with the GitHub extras (strikethrough, tables, task lists, bare
// links), built on the parser alone. `@codemirror/lang-markdown` would do the
// same but loads the HTML, CSS and JavaScript grammars with it, which doubles
// the size of the editor for highlighting nothing here uses.
const markdownLanguage = new Language(
  defineLanguageFacet(),
  parser.configure(GFM),
  [],
  "markdown",
);

/** Markdown for the editor to parse. */
export const markdownSupport = () => new LanguageSupport(markdownLanguage);

/**
 * One piece of formatting, worked out from the text and where the cursor is.
 * Formatting only draws: it never changes the text.
 */
export type Piece =
  /** A class for the whole line that starts at `at`. */
  | { kind: "line"; at: number; className: string }
  /** A class for a stretch of text on one line. */
  | { kind: "mark"; from: number; to: number; className: string }
  /** Marks (`**`, `#`, `](url)`) left out of sight until the cursor is on them. */
  | { kind: "hide"; from: number; to: number };

/**
 * Works out how the markdown in `state` is drawn, for the part of the text
 * from `from` to `to`. Headings, bold, italic, strikethrough, inline code,
 * links, quotes, code fences and rules get a look; their marks are hidden
 * except where the cursor (or a selection) is, while `reveal` is on: the line for a heading or a
 * quote, the whole element for the rest. Tables and images are not handled.
 */
export function formatPieces(
  state: EditorState,
  from = 0,
  to = state.doc.length,
  reveal = true,
): Piece[] {
  const { doc } = state;
  // With `reveal` off (the editor is not being used) there is no cursor to show marks for.
  const ranges = reveal ? state.selection.ranges : [];
  const touches = (a: number, b: number): boolean =>
    ranges.some((range) => range.from <= b && range.to >= a);
  const lineOf = (pos: number) => doc.lineAt(pos);
  const lineTouched = (pos: number): boolean => {
    const line = lineOf(pos);
    return touches(line.from, line.to);
  };

  const pieces: Piece[] = [];
  const seen = new Set<string>();
  const add = (piece: Piece): void => {
    const key = JSON.stringify(piece);
    if (seen.has(key)) return;
    seen.add(key);
    pieces.push(piece);
  };
  const lineClass = (at: number, className: string) =>
    add({ kind: "line", at: lineOf(at).from, className });
  const markClass = (a: number, b: number, className: string) => {
    if (a < b) add({ kind: "mark", from: a, to: b, className });
  };
  const hide = (a: number, b: number) => {
    if (a < b) add({ kind: "hide", from: a, to: b });
  };
  /** Each line a block covers, by the position its line starts at. */
  const eachLine = (
    node: SyntaxNode,
    each: (at: number, index: number, last: boolean) => void,
  ) => {
    const first = lineOf(node.from).number;
    const last = lineOf(Math.max(node.from, node.to)).number;
    for (let n = first; n <= last; n++) {
      each(doc.line(n).from, n - first, n === last);
    }
  };
  /** The spaces right after `pos`, on its line. */
  const spacesAfter = (pos: number): number => {
    const line = lineOf(pos);
    let end = pos;
    while (end < line.to && doc.sliceString(end, end + 1) === " ") end++;
    return end;
  };
  const spacesBefore = (pos: number): number => {
    const line = lineOf(pos);
    let start = pos;
    while (start > line.from && doc.sliceString(start - 1, start) === " ") {
      start--;
    }
    return start;
  };

  /** An element drawn between marks, like bold between `**`. */
  const pair = (node: SyntaxNode, className: string, markName: string) => {
    markClass(node.from, node.to, className);
    if (touches(node.from, node.to)) return;
    for (const mark of node.getChildren(markName)) hide(mark.from, mark.to);
  };

  const tree =
    ensureSyntaxTree(state, Math.min(to, state.doc.length), 50) ??
    syntaxTree(state);
  tree.iterate({
    from,
    to,
    enter: (ref) => {
      const name = ref.name;
      const node = ref.node;

      const atx = /^ATXHeading([1-6])$/.exec(name);
      if (atx) {
        lineClass(node.from, `kcm-h${atx[1]}`);
        if (!lineTouched(node.from)) {
          const marks = node.getChildren("HeaderMark");
          marks.forEach((mark, index) => {
            if (index === 0) hide(mark.from, spacesAfter(mark.to));
            else hide(spacesBefore(mark.from), mark.to);
          });
        }
        return;
      }

      const setext = /^SetextHeading([12])$/.exec(name);
      if (setext) {
        eachLine(node, (at, _index, last) =>
          lineClass(at, last ? "kcm-setext-underline" : `kcm-h${setext[1]}`),
        );
        return;
      }

      switch (name) {
        case "StrongEmphasis":
          return pair(node, "kcm-strong", "EmphasisMark");
        case "Emphasis":
          return pair(node, "kcm-em", "EmphasisMark");
        case "Strikethrough":
          return pair(node, "kcm-del", "StrikethroughMark");
        case "InlineCode":
          return pair(node, "kcm-code", "CodeMark");
        case "Link": {
          const marks = node.getChildren("LinkMark");
          const open = marks[0];
          const close = marks[1];
          if (!open || !close) return;
          markClass(open.to, close.from, "kcm-link");
          if (touches(node.from, node.to)) {
            const url = node.getChild("URL");
            if (url) markClass(url.from, url.to, "kcm-url");
          } else {
            hide(open.from, open.to);
            hide(close.from, node.to);
          }
          return;
        }
        case "Autolink": {
          const url = node.getChild("URL");
          if (url) markClass(url.from, url.to, "kcm-link");
          if (!touches(node.from, node.to)) {
            for (const mark of node.getChildren("LinkMark")) {
              hide(mark.from, mark.to);
            }
          }
          return;
        }
        case "Blockquote": {
          eachLine(node, (at) => lineClass(at, "kcm-quote"));
          return;
        }
        // A quote's later lines have their marks inside the paragraph, not
        // beside it, so every mark is handled on its own.
        case "QuoteMark":
          if (!lineTouched(node.from)) hide(node.from, spacesAfter(node.to));
          return;
        case "ListMark":
          return markClass(node.from, node.to, "kcm-list-mark");
        case "TaskMarker":
          return markClass(node.from, node.to, "kcm-task-marker");
        case "FencedCode": {
          eachLine(node, (at, index, last) => {
            lineClass(at, "kcm-code-block");
            if (index === 0) lineClass(at, "kcm-code-first");
            if (last) lineClass(at, "kcm-code-last");
          });
          for (const mark of node.getChildren("CodeMark")) {
            markClass(mark.from, mark.to, "kcm-fence");
          }
          const info = node.getChild("CodeInfo");
          if (info) markClass(info.from, info.to, "kcm-code-info");
          return;
        }
        case "CodeBlock": {
          eachLine(node, (at, index, last) => {
            lineClass(at, "kcm-code-block");
            if (index === 0) lineClass(at, "kcm-code-first");
            if (last) lineClass(at, "kcm-code-last");
          });
          return;
        }
        case "HorizontalRule":
          lineClass(node.from, "kcm-hr");
          if (!lineTouched(node.from)) hide(node.from, node.to);
          return;
      }
    },
  });
  return pieces;
}

/** The pieces as CodeMirror decorations. */
export function toDecorations(pieces: readonly Piece[]): DecorationSet {
  return Decoration.set(
    pieces.map((piece) =>
      piece.kind === "line"
        ? Decoration.line({ class: piece.className }).range(piece.at)
        : piece.kind === "mark"
          ? Decoration.mark({ class: piece.className }).range(
              piece.from,
              piece.to,
            )
          : Decoration.replace({}).range(piece.from, piece.to),
    ),
    true,
  );
}
