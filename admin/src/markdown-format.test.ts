import { EditorSelection, EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import {
  formatPieces,
  markdownSupport,
  type Piece,
} from "./markdown-format.js";

/**
 * Formats `doc` with the cursor at the `|` in it (there is no `|` in the text
 * the editor sees), or at the very end when there is none.
 */
function format(source: string): { doc: string; pieces: Piece[] } {
  const bar = source.indexOf("|");
  const doc = bar === -1 ? source : source.replace("|", "");
  const state = EditorState.create({
    doc,
    selection: { anchor: bar === -1 ? doc.length : bar },
    extensions: [markdownSupport()],
  });
  return { doc, pieces: formatPieces(state) };
}

const text = (doc: string, piece: Piece): string =>
  piece.kind === "line" ? "" : doc.slice(piece.from, piece.to);
const hidden = (source: string): string[] => {
  const { doc, pieces } = format(source);
  return pieces.filter((p) => p.kind === "hide").map((p) => text(doc, p));
};
const marked = (source: string, className: string): string[] => {
  const { doc, pieces } = format(source);
  return pieces
    .filter((p) => p.kind === "mark" && p.className === className)
    .map((p) => text(doc, p));
};
const linesWith = (source: string, className: string): number[] => {
  const { pieces } = format(source);
  return pieces
    .filter((p) => p.kind === "line" && p.className === className)
    .map((p) => (p as { at: number }).at);
};

describe("headings", () => {
  it("gives each level its own class, on the line", () => {
    for (let level = 1; level <= 6; level++) {
      const source = `${"#".repeat(level)} Title\n\ntext|`;
      expect(linesWith(source, `kcm-h${level}`)).toEqual([0]);
    }
  });

  it("hides the # and the space after it while the cursor is elsewhere", () => {
    expect(hidden("## Title\n\ntext|")).toEqual(["## "]);
  });

  it("shows them while the cursor is on the line, at either end", () => {
    expect(hidden("## Ti|tle\n\ntext")).toEqual([]);
    expect(hidden("|## Title\n\ntext")).toEqual([]);
    expect(hidden("## Title|\n\ntext")).toEqual([]);
  });

  it("also hides closing hashes", () => {
    expect(hidden("## Title ##\n\ntext|")).toEqual(["## ", " ##"]);
  });

  it("styles a setext heading's text, and leaves its underline visible but quiet", () => {
    const source = "Title\n=====\n\ntext|";
    expect(linesWith(source, "kcm-h1")).toEqual([0]);
    expect(linesWith(source, "kcm-setext-underline")).toEqual([6]);
    expect(hidden(source)).toEqual([]);
  });

  it("does not treat a # without a space as a heading", () => {
    expect(linesWith("#nope\n\ntext|", "kcm-h1")).toEqual([]);
  });
});

describe("inline marks", () => {
  it("styles bold, and hides the ** except at the cursor", () => {
    expect(marked("a **bold** b|", "kcm-strong")).toEqual(["**bold**"]);
    expect(hidden("a **bold** b|")).toEqual(["**", "**"]);
    expect(hidden("a **bo|ld** b")).toEqual([]);
  });

  it("reveals the marks when the cursor touches either end of the element", () => {
    expect(hidden("a |**bold** b")).toEqual([]);
    expect(hidden("a **bold**| b")).toEqual([]);
    expect(hidden("a **bold** |b")).toEqual(["**", "**"]);
  });

  it("styles italic with * or _", () => {
    expect(marked("an *em* and _em_ x|", "kcm-em")).toEqual(["*em*", "_em_"]);
    expect(hidden("an *em* and _em_ x|")).toEqual(["*", "*", "_", "_"]);
  });

  it("styles strikethrough", () => {
    expect(marked("~~gone~~ x|", "kcm-del")).toEqual(["~~gone~~"]);
    expect(hidden("~~gone~~ x|")).toEqual(["~~", "~~"]);
  });

  it("styles inline code and hides the backticks", () => {
    expect(marked("use `code` x|", "kcm-code")).toEqual(["`code`"]);
    expect(hidden("use `code` x|")).toEqual(["`", "`"]);
  });

  it("styles bold inside italic, each hiding only its own marks", () => {
    expect(marked("*a **b** c* x|", "kcm-em")).toEqual(["*a **b** c*"]);
    expect(marked("*a **b** c* x|", "kcm-strong")).toEqual(["**b**"]);
    expect(hidden("*a **b** c* x|")).toEqual(["*", "*", "**", "**"]);
    // The cursor in the bold shows the bold's marks and the italic's.
    expect(hidden("*a **b|** c* x")).toEqual([]);
  });

  it("only reveals the element the cursor is in, on a line with others", () => {
    expect(hidden("**a** and **b|**")).toEqual(["**", "**"]);
  });

  it("treats a selection as touching what it overlaps", () => {
    const state = EditorState.create({
      doc: "x **bold** y",
      selection: { anchor: 0, head: 5 },
      extensions: [markdownSupport()],
    });
    expect(formatPieces(state).some((p) => p.kind === "hide")).toBe(false);
  });

  it("treats every cursor of a multi-cursor selection", () => {
    const state = EditorState.create({
      doc: "**a** **b** end",
      selection: EditorSelection.create(
        [EditorSelection.cursor(3), EditorSelection.cursor(14)],
        0,
      ),
      extensions: [
        EditorState.allowMultipleSelections.of(true),
        markdownSupport(),
      ],
    });
    const gone = formatPieces(state)
      .filter((p) => p.kind === "hide")
      .map((p) => text(state.doc.toString(), p));
    expect(gone).toEqual(["**", "**"]);
  });
});

describe("links", () => {
  it("shows only the text, as a link, while the cursor is away", () => {
    expect(marked("see [the docs](https://x.test/a) now|", "kcm-link")).toEqual(
      ["the docs"],
    );
    expect(hidden("see [the docs](https://x.test/a) now|")).toEqual([
      "[",
      "](https://x.test/a)",
    ]);
  });

  it("hides a title as well", () => {
    expect(hidden('[t](https://x.test "Title") x|')).toEqual([
      "[",
      '](https://x.test "Title")',
    ]);
  });

  it("shows everything, with the address quiet, while the cursor is in it", () => {
    expect(hidden("see [the do|cs](https://x.test/a) now")).toEqual([]);
    expect(marked("see [the do|cs](https://x.test/a) now", "kcm-url")).toEqual([
      "https://x.test/a",
    ]);
  });

  it("styles an autolink and hides its brackets", () => {
    expect(marked("<https://x.test> x|", "kcm-link")).toEqual([
      "https://x.test",
    ]);
    expect(hidden("<https://x.test> x|")).toEqual(["<", ">"]);
  });

  it("leaves an image alone (it has its own pass later)", () => {
    expect(marked("![alt](https://x.test/i.png) x|", "kcm-link")).toEqual([]);
    expect(hidden("![alt](https://x.test/i.png) x|")).toEqual([]);
  });
});

describe("blocks", () => {
  it("marks each line of a quote and hides its > when the cursor is elsewhere", () => {
    const source = "> one\n> two\n\ntext|";
    expect(linesWith(source, "kcm-quote")).toEqual([0, 6]);
    expect(hidden(source)).toEqual(["> ", "> "]);
  });

  it("shows the > only on the line the cursor is on", () => {
    expect(hidden("> one\n> tw|o\n\ntext")).toEqual(["> "]);
  });

  it("styles list markers and task markers, and hides nothing", () => {
    const source = "- one\n1. two\n- [x] done\n\ntext|";
    expect(marked(source, "kcm-list-mark")).toEqual(["-", "1.", "-"]);
    expect(marked(source, "kcm-task-marker")).toEqual(["[x]"]);
    expect(hidden(source)).toEqual([]);
  });

  it("gives a fenced block its lines, keeps the fences visible, and names the language", () => {
    const source = "```js\nlet a;\n```\n\ntext|";
    expect(linesWith(source, "kcm-code-block")).toEqual([0, 6, 13]);
    expect(linesWith(source, "kcm-code-first")).toEqual([0]);
    expect(linesWith(source, "kcm-code-last")).toEqual([13]);
    expect(marked(source, "kcm-fence")).toEqual(["```", "```"]);
    expect(marked(source, "kcm-code-info")).toEqual(["js"]);
    expect(hidden(source)).toEqual([]);
  });

  it("does not style the markdown inside a code block", () => {
    const source = "```\n**not bold**\n```\n\ntext|";
    expect(marked(source, "kcm-strong")).toEqual([]);
  });

  it("styles an indented code block", () => {
    expect(linesWith("para\n\n    code\n\ntext|", "kcm-code-block")).toEqual([
      6,
    ]);
  });

  it("turns a rule into a line, and shows the --- when the cursor is on it", () => {
    expect(linesWith("a\n\n---\n\nb|", "kcm-hr")).toEqual([3]);
    expect(hidden("a\n\n---\n\nb|")).toEqual(["---"]);
    expect(hidden("a\n\n--|-\n\nb")).toEqual([]);
  });
});

describe("when the editor is not being used", () => {
  it("hides every mark, wherever the cursor is", () => {
    const source =
      "## Ti|tle\n\nSome **bo|ld** and [a link](https://x.test).\n";
    const doc = source.replaceAll("|", "");
    const state = EditorState.create({
      doc,
      selection: { anchor: 4 },
      extensions: [markdownSupport()],
    });
    const hides = (reveal: boolean) =>
      formatPieces(state, 0, doc.length, reveal).filter(
        (p) => p.kind === "hide",
      );
    expect(hides(true).length).toBeLessThan(hides(false).length);
    expect(hides(false).map((p) => text(doc, p))).toEqual([
      "## ",
      "**",
      "**",
      "[",
      "](https://x.test)",
    ]);
  });
});

describe("what it leaves alone", () => {
  it("makes no pieces for plain text, tables, images or html", () => {
    expect(format("just text|").pieces).toEqual([]);
    expect(format("| a | b |\n|---|---|\n| 1 | 2 |\n\nx|").pieces).toEqual([]);
    expect(format("<b>raw</b> x|").pieces).toEqual([]);
  });

  it("never asks to hide empty or overlapping ranges", () => {
    const sources = [
      "# **bold** [l](u) `c` ~~s~~ _e_\n\n> # q\n\n- [ ] t\n\n---\n\n```\nx\n```\n",
      "***both***\n\n**_mix_** and _**mix**_\n",
    ];
    for (const source of sources) {
      const hides = format(source)
        .pieces.filter((p) => p.kind === "hide")
        .map((p) => p as { from: number; to: number })
        .sort((a, b) => a.from - b.from);
      for (const [i, h] of hides.entries()) {
        expect(h.to).toBeGreaterThan(h.from);
        const next = hides[i + 1];
        if (next) expect(next.from).toBeGreaterThanOrEqual(h.to);
      }
    }
  });
});
