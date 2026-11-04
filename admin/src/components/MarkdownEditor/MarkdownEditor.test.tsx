// @vitest-environment jsdom
import { undo } from "@codemirror/commands";
import { act, cleanup, render, screen } from "@testing-library/react";
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
});
