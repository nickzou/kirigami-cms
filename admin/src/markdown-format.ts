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
import { CheckboxWidget, ImageWidget } from "./editor-widgets.js";
import { titleText } from "./table-model.js";

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
  /** Marks (`**`, `#`, `](url)`) left out of sight: the editor never shows them. */
  | { kind: "hide"; from: number; to: number }
  /** An image, shown in place of its markdown. */
  | {
      kind: "image";
      from: number;
      to: number;
      alt: string;
      src: string;
      title?: string;
    }
  /** A task's `[ ]` or `[x]`, shown as a checkbox. */
  | { kind: "checkbox"; from: number; to: number; checked: boolean };

/**
 * Works out how the markdown in `state` is drawn, for the part of the text
 * from `from` to `to`. Headings, bold, italic, strikethrough, inline code,
 * links, quotes, code fences and rules get a look, and their marks are hidden
 * wherever the cursor is: nothing here depends on the selection. Images and
 * task boxes are drawn as what they are. Tables are not handled.
 */
export function formatPieces(
  state: EditorState,
  from = 0,
  to = state.doc.length,
): Piece[] {
  const { doc } = state;
  const lineOf = (pos: number) => doc.lineAt(pos);

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
        node.getChildren("HeaderMark").forEach((mark, index) => {
          if (index === 0) hide(mark.from, spacesAfter(mark.to));
          else hide(spacesBefore(mark.from), mark.to);
        });
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
          hide(open.from, open.to);
          hide(close.from, node.to);
          return;
        }
        case "Autolink": {
          const url = node.getChild("URL");
          if (url) markClass(url.from, url.to, "kcm-link");
          for (const mark of node.getChildren("LinkMark")) {
            hide(mark.from, mark.to);
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
          hide(node.from, spacesAfter(node.to));
          return;
        case "ListMark":
          return markClass(node.from, node.to, "kcm-list-mark");
        case "TaskMarker":
          return add({
            kind: "checkbox",
            from: node.from,
            to: node.to,
            checked: /x/i.test(doc.sliceString(node.from, node.to)),
          });
        case "Image": {
          const [open, close] = node.getChildren("LinkMark");
          const url = node.getChild("URL");
          if (!open || !close || !url) return;
          const title = node.getChild("LinkTitle");
          return add({
            kind: "image",
            from: node.from,
            to: node.to,
            alt: doc.sliceString(open.to, close.from),
            src: doc.sliceString(url.from, url.to),
            ...(title
              ? { title: titleText(doc.sliceString(title.from, title.to)) }
              : {}),
          });
        }
        // A table is drawn (or shown as text) by `tableWidgets`; its cells are
        // not formatted here, so its text shows as it is written.
        case "Table":
          return false;
        case "FencedCode": {
          const [open, close] = node.getChildren("CodeMark");
          const info = node.getChild("CodeInfo");
          eachLine(node, (at, index, last) => {
            lineClass(at, "kcm-code-block");
            if (index === 0) lineClass(at, "kcm-code-first");
            if (last) lineClass(at, "kcm-code-last");
          });
          // The fences are not shown: the block is drawn as a block, and its
          // language (the text after the opening fence) is its label.
          if (open) hide(open.from, info ? info.from : open.to);
          if (info) markClass(info.from, info.to, "kcm-code-info");
          if (close) {
            lineClass(close.from, "kcm-code-closing");
            hide(lineOf(close.from).from, lineOf(close.from).to);
          }
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
        // Raw HTML is left out of the built page, so it is drawn as the quiet
        // text it is, labelled, and edited as text.
        case "HTMLBlock":
        case "CommentBlock":
          eachLine(node, (at, index, last) => {
            lineClass(at, "kcm-html-block");
            if (index === 0) lineClass(at, "kcm-html-first");
            if (last) lineClass(at, "kcm-html-last");
          });
          return false;
        case "HorizontalRule":
          lineClass(node.from, "kcm-hr");
          hide(node.from, node.to);
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
          : piece.kind === "hide"
            ? Decoration.replace({}).range(piece.from, piece.to)
            : piece.kind === "image"
              ? Decoration.replace({
                  widget: new ImageWidget(piece.src, piece.alt, piece.title),
                }).range(piece.from, piece.to)
              : Decoration.replace({
                  widget: new CheckboxWidget(piece.checked),
                }).range(piece.from, piece.to),
    ),
    true,
  );
}

/**
 * The address of the link at `pos` (a link's text or address, an autolink, or
 * a bare address), as written; an image alone is not a link.
 */
export function linkAt(state: EditorState, pos: number): string | undefined {
  const { doc } = state;
  const tree = ensureSyntaxTree(state, doc.length, 50) ?? syntaxTree(state);
  for (
    let node: SyntaxNode | null = tree.resolveInner(pos, 1);
    node;
    node = node.parent
  ) {
    if (node.name === "Link" || node.name === "Autolink") {
      const url = node.getChild("URL");
      return url ? doc.sliceString(url.from, url.to) : undefined;
    }
    if (node.name === "URL") return doc.sliceString(node.from, node.to);
  }
  return undefined;
}

/** A link (`[text](address)`) and where its parts are in the text. */
export interface LinkRange {
  /** The whole link, from its `[` to its `)`. */
  from: number;
  to: number;
  /** The link's text, between the brackets. */
  textFrom: number;
  textTo: number;
  /** The address, which is empty (`[text]()`) when the two are equal. */
  urlFrom: number;
  urlTo: number;
  url: string;
}

/**
 * The link whose text or address holds the whole of `from` to `to` (edges
 * outside the link do not count: a cursor just before the `[` or just after
 * the `)` is not in it). Autolinks and bare addresses have no text to edit
 * apart from the address, so they are not found here.
 */
export function linkRangeAt(
  state: EditorState,
  from: number,
  to = from,
): LinkRange | undefined {
  const { doc } = state;
  const tree = ensureSyntaxTree(state, doc.length, 50) ?? syntaxTree(state);
  for (
    let node: SyntaxNode | null = tree.resolveInner(from, 1);
    node;
    node = node.parent
  ) {
    if (node.name !== "Link") continue;
    if (from <= node.from || to >= node.to) return undefined;
    const marks = node.getChildren("LinkMark");
    const [open, close, paren] = marks;
    if (!open || !close) return undefined;
    const url = node.getChild("URL");
    const urlFrom = url ? url.from : (paren?.to ?? close.to);
    const urlTo = url ? url.to : urlFrom;
    return {
      from: node.from,
      to: node.to,
      textFrom: open.to,
      textTo: close.from,
      urlFrom,
      urlTo,
      url: doc.sliceString(urlFrom, urlTo),
    };
  }
  return undefined;
}
