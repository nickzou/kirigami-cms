import type { Meta, StoryObj } from "@storybook/react-vite";
import { BackLink } from "./BackLink.js";

const meta = {
  title: "Components/BackLink",
  component: BackLink,
  tags: ["autodocs"],
} satisfies Meta<typeof BackLink>;
export default meta;

export const Default: StoryObj<typeof meta> = {};
