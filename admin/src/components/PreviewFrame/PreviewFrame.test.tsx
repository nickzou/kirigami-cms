// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PreviewFrame } from "./PreviewFrame.js";

afterEach(cleanup);

const frames = (container: HTMLElement) =>
  [...container.querySelectorAll("iframe")] as HTMLIFrameElement[];

describe("PreviewFrame", () => {
  it("shows one sandboxed frame with the page's address", () => {
    const { container } = render(
      <PreviewFrame url="/blog/hello/" version={0} title="Preview" />,
    );
    const [frame] = frames(container);
    expect(frames(container)).toHaveLength(1);
    expect(frame?.getAttribute("src")).toBe("/blog/hello/");
    expect(frame?.getAttribute("sandbox")).toBe("");
  });

  it("keeps the old frame on screen until the new one has loaded", () => {
    const { container, rerender } = render(
      <PreviewFrame url="/a/" version={0} title="Preview" />,
    );
    const [old] = frames(container);
    rerender(<PreviewFrame url="/a/" version={1} title="Preview" />);

    // Two frames: the old one still shown, the new one loading and hidden.
    const [first, loading] = frames(container);
    expect(frames(container)).toHaveLength(2);
    expect(first).toBe(old);
    expect(first?.getAttribute("aria-hidden")).toBeNull();
    expect(loading?.getAttribute("aria-hidden")).toBe("true");

    fireEvent.load(loading as HTMLIFrameElement);
    // Now the new frame is the one on show, and the old one is gone. It is the
    // same element, so it did not load again.
    expect(frames(container)).toHaveLength(1);
    expect(frames(container)[0]).toBe(loading);
    expect(loading?.getAttribute("aria-hidden")).toBeNull();
  });

  it("replaces a frame still loading when another build lands", () => {
    const { container, rerender } = render(
      <PreviewFrame url="/a/" version={0} title="Preview" />,
    );
    rerender(<PreviewFrame url="/a/" version={1} title="Preview" />);
    rerender(<PreviewFrame url="/a/" version={2} title="Preview" />);
    // The old frame and only the newest one that is loading.
    expect(frames(container)).toHaveLength(2);
  });

  it("loads a different page the same way", () => {
    const { container, rerender } = render(
      <PreviewFrame url="/a/" version={0} title="Preview" />,
    );
    rerender(<PreviewFrame url="/b/" version={0} title="Preview" />);
    expect(frames(container).map((f) => f.getAttribute("src"))).toEqual([
      "/a/",
      "/b/",
    ]);
  });
});
