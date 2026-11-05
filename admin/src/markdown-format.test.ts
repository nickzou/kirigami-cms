import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import {
  formatPieces,
  linkAt,
  markdownSupport,
  type Piece,
} from "./markdown-format.js";

/**
 * Formats `doc`, with the cursor at the `|` in it (there is no `|` in the text
 * the editor sees), or at the very end when there is none. The cursor changes
 * nothing: marks are hidden wherever it is.
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

  it("hides the # and the space after it", () => {
    expect(hidden("## Title\n\ntext|")).toEqual(["## "]);
  });

  it("hides them with the cursor on the line, at either end", () => {
    expect(hidden("## Ti|tle\n\ntext")).toEqual(["## "]);
    expect(hidden("|## Title\n\ntext")).toEqual(["## "]);
    expect(hidden("## Title|\n\ntext")).toEqual(["## "]);
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
  it("styles bold, and hides the **, wherever the cursor is", () => {
    expect(marked("a **bold** b|", "kcm-strong")).toEqual(["**bold**"]);
    expect(hidden("a **bold** b|")).toEqual(["**", "**"]);
    expect(hidden("a **bo|ld** b")).toEqual(["**", "**"]);
    expect(hidden("a |**bold** b")).toEqual(["**", "**"]);
    expect(hidden("a **bold**| b")).toEqual(["**", "**"]);
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
    expect(hidden("*a **b|** c* x")).toEqual(["*", "*", "**", "**"]);
  });

  it("hides the marks of every element on a line", () => {
    expect(hidden("**a** and **b|**")).toEqual(["**", "**", "**", "**"]);
  });

  it("does not look at a selection", () => {
    const state = EditorState.create({
      doc: "x **bold** y",
      selection: { anchor: 0, head: 5 },
      extensions: [markdownSupport()],
    });
    expect(formatPieces(state).filter((p) => p.kind === "hide")).toHaveLength(
      2,
    );
  });
});

describe("links", () => {
  it("shows only the text, as a link", () => {
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

  it("keeps the address out of sight with the cursor in the link", () => {
    expect(hidden("see [the do|cs](https://x.test/a) now")).toEqual([
      "[",
      "](https://x.test/a)",
    ]);
  });

  it("styles an autolink and hides its brackets", () => {
    expect(marked("<https://x.test> x|", "kcm-link")).toEqual([
      "https://x.test",
    ]);
    expect(hidden("<https://x.test> x|")).toEqual(["<", ">"]);
  });

  it("shows an image in place of its markdown, wherever the cursor is", () => {
    const image = (source: string) =>
      format(source).pieces.filter((p) => p.kind === "image");
    expect(image('![alt text](https://x.test/i.png "A title") x|')).toEqual([
      {
        kind: "image",
        from: 0,
        to: 43,
        alt: "alt text",
        src: "https://x.test/i.png",
        title: "A title",
      },
    ]);
    expect(image("![](rel.png) x|")).toMatchObject([
      { alt: "", src: "rel.png" },
    ]);
    expect(image("![alt](https://x.test/i.png) x|")).toHaveLength(1);
    expect(image("![al|t](https://x.test/i.png) x")).toHaveLength(1);
    expect(image("![alt](https://x.test/i.png)| x")).toHaveLength(1);
  });

  it("does not make a link of an image", () => {
    expect(marked("![alt](https://x.test/i.png) x|", "kcm-link")).toEqual([]);
    expect(hidden("![alt](https://x.test/i.png) x|")).toEqual([]);
  });

  it("leaves a table's cells to the table: no formatting inside it", () => {
    const source =
      "| **a** | ![i](http://x.test/i.png) |\n|---|---|\n| `b` | [l](u) |\n\nx|";
    const { pieces } = format(source);
    expect(pieces).toEqual([]);
  });
});

describe("blocks", () => {
  it("marks each line of a quote and hides its >", () => {
    const source = "> one\n> two\n\ntext|";
    expect(linesWith(source, "kcm-quote")).toEqual([0, 6]);
    expect(hidden(source)).toEqual(["> ", "> "]);
  });

  it("hides the > on the line the cursor is on, too", () => {
    expect(hidden("> one\n> tw|o\n\ntext")).toEqual(["> ", "> "]);
  });

  it("styles list markers, and hides nothing", () => {
    const source = "- one\n1. two\n\ntext|";
    expect(marked(source, "kcm-list-mark")).toEqual(["-", "1."]);
    expect(hidden(source)).toEqual([]);
  });

  it("shows a task's [ ] or [x] as a checkbox, wherever the cursor is", () => {
    const boxes = (source: string) =>
      format(source)
        .pieces.filter((p) => p.kind === "checkbox")
        .map((p) => (p as { checked: boolean }).checked);
    expect(boxes("- [ ] a\n- [x] b\n- [X] c\n\ntext|")).toEqual([
      false,
      true,
      true,
    ]);
    expect(boxes("- [|x] b\n\ntext")).toEqual([true]);
    expect(boxes("- [x] b|\n\ntext")).toEqual([true]);
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

  it("turns a rule into a line, hiding the ---", () => {
    expect(linesWith("a\n\n---\n\nb|", "kcm-hr")).toEqual([3]);
    expect(hidden("a\n\n---\n\nb|")).toEqual(["---"]);
    expect(hidden("a\n\n--|-\n\nb")).toEqual(["---"]);
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

describe("linkAt", () => {
  const at = (source: string): string | undefined => {
    const bar = source.indexOf("|");
    const doc = source.replace("|", "");
    return linkAt(
      EditorState.create({ doc, extensions: [markdownSupport()] }),
      bar,
    );
  };

  it("finds the address from a link's text or its address", () => {
    expect(at("see [the |docs](https://x.test/a) now")).toBe(
      "https://x.test/a",
    );
    expect(at("see [the docs](https://x|.test/a) now")).toBe(
      "https://x.test/a",
    );
  });

  it("finds an autolink and a bare address", () => {
    expect(at("<https://x|.test>")).toBe("https://x.test");
    expect(at("go to https://x|.test/b now")).toBe("https://x.test/b");
  });

  it("finds nothing in plain text or in an image on its own", () => {
    expect(at("just te|xt")).toBeUndefined();
    expect(at("![al|t](https://x.test/i.png)")).toBeUndefined();
  });

  it("finds the link around an image", () => {
    expect(at("[![al|t](https://x.test/i.png)](https://x.test/page)")).toBe(
      "https://x.test/page",
    );
  });
});
