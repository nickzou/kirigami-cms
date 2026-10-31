import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";
import { PageRow } from "../PageRow/PageRow.js";
import { FolderRow } from "./FolderRow.js";

const folder = {
  name: "blog",
  path: "blog",
  folders: [],
  pages: [
    { path: "blog/hello.md", title: "Hello, world", version: "1" },
    { path: "blog/second.md", title: "A second post", version: "2" },
  ],
};

const meta = {
  title: "Components/FolderRow",
  component: FolderRow,
  tags: ["autodocs"],
  args: {
    folder,
    depth: 0,
    open: true,
    onToggle: () => {},
    contentsId: "blog-contents",
  },
  // A row is a list item, so it needs a list (and the box the list sits in).
  decorators: [
    (Story: () => React.JSX.Element) => (
      <ul className=":uno: m-0 list-none overflow-hidden rounded-lg border border-solid border-line bg-surface p-0 shadow">
        <Story />
      </ul>
    ),
  ],
  render: (args) => (
    <FolderRow {...args}>
      <ul className=":uno: m-0 list-none p-0">
        {args.folder.pages.map((page) => (
          <PageRow key={page.path} page={page} depth={args.depth + 1} />
        ))}
      </ul>
    </FolderRow>
  ),
} satisfies Meta<typeof FolderRow>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {};

export const Closed: Story = { args: { open: false } };

export const OnePage: Story = {
  args: { folder: { ...folder, pages: folder.pages.slice(0, 1) } },
};

/** Clicking the row opens and closes it; this one keeps its own state. */
export const Interactive: Story = {
  render: (args) => {
    const [open, setOpen] = useState(true);
    return (
      <FolderRow {...args} open={open} onToggle={() => setOpen(!open)}>
        <ul className=":uno: m-0 list-none p-0">
          {args.folder.pages.map((page) => (
            <PageRow key={page.path} page={page} depth={args.depth + 1} />
          ))}
        </ul>
      </FolderRow>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole("button", { name: /blog/ });
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(canvas.getByText("Hello, world")).toBeVisible();
    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(canvas.queryByText("Hello, world")).toBeNull();
  },
};

/** Given a handler, the row has a button that starts a new page in the folder. */
export const WithNewPage: Story = {
  args: { onNewPage: fn() },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "New page in blog" }),
    );
    await expect(args.onNewPage).toHaveBeenCalledWith(args.folder);
  },
};
