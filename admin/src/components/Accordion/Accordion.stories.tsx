import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { Accordion } from "./Accordion.js";

const meta = {
  title: "Components/Accordion",
  component: Accordion,
  tags: ["autodocs"],
  args: {
    title: "Advanced",
    description: "Finer settings, such as each heading's size.",
    open: false,
    onToggle: () => {},
    children: <p>Inside.</p>,
  },
  render: (args) => {
    const [open, setOpen] = useState(args.open);
    return <Accordion {...args} open={open} onToggle={() => setOpen(!open)} />;
  },
} satisfies Meta<typeof Accordion>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};
export const Open: Story = { args: { open: true } };
export const ClosedWithAProblem: Story = {
  args: { note: "1 problem" },
};

export const Toggles: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: /Advanced/ });
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await expect(canvas.getByText("Inside.")).not.toBeVisible();
    await userEvent.click(button);
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await expect(canvas.getByText("Inside.")).toBeVisible();
  },
};
