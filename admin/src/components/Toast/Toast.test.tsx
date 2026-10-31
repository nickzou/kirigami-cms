// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Toast } from "./Toast.js";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Toast", () => {
  it("is a live region, empty until there is something to say", () => {
    render(<Toast message={null} />);
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("says the message, then goes by itself after the duration", () => {
    render(<Toast message="Saved." duration={3000} />);
    expect(screen.getByRole("status").textContent).toBe("Saved.");
    act(() => vi.advanceTimersByTime(2999));
    expect(screen.getByRole("status").textContent).toBe("Saved.");
    // After the duration the fade starts; the text goes once it is over.
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole("status").textContent).toBe("Saved.");
    act(() => vi.advanceTimersByTime(250));
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("goes when the message is taken away", () => {
    const { rerender } = render(<Toast message="Saved." />);
    rerender(<Toast message={null} />);
    act(() => vi.advanceTimersByTime(250));
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("comes again for the next one", () => {
    const { rerender } = render(<Toast message="Saved." duration={1000} />);
    act(() => vi.advanceTimersByTime(2000));
    rerender(<Toast message={null} duration={1000} />);
    rerender(<Toast message="Saved." duration={1000} />);
    expect(screen.getByRole("status").textContent).toBe("Saved.");
  });
});
