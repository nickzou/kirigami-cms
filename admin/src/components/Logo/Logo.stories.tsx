import type { Meta, StoryObj } from "@storybook/react-vite";
import { Logo } from "./Logo.js";

const meta = {
  title: "Components/Logo",
  component: Logo,
  tags: ["autodocs"],
  args: { className: ":uno: h-16 text-text" },
} satisfies Meta<typeof Logo>;
export default meta;

export const Default: StoryObj<typeof meta> = {};

export const Accent: StoryObj<typeof meta> = {
  args: { className: ":uno: h-16 text-accent" },
};
