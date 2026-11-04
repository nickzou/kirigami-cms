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
      expect(editorText(box())).toBe("**one** *two* [three](url)");
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

    it("leaves Tab alone, so it moves focus out of the text", () => {
      render(<MarkdownEditor value="- one" onChange={() => {}} />);
      select(5);
      const notHandled = fireEvent.keyDown(editorView(box()).contentDOM, {
        key: "Tab",
        keyCode: 9,
      });
      expect(notHandled).toBe(true);
      expect(editorText(box())).toBe("- one");
    });
  });
});
