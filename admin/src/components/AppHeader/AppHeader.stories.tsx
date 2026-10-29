import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppHeader } from "./AppHeader.js";

const meta = {
  title: "Components/AppHeader",
  component: AppHeader,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof AppHeader>;
export default meta;

export const Default: StoryObj<typeof meta> = {};
