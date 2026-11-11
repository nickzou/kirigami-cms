// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { AppHeader } from "./AppHeader.js";

afterEach(cleanup);

const fadeOf = (container: HTMLElement) =>
  container.querySelector('header > div[aria-hidden="true"]');

describe("AppHeader", () => {
  it("has no fade unless asked", () => {
    const { container } = render(
      <MemoryRouter>
        <AppHeader />
      </MemoryRouter>,
    );
    expect(fadeOf(container)).toBeNull();
  });

  it("can fade the page into its lower edge, out of the way of screen readers and the mouse", () => {
    const { container } = render(
      <MemoryRouter>
        <AppHeader fade />
      </MemoryRouter>,
    );
    expect(fadeOf(container)).not.toBeNull();
  });
});
