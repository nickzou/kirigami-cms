import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./Button.js";

const meta = {
  title: "Components/Button",
  component: Button,
  tags: ["autodocs"],
  args: { children: "Save" },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Primary: Story = { args: { variant: "primary" } };
export const Disabled: Story = { args: { disabled: true } };
export const Busy: Story = { args: { children: "Saving…", disabled: true } };

/** With `to` it renders a link that looks the same: for going somewhere. */
export const AsLink: Story = { args: { to: "/", children: "Go to the pages" } };
export const PrimaryAsLink: Story = {
  args: { to: "/", variant: "primary", children: "Go to the pages" },
};
