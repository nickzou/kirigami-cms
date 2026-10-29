import type { Meta, StoryObj } from "@storybook/react-vite";
import { PreviewFrame } from "./PreviewFrame.js";

const meta = {
  title: "Components/PreviewFrame",
  component: PreviewFrame,
  tags: ["autodocs"],
  args: { url: "/blog/hello/", version: 0, title: "Preview of blog/hello.md" },
} satisfies Meta<typeof PreviewFrame>;
export default meta;

export const Default: StoryObj<typeof meta> = {};
