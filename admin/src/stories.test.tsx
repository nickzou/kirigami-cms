// @vitest-environment jsdom
import { composeStories, setProjectAnnotations } from "@storybook/react-vite";
import { cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import preview from "../../.storybook/preview.js";

// Runs every story the way Storybook does (setup, render, play function), so a
// story that no longer works fails the test run instead of rotting.
setProjectAnnotations([preview]);

afterEach(cleanup);

const modules = import.meta.glob<Record<string, unknown>>(
  "./**/*.stories.tsx",
  {
    eager: true,
  },
);

describe("stories", () => {
  it("finds the stories", () => {
    expect(Object.keys(modules).length).toBeGreaterThan(10);
  });

  for (const [file, module] of Object.entries(modules)) {
    describe(file.replace(/^\.\//, ""), () => {
      for (const [name, story] of Object.entries(
        composeStories(module as Parameters<typeof composeStories>[0]),
      )) {
        it(name, async () => {
          await (story as { run: () => Promise<void> }).run();
        });
      }
    });
  }
});
