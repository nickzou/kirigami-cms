import { describe, expect, it } from "vitest";
import { splitSections } from "./sections.js";

const rejoin = (page: ReturnType<typeof splitSections>) =>
  page.intro + page.sections.map((s) => s.markdown).join("");

describe("splitSections", () => {
  it("returns only an intro when there are no ## headings", () => {
    const source = "# Title\n\nJust text.\n";
    const page = splitSections(source);
    expect(page.intro).toBe(source);
    expect(page.sections).toEqual([]);
  });

  it("returns an empty page for empty input", () => {
    expect(splitSections("")).toEqual({ intro: "", sections: [] });
  });

  it("splits at each ## heading and keeps the text before the first as the intro", () => {
    const source =
      "# Title\n\nIntro text.\n\n## One\n\nFirst.\n\n## Two\n\nSecond.\n";
    const page = splitSections(source);
    expect(page.intro).toBe("# Title\n\nIntro text.\n\n");
    expect(page.sections.map((s) => s.heading)).toEqual(["One", "Two"]);
    expect(page.sections[0]?.markdown).toBe("## One\n\nFirst.\n\n");
    expect(page.sections[1]?.markdown).toBe("## Two\n\nSecond.\n");
  });

  it("gives each section its body without the heading line", () => {
    const page = splitSections("## One\n\nFirst.\n");
    expect(page.sections[0]?.body).toBe("\nFirst.\n");
  });

  it("reports the 1-based line of each heading", () => {
    const page = splitSections("# T\n\n## One\n\ntext\n\n## Two\n");
    expect(page.sections.map((s) => s.line)).toEqual([3, 7]);
  });

  it("handles a page that starts with a ## heading", () => {
    const page = splitSections("## First\n\ntext\n");
    expect(page.intro).toBe("");
    expect(page.sections).toHaveLength(1);
  });

  it("does not split at # or ### headings", () => {
    const source = "## One\n\n### Sub\n\ntext\n\n# Another top\n\nmore\n";
    const page = splitSections(source);
    expect(page.sections).toHaveLength(1);
    expect(page.sections[0]?.markdown).toBe(source);
  });

  it("ignores ## inside fenced code blocks", () => {
    const source = "## Real\n\n```md\n## Not a heading\n```\n";
    const page = splitSections(source);
    expect(page.sections.map((s) => s.heading)).toEqual(["Real"]);
  });

  it("ignores ## inside blockquotes and lists", () => {
    const source = "## Real\n\n> ## quoted\n\n- ## listed\n";
    expect(splitSections(source).sections).toHaveLength(1);
  });

  it("recognises setext (underlined) level-2 headings", () => {
    const source = "Intro\n\nSetext heading\n--------------\n\nbody\n";
    const page = splitSections(source);
    expect(page.sections.map((s) => s.heading)).toEqual(["Setext heading"]);
    expect(page.intro).toBe("Intro\n\n");
  });

  it("uses the plain text of a heading with inline formatting", () => {
    const page = splitSections(
      "## A `code` and *emphasis* [link](http://x.test)\n",
    );
    expect(page.sections[0]?.heading).toBe("A code and emphasis link");
  });

  it("keeps sections with duplicate heading text, in order", () => {
    const page = splitSections("## Same\n\na\n\n## Same\n\nb\n");
    expect(page.sections.map((s) => s.heading)).toEqual(["Same", "Same"]);
    expect(page.sections.map((s) => s.line)).toEqual([1, 5]);
  });

  it("handles an empty section", () => {
    const page = splitSections("## A\n## B\ntext\n");
    expect(page.sections.map((s) => s.heading)).toEqual(["A", "B"]);
    expect(page.sections[0]?.body).toBe("");
  });

  it("handles CRLF line endings", () => {
    const source = "intro\r\n\r\n## One\r\n\r\ntext\r\n";
    const page = splitSections(source);
    expect(page.sections[0]?.heading).toBe("One");
    expect(page.sections[0]?.line).toBe(3);
    expect(rejoin(page)).toBe(source);
  });

  it("supports GFM syntax in sections (tables, task lists)", () => {
    const source = "## T\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n- [x] done\n";
    expect(splitSections(source).sections[0]?.markdown).toBe(source);
  });

  it.each([
    "",
    "no headings at all",
    "# T\n\n## A\n\ntext\n\n## B\n",
    "## A\r\n\r\ntext\r\n## B\r\n",
    "## A\n\n```\n## x\n```\n\n## B\n\n   trailing spaces   \n\n\n\n",
    "Setext\n---\n\nbody\n\n## After\n",
    "## é ✓ \u{1F600}\n\ntext without trailing newline",
  ])(
    "never changes the source: intro + sections rejoin to it exactly (%j)",
    (source) => {
      expect(rejoin(splitSections(source))).toBe(source);
    },
  );
});
