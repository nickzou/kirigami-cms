import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { AppShell } from "./AppShell.js";

const meta = {
  title: "Components/AppShell",
  component: AppShell,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof AppShell>;
export default meta;

export const Default: StoryObj<typeof meta> = {
  args: {
    children: (
      <>
        <h1>Pages</h1>
        <p>Whatever the screen shows goes here.</p>
      </>
    ),
  },
};

/** The sidebar thins to icons, and is remembered. (Seen from tablet width.) */
export const ThinSidebar: StoryObj<typeof meta> = {
  ...Default,
  parameters: { viewport: { defaultViewport: "tablet" } },
  beforeEach: () => {
    localStorage.removeItem("kirigami.sidebar-thin");
    return () => localStorage.removeItem("kirigami.sidebar-thin");
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole("button", { name: "Thin the sidebar" });
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(toggle);
    await expect(
      canvas.getByRole("button", { name: "Expand the sidebar" }),
    ).toHaveAttribute("aria-expanded", "false");
    await expect(localStorage.getItem("kirigami.sidebar-thin")).toBe("true");
  },
};
