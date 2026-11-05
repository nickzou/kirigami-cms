// @vitest-environment jsdom
import { undo } from "@codemirror/commands";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EditorHandle } from "../../editor-handle.js";
import { editorText, editorView } from "../../test-editor.js";
import { typeText } from "../../test-typing.js";
import { MarkdownEditor } from "./MarkdownEditor.js";

afterEach(cleanup);

const box = () => screen.getByLabelText("Markdown");

describe("MarkdownEditor", () => {
  it("shows the text as a labelled, multi-line text box", () => {
    render(<MarkdownEditor value={"# Hi\n\nThere\n"} onChange={() => {}} />);
    expect(editorText(box())).toBe("# Hi\n\nThere\n");
    expect(box().getAttribute("role")).toBe("textbox");
    expect(box().getAttribute("aria-multiline")).toBe("true");
    expect(box().getAttribute("spellcheck")).toBe("true");
    expect(box().getAttribute("contenteditable")).toBe("true");
  });

  it("can be given another name", () => {
    render(<MarkdownEditor value="" label="Page text" onChange={() => {}} />);
    expect(screen.getByLabelText("Page text")).toBeDefined();
  });

  it("reports what is typed, exactly", () => {
    const onChange = vi.fn();
    render(<MarkdownEditor value="one" onChange={onChange} />);
    typeText(box(), "  two \t\n\n\n- é ✓ \u{1F600}\n");
    expect(onChange).toHaveBeenLastCalledWith(
      "  two \t\n\n\n- é ✓ \u{1F600}\n",
    );
  });

  it("turns pasted line breaks into \\n, which is what it always holds", () => {
    const onChange = vi.fn();
    render(<MarkdownEditor value="" onChange={onChange} />);
    const view = editorView(box());
    act(() => {
      view.dispatch(
        view.state.replaceSelection(view.state.toText("a\r\nb\rc")),
      );
    });
    expect(onChange).toHaveBeenLastCalledWith("a\nb\nc");
  });

  it("takes a new value from outside without reporting it back", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <MarkdownEditor value="one" onChange={onChange} />,
    );
    rerender(<MarkdownEditor value="two" onChange={onChange} />);
    expect(editorText(box())).toBe("two");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not rebuild itself when only the callback changes", () => {
    const { rerender } = render(
      <MarkdownEditor value="one" onChange={() => {}} />,
    );
    const before = box();
    const later = vi.fn();
    rerender(<MarkdownEditor value="one" onChange={later} />);
    expect(box()).toBe(before);
    typeText(box(), "two");
    expect(later).toHaveBeenCalledWith("two");
  });

  it("undoes typing, but not the text that came from outside", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <MarkdownEditor value="one" onChange={onChange} />,
    );
    typeText(box(), "two");
    expect(editorText(box())).toBe("two");
    act(() => {
      undo(editorView(box()));
    });
    expect(editorText(box())).toBe("one");

    rerender(<MarkdownEditor value="fresh" onChange={onChange} />);
    act(() => {
      undo(editorView(box()));
    });
    // Nothing left to undo: loading a page again is not something to take back.
    expect(editorText(box())).toBe("fresh");
  });

  it("puts the cursor at the end, and selects everything, when asked", () => {
    const ref = createRef<EditorHandle>();
    render(<MarkdownEditor ref={ref} value={"abc\ndef"} onChange={() => {}} />);
    act(() => ref.current?.focusEnd());
    expect(editorView(box()).state.selection.main.head).toBe(7);
    expect(box().contains(document.activeElement)).toBe(true);

    act(() => ref.current?.selectAll());
    const { from, to } = editorView(box()).state.selection.main;
    expect([from, to]).toEqual([0, 7]);
  });

  it("is taken apart cleanly", () => {
    const { unmount } = render(
      <MarkdownEditor value="x" onChange={() => {}} />,
    );
    unmount();
    expect(screen.queryByLabelText("Markdown")).toBeNull();
  });

  describe("formatting", () => {
    const keyDown = (key: string, init: KeyboardEventInit = {}) =>
      act(() => {
        fireEvent.keyDown(editorView(box()).contentDOM, {
          key,
          keyCode: key.length === 1 ? key.toUpperCase().charCodeAt(0) : 13,
          ...init,
        });
      });
    const select = (from: number, to = from) =>
      act(() =>
        editorView(box()).dispatch({ selection: { anchor: from, head: to } }),
      );

    it("does a formatting action to the selection when the handle is asked", () => {
      const onChange = vi.fn();
      const ref = createRef<EditorHandle>();
      render(
        <MarkdownEditor ref={ref} value="a word here" onChange={onChange} />,
      );
      select(2, 6);
      act(() => ref.current?.format("bold"));
      expect(editorText(box())).toBe("a **word** here");
      expect(onChange).toHaveBeenLastCalledWith("a **word** here");
      expect(box().contains(document.activeElement)).toBe(true);
    });

    it("makes the formatting one step to undo", () => {
      const ref = createRef<EditorHandle>();
      render(
        <MarkdownEditor ref={ref} value="a word here" onChange={() => {}} />,
      );
      select(2, 6);
      act(() => ref.current?.format("bold"));
      act(() => {
        undo(editorView(box()));
      });
      expect(editorText(box())).toBe("a word here");
    });

    it("has Mod-b, Mod-i and Mod-k", () => {
      render(<MarkdownEditor value="one two three" onChange={() => {}} />);
      select(0, 3);
      keyDown("b", { ctrlKey: true });
      expect(editorText(box())).toBe("**one** two three");
      select(8, 11);
      keyDown("i", { ctrlKey: true });
      expect(editorText(box())).toBe("**one** *two* three");
      select(14, 19);
      keyDown("k", { ctrlKey: true });
      expect(editorText(box())).toBe("**one** *two* [three]()");
    });

    it("carries on a list when Enter is pressed at the end of an item", () => {
      const onChange = vi.fn();
      render(<MarkdownEditor value={"- one\n- two"} onChange={onChange} />);
      select(11);
      keyDown("Enter");
      expect(editorText(box())).toBe("- one\n- two\n- ");
      expect(onChange).toHaveBeenLastCalledWith("- one\n- two\n- ");
      // On the empty item, Enter ends the list.
      keyDown("Enter");
      expect(editorText(box())).toBe("- one\n- two\n");
    });

    const tab = (init: KeyboardEventInit = {}) =>
      fireEvent.keyDown(editorView(box()).contentDOM, {
        key: "Tab",
        keyCode: 9,
        ...init,
      });

    it("nests a list item with Tab and brings it back with Shift-Tab", () => {
      const onChange = vi.fn();
      render(<MarkdownEditor value={"- one\n- two"} onChange={onChange} />);
      select(9);
      expect(tab()).toBe(false);
      expect(editorText(box())).toBe("- one\n  - two");
      expect(onChange).toHaveBeenLastCalledWith("- one\n  - two");
      expect(editorView(box()).state.selection.main.head).toBe(11);
      expect(tab({ shiftKey: true })).toBe(false);
      expect(editorText(box())).toBe("- one\n- two");
    });

    it("indents code with Tab", () => {
      render(<MarkdownEditor value={"```\nlet a;\n```"} onChange={() => {}} />);
      select(6);
      tab();
      expect(editorText(box())).toBe("```\n  let a;\n```");
    });

    it("leaves Tab to move focus out of plain text", () => {
      render(<MarkdownEditor value="just text" onChange={() => {}} />);
      select(3);
      expect(tab()).toBe(true);
      expect(editorText(box())).toBe("just text");
    });

    it("lets the next Tab leave the text after Escape, so the keyboard is not trapped", () => {
      render(<MarkdownEditor value={"- one"} onChange={() => {}} />);
      select(3);
      fireEvent.keyDown(editorView(box()).contentDOM, {
        key: "Escape",
        keyCode: 27,
      });
      expect(tab()).toBe(true);
      expect(editorText(box())).toBe("- one");
    });
  });

  describe("links", () => {
    const doc = "see [the docs](https://x.test/a) now";
    const inLink = 8;
    const group = () => screen.queryByRole("group", { name: "Link" });
    const field = () =>
      screen.getByRole("textbox", { name: "Address" }) as HTMLInputElement;
    const focus = async () => {
      act(() => editorView(box()).focus());
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 40));
      });
    };
    const select = (from: number, to = from) =>
      act(() =>
        editorView(box()).dispatch({ selection: { anchor: from, head: to } }),
      );

    it("never shows a mark of the markdown, with the cursor in the link or not", async () => {
      render(<MarkdownEditor value={doc} onChange={() => {}} />);
      await focus();
      select(inLink);
      expect(box().textContent).toBe("see the docs now");
      select(0);
      expect(box().textContent).toBe("see the docs now");
    });

    it("shows a popover with the address while the cursor is in a link", async () => {
      render(<MarkdownEditor value={doc} onChange={() => {}} />);
      await focus();
      expect(group()).toBeNull();
      select(inLink);
      expect(group()).not.toBeNull();
      expect(field().value).toBe("https://x.test/a");
      select(0);
      expect(group()).toBeNull();
      // Just after the link is not in it.
      select(doc.indexOf(")") + 1);
      expect(group()).toBeNull();
    });

    it("has no popover while the editor is not in use", () => {
      render(<MarkdownEditor value={doc} onChange={() => {}} />);
      select(inLink);
      expect(group()).toBeNull();
    });

    it("edits the address in the text, and nothing else", async () => {
      const onChange = vi.fn();
      render(<MarkdownEditor value={doc} onChange={onChange} />);
      await focus();
      select(inLink);
      fireEvent.change(field(), { target: { value: "https://y.test" } });
      expect(editorText(box())).toBe("see [the docs](https://y.test) now");
      expect(onChange).toHaveBeenLastCalledWith(
        "see [the docs](https://y.test) now",
      );
      // The cursor stays where it was, in the link text.
      expect(editorView(box()).state.selection.main.head).toBe(inLink);
    });

    it("writes spaces in an address as %20, so the link stays a link", async () => {
      render(<MarkdownEditor value={doc} onChange={() => {}} />);
      await focus();
      select(inLink);
      fireEvent.change(field(), { target: { value: "my page" } });
      expect(editorText(box())).toBe("see [the docs](my%20page) now");
      expect(group()).not.toBeNull();
    });

    it("keeps a link whose address is emptied", async () => {
      render(<MarkdownEditor value={doc} onChange={() => {}} />);
      await focus();
      select(inLink);
      fireEvent.change(field(), { target: { value: "" } });
      expect(editorText(box())).toBe("see [the docs]() now");
      expect(group()).not.toBeNull();
      expect(field().value).toBe("");
    });

    it("takes the link off, keeping its text, with Remove link", async () => {
      render(<MarkdownEditor value={doc} onChange={() => {}} />);
      await focus();
      select(inLink);
      fireEvent.click(screen.getByRole("button", { name: "Remove link" }));
      expect(editorText(box())).toBe("see the docs now");
      expect(group()).toBeNull();
    });

    it("closes with Save, back in the text, with the address kept", async () => {
      render(<MarkdownEditor value={doc} onChange={() => {}} />);
      await focus();
      select(inLink);
      fireEvent.change(field(), { target: { value: "https://y.test" } });
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
      expect(group()).toBeNull();
      expect(editorText(box())).toBe("see [the docs](https://y.test) now");
      expect(box().contains(document.activeElement)).toBe(true);
    });

    it("closes on Escape, and the cursor stays in the text", async () => {
      render(<MarkdownEditor value={doc} onChange={() => {}} />);
      await focus();
      select(inLink);
      fireEvent.keyDown(field(), { key: "Escape" });
      expect(group()).toBeNull();
      expect(editorText(box())).toBe(doc);
      // Moving out of the link and back brings it again.
      select(0);
      select(inLink);
      expect(group()).not.toBeNull();
    });

    it("makes a link from the link button, with the address field ready", async () => {
      const ref = createRef<EditorHandle>();
      render(<MarkdownEditor ref={ref} value="a word" onChange={() => {}} />);
      await focus();
      select(2, 6);
      act(() => ref.current?.format("link"));
      expect(editorText(box())).toBe("a [word]()");
      expect(group()).not.toBeNull();
      expect(document.activeElement).toBe(field());
    });

    it("sends Cmd/Ctrl+K in a link to the popover and changes nothing", async () => {
      render(<MarkdownEditor value={doc} onChange={() => {}} />);
      await focus();
      select(inLink);
      fireEvent.keyDown(field(), { key: "Escape" });
      act(() => {
        fireEvent.keyDown(editorView(box()).contentDOM, {
          key: "k",
          keyCode: 75,
          ctrlKey: true,
        });
      });
      expect(editorText(box())).toBe(doc);
      expect(document.activeElement).toBe(field());
    });

    it("fades while the text is typed in, and comes back after a pause", async () => {
      render(<MarkdownEditor value={doc} onChange={() => {}} />);
      await focus();
      select(inLink);
      // Out of the tab order while it is out of the way.
      const faded = () => field().tabIndex === -1;
      expect(faded()).toBe(false);
      act(() => {
        editorView(box()).dispatch({
          changes: { from: inLink, insert: "x" },
          userEvent: "input.type",
        });
      });
      expect(faded()).toBe(true);
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 800));
      });
      expect(faded()).toBe(false);
    });
  });

  describe("toolbar", () => {
    const toolbar = () => screen.queryByRole("toolbar", { name: "Formatting" });
    const pressed = (name: string) =>
      screen.getByRole("button", { name }).getAttribute("aria-pressed");
    const focus = async () => {
      act(() => editorView(box()).focus());
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 40));
      });
    };
    const select = (from: number, to = from) =>
      act(() =>
        editorView(box()).dispatch({ selection: { anchor: from, head: to } }),
      );
    /** A window as wide as a tablet, so the bar floats. */
    const wide = (matches: boolean) =>
      vi.stubGlobal("matchMedia", (query: string) => ({
        matches,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }));
    afterEach(() => vi.unstubAllGlobals());

    it("floats over a selection, and not over a cursor in a line of text", async () => {
      wide(true);
      render(<MarkdownEditor value={"one two\n\nthree"} onChange={() => {}} />);
      await focus();
      select(1);
      expect(toolbar()).toBeNull();
      select(0, 3);
      expect(toolbar()).not.toBeNull();
      select(2);
      expect(toolbar()).toBeNull();
    });

    it("shows on an empty line, and goes once the line has text", async () => {
      wide(true);
      render(<MarkdownEditor value={"one\n\nthree"} onChange={() => {}} />);
      await focus();
      select(4);
      expect(toolbar()).not.toBeNull();
      act(() =>
        editorView(box()).dispatch({
          changes: { from: 4, insert: "x" },
          selection: { anchor: 5 },
          userEvent: "input.type",
        }),
      );
      expect(toolbar()).toBeNull();
    });

    it("is not on the screen while the text is not in use", () => {
      wide(true);
      render(<MarkdownEditor value="one two" onChange={() => {}} />);
      select(0, 3);
      expect(toolbar()).toBeNull();
    });

    it("is pinned on a phone, whatever is selected, while the text is in use", async () => {
      wide(false);
      render(<MarkdownEditor value="one two" onChange={() => {}} />);
      await focus();
      select(1);
      expect(toolbar()).not.toBeNull();
    });

    it("shows what the selection is in as pressed", async () => {
      wide(true);
      render(
        <MarkdownEditor
          value={"# Head\n\nsome **bold** and *it* and `c`\n\n- item\n\n[a](u)"}
          onChange={() => {}}
        />,
      );
      await focus();
      const text = editorView(box()).state.doc.toString();
      select(text.indexOf("bold"), text.indexOf("bold") + 4);
      expect(pressed("Bold")).toBe("true");
      expect(pressed("Italic")).toBe("false");
      select(text.indexOf("it*") - 0, text.indexOf("it*") + 2);
      expect(pressed("Italic")).toBe("true");
      expect(pressed("Bold")).toBe("false");
      select(text.indexOf("c`"), text.indexOf("c`") + 1);
      expect(pressed("Code")).toBe("true");
      select(text.indexOf("item"), text.indexOf("item") + 4);
      expect(pressed("Bulleted list")).toBe("true");
      select(text.indexOf("Head"), text.indexOf("Head") + 4);
      expect(pressed("Heading")).toBe("true");
      select(text.indexOf("a]"), text.indexOf("a]") + 1);
      expect(pressed("Link")).toBe("true");
    });

    it("formats the selection from its buttons, and the focus stays in the text", async () => {
      wide(true);
      const onChange = vi.fn();
      render(<MarkdownEditor value="one two" onChange={onChange} />);
      await focus();
      select(0, 3);
      fireEvent.click(screen.getByRole("button", { name: "Bold" }));
      expect(editorText(box())).toBe("**one** two");
      expect(box().contains(document.activeElement)).toBe(true);
    });

    it("makes a heading or a bullet of the whole line, whatever part is selected", async () => {
      wide(true);
      render(
        <MarkdownEditor
          value={"one two three\n\nfour five six"}
          onChange={() => {}}
        />,
      );
      await focus();
      select(4, 7);
      fireEvent.click(screen.getByRole("button", { name: "Heading" }));
      expect(editorText(box())).toBe("# one two three\n\nfour five six");
      select(21, 25);
      fireEvent.click(screen.getByRole("button", { name: "Bulleted list" }));
      expect(editorText(box())).toBe("# one two three\n\n- four five six");
    });

    it("has shortcuts for the heading, bullets and code", async () => {
      render(
        <MarkdownEditor value={"one two\n\nthree four"} onChange={() => {}} />,
      );
      await focus();
      const press = (key: string, init: KeyboardEventInit) =>
        act(() => {
          fireEvent.keyDown(editorView(box()).contentDOM, { key, ...init });
        });
      select(2);
      press("1", { ctrlKey: true, altKey: true, keyCode: 49 });
      expect(editorText(box())).toBe("# one two\n\nthree four");
      select(13, 14);
      press("8", { ctrlKey: true, shiftKey: true, keyCode: 56 });
      expect(editorText(box())).toBe("# one two\n\n- three four");
      select(13, 18);
      press("e", { ctrlKey: true, keyCode: 69 });
      expect(editorText(box())).toBe("# one two\n\n- `three` four");
    });

    it("is reached from the keyboard with Alt-F10, and Escape comes back to the text", async () => {
      wide(true);
      render(<MarkdownEditor value="one two" onChange={() => {}} />);
      await focus();
      select(0, 3);
      act(() => {
        fireEvent.keyDown(editorView(box()).contentDOM, {
          key: "F10",
          keyCode: 121,
          altKey: true,
        });
      });
      expect(
        document.activeElement?.closest('[role="toolbar"]'),
      ).not.toBeNull();
      expect(toolbar()).not.toBeNull();
      fireEvent.keyDown(document.activeElement as Element, { key: "Escape" });
      expect(box().contains(document.activeElement)).toBe(true);
    });
  });
});
