import { describe, expect, it } from "vitest";
import {
  ConfigError,
  defaultProjectConfig,
  parseProjectConfig,
} from "./load.js";

const parse = (text: string) =>
  parseProjectConfig(text, "kirigami.config.yaml");
const problemsOf = (text: string) => {
  try {
    parse(text);
  } catch (error) {
    if (error instanceof ConfigError) return error.problems;
    throw error;
  }
  throw new Error("expected a ConfigError");
};

describe("parseProjectConfig", () => {
  it("gives the defaults for an empty file", () => {
    expect(parse("")).toEqual(defaultProjectConfig);
    expect(defaultProjectConfig).toEqual({
      content: { store: "local-folder", path: "./content" },
      build: { out: "./dist" },
    });
  });

  it("reads where the content is and where the build goes", () => {
    expect(
      parse(
        "content:\n  store: local-folder\n  path: ../shared/pages\nbuild:\n  out: ./public\n",
      ),
    ).toEqual({
      content: { store: "local-folder", path: "../shared/pages" },
      build: { out: "./public" },
    });
  });

  it("uses ./content when the store names no path", () => {
    expect(parse("content:\n  store: local-folder\n").content).toEqual({
      store: "local-folder",
      path: "./content",
    });
  });

  it("names a store it does not know, and says which one exists", () => {
    const [problem] = problemsOf("content:\n  store: google-drive\n");
    expect(problem?.path).toBe("content.store");
    expect(problem?.message).toContain("local-folder");
  });

  it("asks for a store when the content names none", () => {
    expect(problemsOf("content:\n  path: ./pages\n")[0]?.path).toBe(
      "content.store",
    );
  });

  it("reports an unknown key by its full path", () => {
    expect(problemsOf("content:\n  store: local-folder\n  bogus: 1\n")).toEqual(
      [{ path: "content.bogus", message: 'Unknown key "bogus"' }],
    );
    expect(problemsOf("nope: 1\n")).toEqual([
      { path: "nope", message: 'Unknown key "nope"' },
    ]);
  });

  it("refuses an empty path", () => {
    expect(
      problemsOf("content:\n  store: local-folder\n  path: ''\n")[0]?.path,
    ).toBe("content.path");
  });

  it("reports invalid YAML with its line", () => {
    const [problem] = problemsOf("content:\n  store: [unclosed\n");
    expect(problem?.path).toBe("");
    expect(problem?.message).toMatch(/line \d+/);
  });
});
