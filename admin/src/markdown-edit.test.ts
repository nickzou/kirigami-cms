import { EditorSelection, EditorState } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { describe, expect, it } from "vitest";
import {
  continueMarkup,
  type FormatAction,
  formatChange,
  unlink,
} from "./markdown-edit.js";
import { markdownSupport } from "./markdown-format.js";

/**
 * Writing a state with its selection in the text: «…» is a selected stretch,
 * ¦ is a cursor. `show` writes it back the same way.
 */
function parse(source: string): EditorState {
  const ranges: ReturnType<typeof EditorSelection.range>[] = [];
  let doc = "";
  let open = -1;
  for (const ch of source) {
    if (ch === "«") open = doc.length;
    else if (ch === "»") {
      ranges.push(EditorSelection.range(open, doc.length));
      open = -1;
    } else if (ch === "¦") ranges.push(EditorSelection.cursor(doc.length));
    else doc += ch;
  }
  return EditorState.create({
    doc,
    selection: ranges.length ? EditorSelection.create(ranges) : undefined,
    extensions: [
      markdownSupport(),
      EditorState.allowMultipleSelections.of(true),
    ],
  });
}

function show(state: EditorState): string {
  const marks: [number, string][] = [];
  for (const r of state.selection.ranges) {
    if (r.empty) marks.push([r.from, "¦"]);
    else marks.push([r.from, "«"], [r.to, "»"]);
  }
  marks.sort((a, b) => b[0] - a[0]);
  let out = state.doc.toString();
  for (const [pos, mark] of marks)
    out = out.slice(0, pos) + mark + out.slice(pos);
  return out;
}

const apply = (source: string, action: FormatAction): string => {
  const state = parse(source);
  const spec = formatChange(state, action);
  return show(spec ? state.update(spec).state : state);
};

describe("bold and italic", () => {
  it("wraps the selected text and keeps it selected", () => {
    expect(apply("a «word» b", "bold")).toBe("a **«word»** b");
    expect(apply("a «word» b", "italic")).toBe("a *«word»* b");
  });

  it("takes the marks off when the cursor or selection is in the element", () => {
    expect(apply("a **wo¦rd** b", "bold")).toBe("a wo¦rd b");
    expect(apply("a **«word»** b", "bold")).toBe("a «word» b");
    expect(apply("a *wo¦rd* b", "italic")).toBe("a wo¦rd b");
    expect(apply("a _wo¦rd_ b", "italic")).toBe("a wo¦rd b");
  });

  it("takes the marks off when the whole element, marks and all, is selected", () => {
    expect(apply("a «**word**» b", "bold")).toBe("a «word» b");
  });

  it("wraps the word the cursor is in", () => {
    expect(apply("a wo¦rd b", "bold")).toBe("a **wo¦rd** b");
  });

  it("puts a pair of marks, with the cursor between, where there is no word", () => {
    expect(apply("a ¦ b", "bold")).toBe("a **¦** b");
    expect(apply("¦", "italic")).toBe("*¦*");
  });

  it("makes bold text italic as well, and not the other way round by mistake", () => {
    expect(apply("**«word»**", "italic")).toBe("***«word»***");
    // Italic inside bold: the cursor is in the bold, not in an italic, so it wraps.
    expect(apply("**wo¦rd**", "italic")).toBe("***wo¦rd***");
  });

  it("wraps each line of a selection that spans lines, leaving blank lines and edge spaces out", () => {
    expect(apply("«one  \n\n  two»", "bold")).toBe("**«one**  \n\n  **two»**");
  });

  it("does the same for every cursor of a multi-cursor selection", () => {
    expect(apply("a¦ b¦", "bold")).toBe("**a¦** **b¦**");
  });

  it("changes only the marks: taking them off again gives back the text", () => {
    const start = "Some «bold» and *it¦alic* words.";
    const state = parse(start);
    const spec = formatChange(state, "bold");
    const wrapped = state.update(spec as never).state;
    const back = wrapped.update(formatChange(wrapped, "bold") as never).state;
    expect(back.doc.toString()).toBe(state.doc.toString());
  });
});

describe("code", () => {
  it("wraps part of a line in backticks, and takes them off", () => {
    expect(apply("use «this» now", "code")).toBe("use `«this»` now");
    expect(apply("use `th¦is` now", "code")).toBe("use th¦is now");
  });

  it("makes a fenced block of several lines", () => {
    expect(apply("«one\ntwo»", "code")).toBe("```\n«one\ntwo»\n```");
  });

  it("takes a fenced block off again", () => {
    expect(apply("```\nco¦de\n```\nafter", "code")).toBe("co¦de\nafter");
  });
});

describe("heading", () => {
  it("goes none, #, ##, ###, none", () => {
    expect(apply("Ti¦tle", "heading")).toBe(
      "# Ti¦tle".replace("¦", "¦").replace("# Ti", "# Ti"),
    );
  });

  it("cycles through the levels", () => {
    let state = parse("Title¦");
    const seen: string[] = [];
    for (let i = 0; i < 4; i++) {
      state = state.update(formatChange(state, "heading") as never).state;
      seen.push(state.doc.toString());
    }
    expect(seen).toEqual(["# Title", "## Title", "### Title", "Title"]);
  });

  it("keeps the cursor on the same letter", () => {
    expect(apply("Ti¦tle", "heading")).toBe("# Ti¦tle");
  });

  it("sets every selected line to the same level, from the first one's", () => {
    expect(apply("«one\n## two»", "heading")).toBe("«# one\n# two»");
  });

  it("leaves list items, quotes and code alone", () => {
    expect(apply("- ite¦m", "heading")).toBe("- ite¦m");
    expect(apply("> quo¦te", "heading")).toBe("> quo¦te");
  });

  it("starts a heading on an empty line", () => {
    expect(apply("¦", "heading")).toBe("# ¦");
  });
});

describe("link", () => {
  it("makes a link of the selected text, leaving the address to the popover", () => {
    expect(apply("see «the docs» now", "link")).toBe("see [«the docs»]() now");
  });

  it("makes a link with text to type when nothing is selected", () => {
    expect(apply("see ¦ now", "link")).toBe("see [«link text»]() now");
  });

  it("makes the selected web address the link's address", () => {
    expect(apply("«https://x.test/a»", "link")).toBe(
      "[«link text»](https://x.test/a)",
    );
  });

  it("leaves a link that is there to its popover", () => {
    const state = parse("see [the d¦ocs](https://x.test) now");
    expect(formatChange(state, "link")).toBeUndefined();
  });

  it("takes a link off, keeping its text", () => {
    const state = parse("see [the d¦ocs](https://x.test) now");
    const spec = unlink(state);
    expect(spec).toBeDefined();
    expect(show(state.update(spec as never).state)).toBe("see «the docs» now");
  });

  it("takes off a link with no address yet", () => {
    const state = parse("see [the d¦ocs]() now");
    expect(show(state.update(unlink(state) as never).state)).toBe(
      "see «the docs» now",
    );
  });

  it("finds no link to take off in plain text, or at the link's edges", () => {
    expect(unlink(parse("plain ¦ text"))).toBeUndefined();
    expect(unlink(parse("a ¦[t](u) b"))).toBeUndefined();
    expect(unlink(parse("a [t](u)¦ b"))).toBeUndefined();
  });
});

describe("bullets", () => {
  it("makes lines a bulleted list, and back", () => {
    expect(apply("«one\ntwo»", "bullets")).toBe("«- one\n- two»");
    expect(apply("«- one\n- two»", "bullets")).toBe("«one\ntwo»");
  });

  it("keeps a line's indentation, and skips blank lines", () => {
    expect(apply("«  one\n\ntwo»", "bullets")).toBe("«  - one\n\n- two»");
  });

  it("finishes a half-done list by bulleting the rest", () => {
    expect(apply("«- one\ntwo»", "bullets")).toBe("«- one\n- two»");
  });

  it("turns a numbered list into bullets", () => {
    expect(apply("«1. one\n2. two»", "bullets")).toBe("«- one\n- two»");
  });

  it("bullets the line the cursor is on, even an empty one", () => {
    expect(apply("one ¦two", "bullets")).toBe("- one ¦two");
    expect(apply("¦", "bullets")).toBe("- ¦");
  });
});

/** Presses Enter in a state; returns the text it leaves, or "unhandled". */
function enter(source: string): string {
  let state = parse(source);
  const view = {
    get state() {
      return state;
    },
    composing: false,
    dispatch(spec: Parameters<EditorState["update"]>[0]) {
      state = state.update(spec).state;
    },
  } as unknown as EditorView;
  return continueMarkup(view) ? show(state) : "unhandled";
}

describe("Enter", () => {
  it("starts the next bullet, with the same marker and indentation", () => {
    expect(enter("- one¦")).toBe("- one\n- ¦");
    expect(enter("* one¦")).toBe("* one\n* ¦");
    expect(enter("  - one¦")).toBe("  - one\n  - ¦");
  });

  it("counts on in a numbered list, keeping . or )", () => {
    expect(enter("1. one¦")).toBe("1. one\n2. ¦");
    expect(enter("9) one¦")).toBe("9) one\n10) ¦");
  });

  it("starts the next task with an unticked box", () => {
    expect(enter("- [x] done¦")).toBe("- [x] done\n- [ ] ¦");
    expect(enter("- [ ] todo¦")).toBe("- [ ] todo\n- [ ] ¦");
  });

  it("carries on a quote, and a list inside one", () => {
    expect(enter("> quote¦")).toBe("> quote\n> ¦");
    expect(enter("> - item¦")).toBe("> - item\n> - ¦");
  });

  it("moves the rest of the line to the next item", () => {
    expect(enter("- one¦ two")).toBe("- one\n- ¦ two");
  });

  it("ends the list on an empty item", () => {
    expect(enter("- one\n- ¦")).toBe("- one\n¦");
    expect(enter("1. one\n2. ¦")).toBe("1. one\n¦");
    expect(enter("> ¦")).toBe("¦");
    expect(enter("- [ ] ¦")).toBe("¦");
  });

  it("is left to the editor on a plain line, a selection, or inside the marker", () => {
    expect(enter("just text¦")).toBe("unhandled");
    expect(enter("- «one»")).toBe("unhandled");
    expect(enter("-¦ one")).toBe("unhandled");
    expect(enter("¦- one")).toBe("unhandled");
  });

  it("is left to the editor inside code and tables", () => {
    expect(enter("```\n- not a list¦\n```")).toBe("unhandled");
    expect(enter("    - indented code¦")).toBe("unhandled");
  });

  it("changes nothing but the new line", () => {
    const before = "- one\n- two¦\n- three";
    const after = enter(before);
    expect(after.replace("¦", "").replace("\n- \n", "\n")).toBe(
      "- one\n- two\n- three".replace("- two", "- two"),
    );
  });
});
