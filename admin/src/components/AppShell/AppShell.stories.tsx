import type { Meta, StoryObj } from "@storybook/react-vite";
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
