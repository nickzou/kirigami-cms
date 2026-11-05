// @vitest-environment jsdom
import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";
import {
  enterAtLineStart,
  keepOffClosingFence,
  keepOffOpeningMarks,
  stepOverFence,
  stepOverMark,
} from "./editor-marks.js";
import { markdownSupport } from "./markdown-format.js";

const views: EditorView[] = [];
afterEach(() => {
  for (const view of views.splice(0)) view.destroy();
});

/** An editor on `doc` with the cursor at the `|` (there is none in the text). */
function open(source: string): EditorView {
  const at = source.indexOf("|");
  const doc = source.replace("|", "");
  const view = new EditorView({
    parent: document.body,
    state: EditorState.create({
      doc,
      selection: { anchor: at === -1 ? 0 : at },
      extensions: [markdownSupport(), keepOffOpeningMarks, keepOffClosingFence],
    }),
  });
  views.push(view);
  return view;
}
const head = (view: EditorView) => view.state.selection.main.head;
const text = (view: EditorView) => view.state.doc.toString();

describe("keepOffOpeningMarks", () => {
  it("moves a cursor in front of a heading's # to the start of its text", () => {
    const view = open("## Title\n\ntext");
    view.dispatch({ selection: { anchor: 0 } });
    expect(head(view)).toBe(3);
  });

  it("does the same for a quote and a rule", () => {
    const view = open("> quoted\n\n---\n");
    view.dispatch({ selection: { anchor: 0 } });
    expect(head(view)).toBe(2);
    view.dispatch({ selection: { anchor: 10 } });
    expect(head(view)).toBe(13);
  });

  it("leaves a cursor in plain text, and a selection, alone", () => {
    const view = open("plain\n\n## T");
    view.dispatch({ selection: { anchor: 0 } });
    expect(head(view)).toBe(0);
    view.dispatch({ selection: EditorSelection.range(7, 10) });
    expect(view.state.selection.main.from).toBe(7);
  });

  it("keeps a cursor off the mark after a change, too", () => {
    const view = open("## Title");
    view.dispatch({
      changes: { from: 0, insert: "x\n" },
      selection: { anchor: 2 },
    });
    expect(head(view)).toBe(5);
  });
});

describe("stepOverMark", () => {
  it("Backspace after a hidden closing ** moves in front of it, deleting nothing", () => {
    const view = open("a **bold**| b");
    expect(stepOverMark(-1)(view)).toBe(true);
    expect(head(view)).toBe(8);
    expect(text(view)).toBe("a **bold** b");
  });

  it("Delete in front of a hidden ** steps over it", () => {
    const view = open("a **bold|** b");
    expect(stepOverMark(1)(view)).toBe(true);
    expect(head(view)).toBe(10);
    expect(text(view)).toBe("a **bold** b");
  });

  it("steps over the hidden end of a link", () => {
    const view = open("[a link](https://x.test)| more");
    expect(stepOverMark(-1)(view)).toBe(true);
    expect(head(view)).toBe(7);
  });

  it("is left to the editor in plain text, with a selection, and at a line's opening mark", () => {
    const plain = open("some| text");
    expect(stepOverMark(-1)(plain)).toBe(false);
    const selected = open("a **bold** b");
    selected.dispatch({ selection: EditorSelection.range(0, 5) });
    expect(stepOverMark(-1)(selected)).toBe(false);
    // A heading's # is deleted with the key: it makes a paragraph of it.
    const heading = open("## Title");
    heading.dispatch({ selection: { anchor: 3 } });
    expect(stepOverMark(-1)(heading)).toBe(false);
  });
});

describe("enterAtLineStart", () => {
  it("adds a line above a heading when Enter is pressed at the start of its text", () => {
    const view = open("## Title");
    view.dispatch({ selection: { anchor: 3 } });
    expect(enterAtLineStart(view)).toBe(true);
    expect(text(view)).toBe("\n## Title");
    expect(head(view)).toBe(4);
  });

  it("is left to the editor elsewhere", () => {
    const view = open("## Ti|tle");
    expect(enterAtLineStart(view)).toBe(false);
    const plain = open("|plain");
    expect(enterAtLineStart(plain)).toBe(false);
  });
});

describe("code fences", () => {
  const code = "```js\nlet a;\nlet b;\n```\n\nafter";
  // Lines start at 0 (open), 6, 13, 20 (close), 24 (blank), 25 (after).

  it("never leaves a cursor on the closing fence: forward goes on past the block", () => {
    const view = open(`${code}`);
    view.dispatch({ selection: { anchor: 19 } });
    view.dispatch({ selection: { anchor: 22 } });
    expect(head(view)).toBe(24);
  });

  it("including from the very end of the fence's line, where a vertical move lands", () => {
    const view = open(code);
    view.dispatch({ selection: { anchor: 19 } });
    view.dispatch({ selection: { anchor: 23 } });
    expect(head(view)).toBe(24);
  });

  it("and backward goes to the end of the code", () => {
    const view = open(code);
    view.dispatch({ selection: { anchor: 25 } });
    view.dispatch({ selection: { anchor: 22 } });
    expect(head(view)).toBe(19);
  });

  it("with nothing after the block, stays in the code", () => {
    const view = open("```\nx\n```");
    view.dispatch({ selection: { anchor: 3 } });
    view.dispatch({ selection: { anchor: 7 } });
    expect(head(view)).toBe(5);
  });

  it("Backspace at the start of the first line of code does not join it to the fence", () => {
    const view = open(code);
    view.dispatch({ selection: { anchor: 6 } });
    expect(stepOverFence(-1)(view)).toBe(true);
    expect(head(view)).toBe(5);
    expect(view.state.doc.toString()).toBe(code);
  });

  it("Delete at the end of the last line of code does not join it to the fence", () => {
    const view = open(code);
    view.dispatch({ selection: { anchor: 19 } });
    expect(stepOverFence(1)(view)).toBe(true);
    expect(head(view)).toBe(24);
    expect(view.state.doc.toString()).toBe(code);
  });

  it("Backspace on the line after the block moves to the end of the code", () => {
    const view = open("```\nx\n```\ny");
    view.dispatch({ selection: { anchor: 10 } });
    expect(stepOverFence(-1)(view)).toBe(true);
    expect(head(view)).toBe(5);
  });

  it("leaves other places to the editor", () => {
    const view = open(code);
    view.dispatch({ selection: { anchor: 8 } });
    expect(stepOverFence(-1)(view)).toBe(false);
    view.dispatch({ selection: { anchor: 13 } });
    expect(stepOverFence(-1)(view)).toBe(false);
    const plain = open("one\ntwo");
    plain.dispatch({ selection: { anchor: 4 } });
    expect(stepOverFence(-1)(plain)).toBe(false);
  });
});
