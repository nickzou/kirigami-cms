import { describe, expect, it } from "vitest";
import { ConfigError, defaultSiteConfig, parseSiteConfig } from "./load.js";

const parse = (text: string) => parseSiteConfig(text, "site.yaml");

const problemsOf = (text: string) => {
  try {
    parse(text);
  } catch (error) {
    if (error instanceof ConfigError) return error.problems;
    throw error;
  }
  throw new Error("expected parseSiteConfig to throw");
};

describe("parseSiteConfig", () => {
  it("returns the full defaults for an empty file", () => {
    expect(parse("")).toEqual(defaultSiteConfig);
  });

  it("returns the full defaults for a file with only comments", () => {
    expect(parse("# nothing here yet\n")).toEqual(defaultSiteConfig);
  });

  it("returns the full defaults for an empty theme", () => {
    expect(parse("theme: {}\n")).toEqual(defaultSiteConfig);
  });

  it("fills in everything that is not set", () => {
    const config = parse("theme:\n  colors:\n    link: '#ff0000'\n");
    expect(config.theme.colors.link).toBe("#ff0000");
    expect(config.theme.colors.text).toBe(defaultSiteConfig.theme.colors.text);
    expect(config.theme.layout).toEqual(defaultSiteConfig.theme.layout);
  });

  it("reads every kind of token", () => {
    const config = parse(`
theme:
  colors:
    background: "#fafafa"
    text: rgb(20 20 20)
    muted: gray
    link: oklch(0.5 0.2 250)
    border: "#ccc"
    codeBackground: "#eee"
  fonts:
    body: Georgia, serif
    heading: '"Helvetica Neue", sans-serif'
    mono: Menlo, monospace
  type:
    baseSize: 18px
    scale: 1.333
    lineHeight: 1.5
  spacing:
    unit: 1.25rem
  layout:
    maxWidth: 40rem
`);
    expect(config.theme.colors.text).toBe("rgb(20 20 20)");
    expect(config.theme.fonts.heading).toBe('"Helvetica Neue", sans-serif');
    expect(config.theme.type).toEqual({
      baseSize: "18px",
      scale: 1.333,
      lineHeight: 1.5,
    });
    expect(config.theme.spacing.unit).toBe("1.25rem");
    expect(config.theme.layout.maxWidth).toBe("40rem");
  });

  describe("errors", () => {
    it("rejects an unknown key and names its full path", () => {
      expect(problemsOf("theme:\n  colours: {}\n")).toEqual([
        {
          path: "theme.colours",
          message: expect.stringContaining("Unknown key"),
        },
      ]);
    });

    it("rejects an unknown top-level key", () => {
      expect(problemsOf("them: {}\n").map((p) => p.path)).toEqual(["them"]);
    });

    it("reports every problem, not just the first", () => {
      const paths = problemsOf(
        "theme:\n  colors:\n    link: 5\n  layout:\n    maxWidth: wide\n",
      ).map((p) => p.path);
      expect(paths).toEqual(["theme.colors.link", "theme.layout.maxWidth"]);
    });

    it("rejects a wrong type", () => {
      expect(
        problemsOf("theme:\n  type:\n    scale: big\n").map((p) => p.path),
      ).toEqual(["theme.type.scale"]);
    });

    it("rejects a scale outside the allowed range", () => {
      expect(problemsOf("theme:\n  type:\n    scale: 5\n")).toHaveLength(1);
      expect(problemsOf("theme:\n  type:\n    scale: 0.5\n")).toHaveLength(1);
    });

    it.each([
      ["a length without a unit", "theme:\n  layout:\n    maxWidth: 40\n"],
      [
        "a length with a bad unit",
        "theme:\n  layout:\n    maxWidth: 40furlongs\n",
      ],
      ["a negative length", "theme:\n  spacing:\n    unit: -1rem\n"],
    ])("rejects %s", (_name, text) => {
      expect(problemsOf(text)).toHaveLength(1);
    });

    it.each([
      ["a declaration break-out", "red; } body { display: none"],
      ["a block", "red } body { x: y"],
      ["a style tag break-out", "red</style><script>"],
      ["a comment", "red /* x */"],
      ["a url", "url(https://x.test/a.png)"],
      ["a made-up name with spaces", "not a color"],
    ])("rejects a color containing %s", (_name, value) => {
      const problems = problemsOf(
        `theme:\n  colors:\n    text: ${JSON.stringify(value)}\n`,
      );
      expect(problems.map((p) => p.path)).toEqual(["theme.colors.text"]);
    });

    it.each(["a; b", "a { b }", "</style>", "a /* b */", "\\"])(
      "rejects the font value %j",
      (value) => {
        const problems = problemsOf(
          `theme:\n  fonts:\n    body: ${JSON.stringify(value)}\n`,
        );
        expect(problems.map((p) => p.path)).toEqual(["theme.fonts.body"]);
      },
    );

    it("rejects a file that is not a mapping", () => {
      expect(problemsOf("- a\n- b\n")).toHaveLength(1);
      expect(problemsOf("just text\n")).toHaveLength(1);
    });

    it("rejects invalid YAML and says where", () => {
      const [problem] = problemsOf("theme:\n  colors: [\n");
      expect(problem?.message).toMatch(/line \d+/);
    });

    it("rejects duplicate keys", () => {
      const [problem] = problemsOf("theme: {}\ntheme: {}\n");
      expect(problem?.message).toMatch(/unique/i);
    });

    it("names the file and every field in the error message", () => {
      try {
        parseSiteConfig("theme:\n  colours: {}\n", "my-site/site.yaml");
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigError);
        const { message } = error as ConfigError;
        expect(message).toContain("my-site/site.yaml");
        expect(message).toContain("theme.colours");
      }
    });
  });
});
