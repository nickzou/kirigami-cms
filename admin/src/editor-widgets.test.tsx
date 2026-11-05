// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MarkdownEditor } from "./components/MarkdownEditor/MarkdownEditor.js";
import {
  buildTable,
  isLoadableImage,
  safeLinkTarget,
} from "./editor-widgets.js";
import { editorText, editorView } from "./test-editor.js";

afterEach(cleanup);

const box = () => screen.getByLabelText("Markdown");
/** Puts the editor in use, the way clicking into it does. */
const focus = async (view: ReturnType<typeof editorView>) => {
  act(() => view.focus());
  // It tells the state about the focus on the next tick.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 40));
  });
};
const open = (value: string, onChange: (v: string) => void = () => {}) =>
  render(<MarkdownEditor value={value} onChange={onChange} />);

describe("isLoadableImage", () => {
  it("is true for web addresses only", () => {
    expect(isLoadableImage("https://x.test/i.png")).toBe(true);
    expect(isLoadableImage("http://x.test/i.png")).toBe(true);
    for (const src of [
      "rel.png",
      "./rel.png",
      "/abs.png",
      "data:image/png;base64,AAAA",
      "javascript:alert(1)",
      "file:///etc/passwd",
      "",
    ]) {
      expect(isLoadableImage(src)).toBe(false);
    }
  });
});

describe("safeLinkTarget", () => {
  const base = "http://localhost:3000/admin/pages/a.md";
  it("allows web and mail addresses", () => {
    expect(safeLinkTarget("https://x.test/a", base)).toBe("https://x.test/a");
    expect(safeLinkTarget("mailto:a@x.test", base)).toBe("mailto:a@x.test");
  });
  it("resolves an address on the same site against the page", () => {
    expect(safeLinkTarget("/about/", base)).toBe(
      "http://localhost:3000/about/",
    );
  });
  it("allows nothing that runs or reads files", () => {
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,<b>x</b>",
      "file:///etc/passwd",
      "vbscript:x",
    ]) {
      expect(safeLinkTarget(url, base)).toBeUndefined();
    }
  });
});

describe("buildTable", () => {
  it("makes a real table with a header row and a body", () => {
    const table = buildTable({
      align: ["left", "right", null],
      head: [
        [{ t: "text", s: "A" }],
        [{ t: "text", s: "B" }],
        [{ t: "text", s: "C" }],
      ],
      rows: [
        [
          [{ t: "text", s: "1" }],
          [{ t: "text", s: "2" }],
          [{ t: "text", s: "3" }],
        ],
      ],
    });
    expect(table.tHead?.rows[0]?.cells).toHaveLength(3);
    expect(table.tHead?.rows[0]?.cells[0]?.tagName).toBe("TH");
    expect(table.tBodies[0]?.rows[0]?.cells[1]?.tagName).toBe("TD");
    expect(table.tBodies[0]?.rows[0]?.cells[1]?.style.textAlign).toBe("right");
    expect(table.tBodies[0]?.rows[0]?.cells[2]?.style.textAlign).toBe("");
  });

  it("sets cell text as text, never as markup", () => {
    const table = buildTable({
      align: [null],
      head: [[{ t: "text", s: '<img src=x onerror="alert(1)">' }]],
      rows: [[[{ t: "code", s: "<script>x</script>" }]]],
    });
    expect(table.querySelector("img")).toBeNull();
    expect(table.querySelector("script")).toBeNull();
    expect(table.tHead?.textContent).toBe('<img src=x onerror="alert(1)">');
    expect(table.querySelector("code")?.textContent).toBe("<script>x</script>");
  });

  it("does not make links to follow", () => {
    const table = buildTable({
      align: [null],
      head: [
        [
          {
            t: "link",
            href: "javascript:alert(1)",
            c: [{ t: "text", s: "x" }],
          },
        ],
      ],
      rows: [],
    });
    expect(table.querySelector("a")).toBeNull();
    expect(table.querySelector(".kcm-link")?.textContent).toBe("x");
  });
});

describe("tables in the editor", () => {
  const source = "intro\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\nafter\n";

  it("shows a table as a table, and leaves the text exactly as it was", () => {
    open(source);
    expect(box().querySelector("table.kcm-table")).not.toBeNull();
    expect(box().querySelectorAll("th")).toHaveLength(2);
    expect(box().textContent).not.toContain("|---|");
    expect(editorText(box())).toBe(source);
  });

  it("shows the markdown while the cursor is in the table, and the table again when it leaves", async () => {
    open(source);
    const view = editorView(box());
    await focus(view);
    act(() =>
      view.dispatch({ selection: { anchor: source.indexOf("| 1") + 3 } }),
    );
    expect(box().querySelector("table")).toBeNull();
    expect(box().textContent).toContain("|---|---|");

    act(() => view.dispatch({ selection: { anchor: 0 } }));
    expect(box().querySelector("table")).not.toBeNull();
  });

  it("opens the table when ArrowUp is pressed on the line below it, and when ArrowDown is pressed on the line above", async () => {
    open(source);
    const view = editorView(box());
    await focus(view);
    const below = source.indexOf("\nafter");
    act(() => view.dispatch({ selection: { anchor: below } })); // the blank line after the table
    expect(box().querySelector("table")).not.toBeNull();
    act(() => {
      fireEvent.keyDown(view.contentDOM, { key: "ArrowUp" });
    });
    expect(box().querySelector("table")).toBeNull();
    expect(box().textContent).toContain("|---|---|");
    // The cursor is at the end of the table's last row, ready to go on up through its text.
    expect(view.state.selection.main.head).toBe(
      source.indexOf("| 1 | 2 |") + 9,
    );

    act(() =>
      view.dispatch({ selection: { anchor: source.indexOf("\n| a") } }),
    ); // the blank line before it
    expect(box().querySelector("table")).not.toBeNull();
    act(() => {
      fireEvent.keyDown(view.contentDOM, { key: "ArrowDown" });
    });
    expect(box().querySelector("table")).toBeNull();
    expect(view.state.selection.main.head).toBe(source.indexOf("| a"));
  });

  it("leaves the arrow keys alone away from a table", async () => {
    open(source);
    const view = editorView(box());
    await focus(view);
    act(() => view.dispatch({ selection: { anchor: 2 } })); // inside "intro"
    act(() => {
      fireEvent.keyDown(view.contentDOM, { key: "ArrowDown" });
    });
    expect(box().querySelector("table")).not.toBeNull();
  });

  it("shows the table when the editor is not in use, wherever the cursor was", () => {
    open(source);
    const view = editorView(box());
    // The cursor is in the table but the editor is not focused (a page just opened).
    act(() =>
      view.dispatch({ selection: { anchor: source.indexOf("| 1") + 3 } }),
    );
    expect(box().querySelector("table")).not.toBeNull();
  });

  it("updates the table as the text changes", () => {
    open(source);
    const view = editorView(box());
    act(() =>
      view.dispatch({
        changes: {
          from: source.indexOf("| 1"),
          to: source.indexOf("| 1") + 9,
          insert: "| 7 | 8 |",
        },
      }),
    );
    expect(box().querySelector("tbody")?.textContent).toBe("78");
  });
});

describe("images in the editor", () => {
  it("shows a web image as an image, with its description and title", () => {
    open('![A cat](https://x.test/cat.png "Meow") text\n');
    const image = box().querySelector("img.kcm-image") as HTMLImageElement;
    expect(image.src).toBe("https://x.test/cat.png");
    expect(image.alt).toBe("A cat");
    expect(image.title).toBe("Meow");
    expect(box().textContent).not.toContain("![");
  });

  it("shows an image with no web address as a note, with its description and where it should come from", () => {
    open("![A cat](photos/cat.png) text\n");
    const missing = box().querySelector(".kcm-image-missing") as HTMLElement;
    expect(missing.textContent).toContain("A cat");
    expect(missing.textContent).toContain("photos/cat.png");
    expect(missing.textContent).toContain("Not available yet");
    expect(missing.getAttribute("role")).toBe("img");
    expect(missing.getAttribute("aria-label")).toBe(
      "Image not available yet: A cat",
    );
    expect(box().querySelector("img.kcm-image")).toBeNull();
  });

  it("falls back to the note when an image does not load", () => {
    open("![A cat](https://x.test/gone.png)\n");
    const image = box().querySelector("img.kcm-image") as HTMLImageElement;
    act(() => {
      image.dispatchEvent(new Event("error"));
    });
    expect(box().querySelector("img.kcm-image")).toBeNull();
    expect(box().querySelector(".kcm-image-missing")?.textContent).toContain(
      "https://x.test/gone.png",
    );
  });

  it("does not mistake the note that replaces a broken image for typing", async () => {
    const source = "intro\n\n![A cat](https://x.test/gone.png)\n\nafter\n";
    const onChange = vi.fn();
    open(source, onChange);
    const image = box().querySelector("img.kcm-image") as HTMLImageElement;
    act(() => {
      image.dispatchEvent(new Event("error"));
    });
    // The editor reads changes to its page when the browser reports them, a moment later.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
    });
    expect(box().querySelector(".kcm-image-missing")).not.toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    expect(editorText(box())).toBe(source);
  });

  it("does the same for a broken image inside a table", async () => {
    const source =
      "| h |\n|---|\n| ![A cat](https://x.test/gone.png) |\n\nafter\n";
    const onChange = vi.fn();
    open(source, onChange);
    const image = box().querySelector("img.kcm-image") as HTMLImageElement;
    act(() => {
      image.dispatchEvent(new Event("error"));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
    });
    expect(box().querySelector(".kcm-image-missing")).not.toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    expect(editorText(box())).toBe(source);
  });

  it("never loads an address that is not a web one", () => {
    open("![x](javascript:alert(1)) ![y](data:image/png;base64,AAAA)\n");
    expect(box().querySelector("img.kcm-image")).toBeNull();
  });

  it("keeps drawing the image with the cursor beside it, never as markdown", async () => {
    const source = "![A cat](https://x.test/cat.png) text\n";
    open(source);
    const view = editorView(box());
    await focus(view);
    act(() => view.dispatch({ selection: { anchor: 0 } }));
    expect(box().querySelector("img.kcm-image")).not.toBeNull();
    expect(box().textContent).not.toContain("![A cat]");
    expect(editorText(box())).toBe(source);
  });
});

describe("task boxes in the editor", () => {
  const source = "- [ ] first\n- [x] second\n- plain\n";

  it("shows each task's marker as a checkbox in the state it has", () => {
    open(source);
    const boxes = [
      ...box().querySelectorAll<HTMLInputElement>("input.kcm-checkbox"),
    ];
    expect(boxes.map((b) => b.checked)).toEqual([false, true]);
    expect(box().textContent).not.toContain("[ ]");
    expect(editorText(box())).toBe(source);
  });

  it("turns [ ] into [x] when a box is clicked, changing only that character", () => {
    const onChange = vi.fn();
    open(source, onChange);
    const first = box().querySelector("input.kcm-checkbox") as HTMLInputElement;
    fireEvent.click(first);
    expect(editorText(box())).toBe("- [x] first\n- [x] second\n- plain\n");
    expect(onChange).toHaveBeenLastCalledWith(
      "- [x] first\n- [x] second\n- plain\n",
    );
  });

  it("turns [x] into [ ] when a ticked box is clicked", () => {
    open(source);
    const boxes =
      box().querySelectorAll<HTMLInputElement>("input.kcm-checkbox");
    fireEvent.click(boxes[1] as HTMLInputElement);
    expect(editorText(box())).toBe("- [ ] first\n- [ ] second\n- plain\n");
  });

  it("can be undone", async () => {
    const { undo } = await import("@codemirror/commands");
    open(source);
    fireEvent.click(
      box().querySelector("input.kcm-checkbox") as HTMLInputElement,
    );
    act(() => {
      undo(editorView(box()));
    });
    expect(editorText(box())).toBe(source);
  });

  it("keeps the checkboxes with the cursor on a marker", async () => {
    open(source);
    const view = editorView(box());
    await focus(view);
    act(() => view.dispatch({ selection: { anchor: 4 } }));
    expect(box().querySelectorAll("input.kcm-checkbox")).toHaveLength(2);
    expect(box().textContent).not.toContain("[ ]");
  });

  it("is not a stop in the tab order", () => {
    open(source);
    for (const checkbox of box().querySelectorAll<HTMLInputElement>(
      "input.kcm-checkbox",
    )) {
      expect(checkbox.tabIndex).toBe(-1);
    }
  });
});
