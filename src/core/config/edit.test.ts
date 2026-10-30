import { describe, expect, it } from "vitest";
import { editConfigText } from "./edit.js";
import { ConfigError, parseSiteConfig } from "./load.js";

const edit = (text: string, changes: Parameters<typeof editConfigText>[1]) =>
  editConfigText(text, changes, "site.yaml");

const FIXTURE = [
  "# yaml-language-server: $schema=../../../schema/site.schema.json",
  "theme:",
  "  colors:",
  '    link: "#9c27b0" # my brand purple',
  "  layout:",
  "    maxWidth: 40rem",
  "",
].join("\n");

describe("editConfigText", () => {
  it("writes a setting into an empty file, with its sections", () => {
    expect(
      edit("", [{ path: ["theme", "colors", "link"], value: "#9c27b0" }]),
    ).toBe('theme:\n  colors:\n    link: "#9c27b0"\n');
  });

  it("changes a value in place and keeps its comment, other settings and order", () => {
    const text = edit(FIXTURE, [
      { path: ["theme", "colors", "link"], value: "#112233" },
    ]);
    expect(text).toBe(FIXTURE.replace("#9c27b0", "#112233"));
  });

  it("adds a new setting at the end of its section", () => {
    const text = edit(FIXTURE, [
      { path: ["theme", "colors", "text"], value: "#000000" },
    ]);
    expect(text).toBe(
      FIXTURE.replace(
        "# my brand purple\n",
        '# my brand purple\n    text: "#000000"\n',
      ),
    );
  });

  it("removes a setting, and the section it leaves empty, so the default applies", () => {
    const text = edit(FIXTURE, [
      { path: ["theme", "layout", "maxWidth"], value: null },
    ]);
    expect(text).toBe(
      [
        "# yaml-language-server: $schema=../../../schema/site.schema.json",
        "theme:",
        "  colors:",
        '    link: "#9c27b0" # my brand purple',
        "",
      ].join("\n"),
    );
  });

  it("leaves only the header comments when every setting is removed", () => {
    const text = edit(FIXTURE, [
      { path: ["theme", "layout", "maxWidth"], value: null },
      { path: ["theme", "colors", "link"], value: null },
    ]);
    expect(text).toBe(
      "# yaml-language-server: $schema=../../../schema/site.schema.json\n",
    );
    // And that is a valid, default config.
    expect(parseSiteConfig(text, "site.yaml").theme.colors.link).toBe(
      "#0b57d0",
    );
  });

  it("leaves nothing at all when there was nothing to keep", () => {
    expect(
      edit("theme:\n  layout:\n    maxWidth: 40rem\n", [
        { path: ["theme", "layout", "maxWidth"], value: null },
      ]),
    ).toBe("");
  });

  it("quotes what needs it, and writes numbers as numbers", () => {
    const text = edit("", [
      {
        path: ["theme", "fonts", "body"],
        value: 'Georgia, "Times New Roman", serif',
      },
      { path: ["theme", "colors", "text"], value: "#000" },
      { path: ["theme", "type", "scale"], value: 1.333 },
    ]);
    const config = parseSiteConfig(text, "site.yaml");
    expect(config.theme.fonts.body).toBe('Georgia, "Times New Roman", serif');
    expect(config.theme.colors.text).toBe("#000");
    expect(config.theme.type.scale).toBe(1.333);
  });

  it("does nothing to a file when there are no changes, or the key is not there", () => {
    expect(edit(FIXTURE, [])).toBe(FIXTURE);
    expect(
      edit(FIXTURE, [{ path: ["theme", "colors", "background"], value: null }]),
    ).toBe(FIXTURE);
  });

  it("refuses text that is not YAML, naming the line", () => {
    try {
      edit("theme: [unclosed\n", [{ path: ["a"], value: "b" }]);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      expect((error as ConfigError).problems[0]?.message).toMatch(/line \d+/);
    }
  });
});
