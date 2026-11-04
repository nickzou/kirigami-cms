// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EditorToolbar } from "./EditorToolbar.js";

afterEach(cleanup);

const names = ["Bold", "Italic", "Heading", "Link", "Bulleted list", "Code"];

describe("EditorToolbar", () => {
  it("is a labelled toolbar of six named buttons", () => {
    render(<EditorToolbar onAction={() => {}} />);
    expect(screen.getByRole("toolbar", { name: "Formatting" })).toBeDefined();
    expect(
      screen.getAllByRole("button").map((b) => b.getAttribute("aria-label")),
    ).toEqual(names);
  });

  it("does what each button says", () => {
    const onAction = vi.fn();
    render(<EditorToolbar onAction={onAction} />);
    for (const name of names) {
      fireEvent.click(screen.getByRole("button", { name }));
    }
    expect(onAction.mock.calls.map(([action]) => action)).toEqual([
      "bold",
      "italic",
      "heading",
      "link",
      "bullets",
      "code",
    ]);
  });

  it("does not take the focus (or the selection) out of the text when pressed", () => {
    render(<EditorToolbar onAction={() => {}} />);
    const press = fireEvent.mouseDown(
      screen.getByRole("button", { name: "Bold" }),
    );
    // fireEvent returns false when the event's default was prevented.
    expect(press).toBe(false);
  });

  it("names the shortcuts in the tooltips", () => {
    render(<EditorToolbar onAction={() => {}} />);
    expect(screen.getByRole("button", { name: "Bold" }).title).toMatch(
      /Bold \((Ctrl\+B|⌘B)\)/,
    );
    expect(screen.getByRole("button", { name: "Link" }).title).toMatch(
      /Link \((Ctrl\+K|⌘K)\)/,
    );
    expect(screen.getByRole("button", { name: "Heading" }).title).toMatch(
      /smaller one/,
    );
    expect(
      screen
        .getByRole("button", { name: "Bold" })
        .getAttribute("aria-keyshortcuts"),
    ).toBe("Control+B Meta+B");
  });

  it("is one stop for the Tab key", () => {
    render(<EditorToolbar onAction={() => {}} />);
    const stops = screen.getAllByRole("button").filter((b) => b.tabIndex === 0);
    expect(stops).toHaveLength(1);
    expect(stops[0]?.getAttribute("aria-label")).toBe("Bold");
  });

  it("moves between the buttons with the arrow keys, Home and End, and wraps round", () => {
    render(<EditorToolbar onAction={() => {}} />);
    const bar = screen.getByRole("toolbar");
    const focused = () => document.activeElement?.getAttribute("aria-label");
    screen.getByRole("button", { name: "Bold" }).focus();
    fireEvent.keyDown(bar, { key: "ArrowRight" });
    expect(focused()).toBe("Italic");
    fireEvent.keyDown(bar, { key: "ArrowRight" });
    expect(focused()).toBe("Heading");
    fireEvent.keyDown(bar, { key: "ArrowLeft" });
    expect(focused()).toBe("Italic");
    fireEvent.keyDown(bar, { key: "End" });
    expect(focused()).toBe("Code");
    fireEvent.keyDown(bar, { key: "ArrowRight" });
    expect(focused()).toBe("Bold");
    fireEvent.keyDown(bar, { key: "ArrowLeft" });
    expect(focused()).toBe("Code");
    fireEvent.keyDown(bar, { key: "Home" });
    expect(focused()).toBe("Bold");
  });

  it("makes the focused button the one Tab will come back to", () => {
    render(<EditorToolbar onAction={() => {}} />);
    fireEvent.keyDown(screen.getByRole("toolbar"), { key: "End" });
    const stops = screen.getAllByRole("button").filter((b) => b.tabIndex === 0);
    expect(stops.map((b) => b.getAttribute("aria-label"))).toEqual(["Code"]);
  });

  it("ignores other keys", () => {
    render(<EditorToolbar onAction={() => {}} />);
    screen.getByRole("button", { name: "Bold" }).focus();
    fireEvent.keyDown(screen.getByRole("toolbar"), { key: "a" });
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Bold");
  });
});
