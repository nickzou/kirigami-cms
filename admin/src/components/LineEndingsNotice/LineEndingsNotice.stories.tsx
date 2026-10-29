import type { Meta, StoryObj } from "@storybook/react-vite";
import { LineEndingsNotice } from "./LineEndingsNotice.js";

const meta = {
  title: "Components/LineEndingsNotice",
  component: LineEndingsNotice,
  tags: ["autodocs"],
} satisfies Meta<typeof LineEndingsNotice>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Windows: Story = { args: { eol: "\r\n" } };
export const Unix: Story = { args: { eol: "\n" } };
