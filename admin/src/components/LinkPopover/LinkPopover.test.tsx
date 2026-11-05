// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LinkPopover } from "./LinkPopover.js";

afterEach(cleanup);

const setup = (props: Partial<Parameters<typeof LinkPopover>[0]> = {}) => {
  const handlers = {
    onUrlChange: vi.fn(),
    onRemove: vi.fn(),
    onDone: vi.fn(),
  };
  render(
    <LinkPopover
      left={10}
      top={20}
      url="https://x.test"
      openHref="https://x.test"
      {...handlers}
      {...props}
    />,
  );
  return handlers;
};

describe("LinkPopover", () => {
  it("shows the address, and a way to open or remove the link", () => {
    setup();
    expect(screen.getByRole("textbox", { name: "Address" })).toHaveProperty(
      "value",
      "https://x.test",
    );
    const open = screen.getByRole("link", { name: "Open" });
    expect(open.getAttribute("href")).toBe("https://x.test");
    expect(open.getAttribute("target")).toBe("_blank");
    expect(open.getAttribute("rel")).toContain("noopener");
    expect(screen.getByRole("button", { name: "Remove link" })).toBeDefined();
  });

  it("reports an edited address and a removal", () => {
    const { onUrlChange, onRemove } = setup();
    fireEvent.change(screen.getByRole("textbox", { name: "Address" }), {
      target: { value: "https://y.test" },
    });
    expect(onUrlChange).toHaveBeenCalledWith("https://y.test");
    fireEvent.click(screen.getByRole("button", { name: "Remove link" }));
    expect(onRemove).toHaveBeenCalled();
  });

  it("is done on Escape and on Enter", () => {
    const { onDone } = setup();
    const field = screen.getByRole("textbox", { name: "Address" });
    fireEvent.keyDown(field, { key: "Escape" });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(onDone).toHaveBeenCalledTimes(2);
  });

  it("cannot open an address that is not safe to open", () => {
    setup({ openHref: undefined });
    expect(screen.queryByRole("link", { name: "Open" })).toBeNull();
    expect(
      (screen.getByRole("button", { name: "Open" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("takes the focus, with the address selected, when asked", () => {
    const { rerender } = render(
      <LinkPopover
        left={0}
        top={0}
        url="abc"
        onUrlChange={() => {}}
        onRemove={() => {}}
        onDone={() => {}}
        focusTick={0}
      />,
    );
    const field = screen.getByRole("textbox", {
      name: "Address",
    }) as HTMLInputElement;
    expect(document.activeElement).not.toBe(field);
    rerender(
      <LinkPopover
        left={0}
        top={0}
        url="abc"
        onUrlChange={() => {}}
        onRemove={() => {}}
        onDone={() => {}}
        focusTick={1}
      />,
    );
    expect(document.activeElement).toBe(field);
    expect(field.selectionStart).toBe(0);
    expect(field.selectionEnd).toBe(3);
  });
});
