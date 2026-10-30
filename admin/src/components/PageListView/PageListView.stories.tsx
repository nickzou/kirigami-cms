import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { PageListView } from "./PageListView.js";

const meta = {
  title: "Components/PageListView",
  component: PageListView,
  tags: ["autodocs"],
} satisfies Meta<typeof PageListView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    pages: [
      { path: "index.md", title: "Basic site", version: "1" },
      { path: "about.md", title: "About", version: "2" },
      { path: "blog/hello.md", title: "Hello, world", version: "3" },
    ],
  },
};

export const Empty: Story = { args: { pages: [] } };

export const AwkwardPaths: Story = {
  args: {
    pages: [
      { path: "my post.md", title: "A path with a space", version: "1" },
      {
        path: "docs/guides/getting-started/installing-on-every-operating-system-you-can-think-of.md",
        title:
          "A very long title that goes on and on to see how the row copes when there is not enough room",
        version: "2",
      },
    ],
  },
};

const manyPages = [
  { path: "index.md", title: "Basic site", version: "1" },
  { path: "about.md", title: "About", version: "2" },
  { path: "blog/hello.md", title: "Hello, world", version: "3" },
  { path: "blog/second-post.md", title: "A second post", version: "4" },
  { path: "docs/getting-started.md", title: "Getting started", version: "5" },
  { path: "docs/guides/themes.md", title: "Themes", version: "6" },
  { path: "docs/guides/content.md", title: "Writing content", version: "7" },
];

/** Pages in folders are grouped under them, to any depth, with a count. */
export const Folders: Story = { args: { pages: manyPages } };

/** A folder is a button: it opens and closes on its own, with the mouse or the keyboard. */
export const OpensAndCloses: Story = {
  args: { pages: manyPages },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const blog = await canvas.findByRole("button", { name: /^blog/ });
    await expect(blog).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(blog);
    await expect(blog).toHaveAttribute("aria-expanded", "false");
    await expect(canvas.queryByText("Hello, world")).not.toBeInTheDocument();

    // From the keyboard: Tab to the next folder and press Enter.
    const docs = canvas.getByRole("button", { name: /^docs/ });
    docs.focus();
    await userEvent.keyboard("{Enter}");
    await expect(docs).toHaveAttribute("aria-expanded", "false");
    await userEvent.keyboard(" ");
    await expect(docs).toHaveAttribute("aria-expanded", "true");
  },
};

/** Given handlers, each row has Rename and Delete buttons beside its link. */
export const WithActions: Story = {
  args: {
    ...Default.args,
    onRename: fn(),
    onDelete: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: "Rename about.md" }),
    );
    await expect(args.onRename).toHaveBeenCalledWith(
      expect.objectContaining({ path: "about.md" }),
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "Delete blog/hello.md" }),
    );
    await expect(args.onDelete).toHaveBeenCalledWith(
      expect.objectContaining({ path: "blog/hello.md" }),
    );
  },
};
