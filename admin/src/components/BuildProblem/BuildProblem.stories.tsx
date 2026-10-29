import type { Meta, StoryObj } from "@storybook/react-vite";
import { BuildProblem } from "./BuildProblem.js";

const meta = {
  title: "Components/BuildProblem",
  component: BuildProblem,
  tags: ["autodocs"],
} satisfies Meta<typeof BuildProblem>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ConfigProblem: Story = {
  args: {
    message:
      "Cannot build the site:\n  site.yaml (theme.colours): unknown field",
  },
};

export const CollidingPages: Story = {
  args: {
    message:
      "Cannot build the site:\n  about.md and about/index.md: these pages would both be written to about/index.html",
  },
};
