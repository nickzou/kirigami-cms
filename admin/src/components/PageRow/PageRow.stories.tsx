import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { PageRow } from "./PageRow.js";

const meta = {
  title: "Components/PageRow",
  component: PageRow,
  tags: ["autodocs"],
  args: {
    page: { path: "blog/hello.md", title: "Hello, world", version: "1" },
    depth: 0,
  },
  // A row is a list item, so it needs a list (and the box the list sits in).
  decorators: [
    (Story: () => React.JSX.Element) => (
      <ul className=":uno: m-0 list-none overflow-hidden rounded-lg border border-solid border-line bg-surface p-0 shadow">
        <Story />
      </ul>
    ),
  ],
} satisfies Meta<typeof PageRow>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Nested: Story = { args: { depth: 2 } };

export const WithActions: Story = {
  args: { onRename: fn(), onDelete: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Rename blog/hello.md" }),
    );
    await expect(args.onRename).toHaveBeenCalledWith(args.page);
    await userEvent.click(
      canvas.getByRole("button", { name: "Delete blog/hello.md" }),
    );
    await expect(args.onDelete).toHaveBeenCalledWith(args.page);
  },
};

export const LongNames: Story = {
  args: {
    page: {
      path: "docs/guides/installing-on-every-operating-system-you-can-think-of.md",
      title:
        "A very long title that goes on and on to see how the row copes when there is not enough room",
      version: "1",
    },
    onRename: fn(),
    onDelete: fn(),
  },
};
