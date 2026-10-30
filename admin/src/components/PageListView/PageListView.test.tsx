// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PageSummary } from "../../api.js";
import { PageListView } from "./PageListView.js";

afterEach(cleanup);

const page = (path: string, title = path): PageSummary => ({
  path,
  title,
  version: "v",
});

const show = (pages: PageSummary[], extra = {}) =>
  render(
    <MemoryRouter>
      <PageListView pages={pages} {...extra} />
    </MemoryRouter>,
  );

const folder = (name: RegExp | string) =>
  screen.getByRole("button", { name: new RegExp(`^${name}`) });

describe("PageListView: folders", () => {
  const pages = [
    page("index.md", "Home"),
    page("blog/hello.md", "Hello"),
    page("blog/second.md", "Second"),
    page("docs/guides/start.md", "Start"),
  ];

  it("groups pages under their folder, with the count of pages in it", () => {
    show(pages);
    expect(folder("blog").textContent).toContain("2");
    expect(folder("blog").getAttribute("aria-expanded")).toBe("true");
    // Nested: docs holds one page, inside guides.
    expect(folder("docs").textContent).toContain("1");
    expect(folder("guides").textContent).toContain("1");
  });

  it("starts with every folder open, so nothing is hidden", () => {
    show(pages);
    expect(screen.getByRole("link", { name: /Hello/ })).toBeDefined();
    expect(screen.getByRole("link", { name: /Start/ })).toBeDefined();
  });

  it("shows a page in a folder by its file name, not its whole path", () => {
    show(pages);
    const link = screen.getByRole("link", { name: /Hello/ });
    expect(link.textContent).toBe("Hellohello.md");
    // The link still goes to the whole path.
    expect(link.getAttribute("href")).toBe("/pages/blog/hello.md");
  });

  it("lists the pages at a level before its folders", () => {
    show(pages);
    const homeLink = screen.getByRole("link", { name: /Home/ });
    for (const name of ["blog", "docs"]) {
      expect(
        homeLink.compareDocumentPosition(folder(name)) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
  });

  it("does the same inside a folder: its pages, then the folders in it", () => {
    show([
      page("docs/guides/start.md", "Start"),
      page("docs/overview.md", "Overview"),
    ]);
    const overview = screen.getByRole("link", { name: /Overview/ });
    expect(
      overview.compareDocumentPosition(folder("guides")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("closes and opens a folder, and says so", () => {
    show(pages);
    const blog = folder("blog");
    fireEvent.click(blog);
    expect(blog.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("link", { name: /Hello/ })).toBeNull();
    // The other folders and the top-level page are unaffected.
    expect(screen.getByRole("link", { name: /Start/ })).toBeDefined();
    expect(screen.getByRole("link", { name: /Home/ })).toBeDefined();

    fireEvent.click(blog);
    expect(blog.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("link", { name: /Hello/ })).toBeDefined();
  });

  it("hides folders inside a closed folder, and finds them as they were when it opens again", () => {
    show(pages);
    fireEvent.click(folder("guides"));
    expect(screen.queryByRole("link", { name: /Start/ })).toBeNull();
    fireEvent.click(folder("docs"));
    expect(screen.queryByRole("button", { name: /^guides/ })).toBeNull();
    fireEvent.click(folder("docs"));
    // guides is still closed, because it was closed on its own.
    expect(folder("guides").getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("link", { name: /Start/ })).toBeNull();
  });

  it("points each folder's button at the list it opens", () => {
    show(pages);
    const blog = folder("blog");
    const target = document.getElementById(
      blog.getAttribute("aria-controls") as string,
    );
    expect(target).not.toBeNull();
    expect(within(target as HTMLElement).getAllByRole("link")).toHaveLength(2);
  });

  it("keeps whole paths for rename and delete, whatever folder a page is in", () => {
    const onRename = vi.fn();
    const onDelete = vi.fn();
    show(pages, { onRename, onDelete });
    fireEvent.click(
      screen.getByRole("button", { name: "Rename blog/hello.md" }),
    );
    expect(onRename).toHaveBeenCalledWith(
      expect.objectContaining({ path: "blog/hello.md" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Delete docs/guides/start.md" }),
    );
    expect(onDelete).toHaveBeenCalledWith(
      expect.objectContaining({ path: "docs/guides/start.md" }),
    );
  });

  it("shows pages with no folders as before, with no folder rows", () => {
    show([page("a.md", "A"), page("b.md", "B")]);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it("says so when there are no pages", () => {
    show([]);
    expect(screen.getByText("This site has no pages yet.")).toBeDefined();
  });

  it("makes safe ids for folders with spaces in their names", () => {
    show([page("my notes/a b.md", "A")]);
    const id = folder("my notes").getAttribute("aria-controls") as string;
    expect(id).not.toMatch(/\s/);
    expect(document.getElementById(id)).not.toBeNull();
  });
});
