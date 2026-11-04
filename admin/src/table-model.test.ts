import { EditorSelection, EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import { markdownSupport } from "./markdown-format.js";
import { type TableBlock, tablesToDraw } from "./table-model.js";

function tables(source: string, reveal = true): TableBlock[] {
  const bar = source.indexOf("|CURSOR");
  const doc = source.replace("|CURSOR", "");
  const state = EditorState.create({
    doc,
    selection: { anchor: bar === -1 ? doc.length : bar },
    extensions: [markdownSupport()],
  });
  return tablesToDraw(state, reveal);
}

const TABLE = "| a | b |\n|:--|--:|\n| 1 | 2 |\n| 3 | 4 |\n";

describe("tablesToDraw", () => {
  it("reads the header, the rows and how each column lines up", () => {
    const [block] = tables(`${TABLE}\nafter`);
    expect(block?.model).toEqual({
      align: ["left", "right"],
      head: [[{ t: "text", s: "a" }], [{ t: "text", s: "b" }]],
      rows: [
        [[{ t: "text", s: "1" }], [{ t: "text", s: "2" }]],
        [[{ t: "text", s: "3" }], [{ t: "text", s: "4" }]],
      ],
    });
    expect(block?.from).toBe(0);
  });

  it("says where the table is: from its first line's start to its last line's end", () => {
    const [block] = tables(`intro\n\n${TABLE}\nafter`);
    expect(block?.from).toBe(7);
    expect(block?.to).toBe(7 + TABLE.trimEnd().length);
  });

  it("knows center, left and no alignment", () => {
    const [block] = tables("| a | b | c |\n|:-:|:--|---|\n| 1 | 2 | 3 |\n\nx");
    expect(block?.model.align).toEqual(["center", "left", null]);
  });

  it("keeps the formatting in a cell", () => {
    const [block] = tables(
      "| h |\n|---|\n| **b** and *i* and ~~s~~ and `c` and [l](https://x.test) |\n\nx",
    );
    expect(block?.model.rows[0]?.[0]).toEqual([
      { t: "strong", c: [{ t: "text", s: "b" }] },
      { t: "text", s: " and " },
      { t: "em", c: [{ t: "text", s: "i" }] },
      { t: "text", s: " and " },
      { t: "del", c: [{ t: "text", s: "s" }] },
      { t: "text", s: " and " },
      { t: "code", s: "c" },
      { t: "text", s: " and " },
      { t: "link", href: "https://x.test", c: [{ t: "text", s: "l" }] },
    ]);
  });

  it("keeps an image in a cell, with its description, address and title", () => {
    const [block] = tables(
      '| h |\n|---|\n| ![alt](http://x.test/i.png "T") |\n\nx',
    );
    expect(block?.model.rows[0]?.[0]).toEqual([
      { t: "image", src: "http://x.test/i.png", alt: "alt", title: "T" },
    ]);
  });

  it("keeps escapes and html as text, without the backslash", () => {
    const [block] = tables("| h |\n|---|\n| a \\* b <i>x</i> |\n\nx");
    const text = (block?.model.rows[0]?.[0] ?? [])
      .map((part) => (part.t === "text" ? part.s : "?"))
      .join("");
    expect(text).toBe("a * b <i>x</i>");
  });

  it("gives every row the header's columns: extra cells go, missing ones are empty", () => {
    const [block] = tables("| a | b |\n|---|---|\n| 1 |\n| 1 | 2 | 3 |\n\nx");
    expect(block?.model.rows).toEqual([
      [[{ t: "text", s: "1" }], []],
      [[{ t: "text", s: "1" }], [{ t: "text", s: "2" }]],
    ]);
  });

  it("finds every table in the text", () => {
    expect(tables(`${TABLE}\ntext\n\n${TABLE}\nend`)).toHaveLength(2);
  });

  it("leaves a table the cursor is in (or touches) as text", () => {
    expect(tables(`| a | |CURSORb |\n|---|---|\n| 1 | 2 |\n\nx`)).toHaveLength(
      0,
    );
    expect(tables(`|CURSOR| a | b |\n|---|---|\n| 1 | 2 |\n\nx`)).toHaveLength(
      0,
    );
    expect(tables(`| a | b |\n|---|---|\n| 1 | 2 ||CURSOR\n\nx`)).toHaveLength(
      0,
    );
    expect(tables(`| a | b |\n|---|---|\n| 1 | 2 |\n\n|CURSORx`)).toHaveLength(
      1,
    );
  });

  it("treats a selection that overlaps the table as being in it", () => {
    const doc = `${TABLE}\nx`;
    const state = EditorState.create({
      doc,
      selection: EditorSelection.single(doc.length - 4, doc.length),
      extensions: [markdownSupport()],
    });
    expect(tablesToDraw(state)).toHaveLength(0);
  });

  it("draws every table when the editor is not in use, wherever the cursor is", () => {
    expect(
      tables(`| a | |CURSORb |\n|---|---|\n| 1 | 2 |\n\nx`, false),
    ).toHaveLength(1);
  });

  it("leaves a table inside a list or a quote as text", () => {
    expect(tables("- item\n\n  | a |\n  |---|\n  | 1 |\n\nx")).toHaveLength(0);
    expect(tables("> | a |\n> |---|\n> | 1 |\n\nx")).toHaveLength(0);
  });

  it("is not fooled by text that only looks like a table", () => {
    expect(tables("| just | pipes |\n\nx")).toHaveLength(0);
    expect(tables("a | b\n\nx")).toHaveLength(0);
  });
});
