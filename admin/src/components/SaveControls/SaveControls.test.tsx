// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SaveControls } from "./SaveControls.js";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const show = (props: {
  dirty: boolean;
  saving: boolean;
  blocked?: boolean;
}) => <SaveControls {...props} formId="f" />;

describe("SaveControls", () => {
  it("says Save, and disables it when there is nothing to save", () => {
    render(show({ dirty: false, saving: false }));
    const button = screen.getByRole("button", { name: "Save" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("No changes")).toBeDefined();
  });

  it("enables Save when there are changes", () => {
    render(show({ dirty: true, saving: false }));
    expect(
      (screen.getByRole("button", { name: "Save" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
    expect(screen.getByText("Unsaved changes")).toBeDefined();
  });

  it("turns Save off, without saying there is nothing to save, when something blocks it", () => {
    render(show({ dirty: true, saving: false, blocked: true }));
    expect(
      (screen.getByRole("button", { name: "Save" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(screen.getByText("Unsaved changes")).toBeDefined();
  });

  it("does not say Saving… for a save that finishes quickly", () => {
    const { rerender } = render(show({ dirty: true, saving: false }));
    rerender(show({ dirty: true, saving: true }));
    expect(screen.queryByText("Saving…")).toBeNull();
    act(() => void vi.advanceTimersByTime(100));
    expect(screen.queryByText("Saving…")).toBeNull();
    // The save ends before the wait does: the label never changes.
    rerender(show({ dirty: false, saving: false }));
    act(() => void vi.advanceTimersByTime(1000));
    expect(screen.queryByText("Saving…")).toBeNull();
    expect(screen.getByRole("button", { name: "Save" })).toBeDefined();
  });

  it("says Saving… once a save is taking a while, and Save again when it ends", () => {
    const { rerender } = render(show({ dirty: true, saving: true }));
    expect(screen.queryByText("Saving…")).toBeNull();
    act(() => void vi.advanceTimersByTime(400));
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDefined();
    rerender(show({ dirty: false, saving: false }));
    expect(screen.getByRole("button", { name: "Save" })).toBeDefined();
  });
});
