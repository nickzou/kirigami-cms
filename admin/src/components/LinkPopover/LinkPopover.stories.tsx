import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";
import { LinkPopover } from "./LinkPopover.js";

const meta = {
  title: "Components/LinkPopover",
  component: LinkPopover,
  tags: ["autodocs"],
  args: {
    left: 0,
    top: 0,
    url: "https://example.com/docs",
    openHref: "https://example.com/docs",
    onUrlChange: fn(),
    onRemove: fn(),
    onDone: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ position: "relative", height: "14rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LinkPopover>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const NoAddressYet: Story = {
  args: { url: "", openHref: undefined },
};
export const Faded: Story = { args: { faded: true } };

/** The address is edited in place, and Remove and Escape report back. */
export const Editing: Story = {
  render: (args) => {
    const [url, setUrl] = useState(args.url);
    return <LinkPopover {...args} url={url} onUrlChange={setUrl} />;
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const field = canvas.getByRole("textbox", { name: "Address" });
    await userEvent.clear(field);
    await userEvent.type(field, "https://x.test");
    await expect(field).toHaveValue("https://x.test");
    await userEvent.keyboard("{Escape}");
    await expect(args.onDone).toHaveBeenCalled();
    await userEvent.click(canvas.getByRole("button", { name: "Remove link" }));
    await expect(args.onRemove).toHaveBeenCalled();
  },
};
