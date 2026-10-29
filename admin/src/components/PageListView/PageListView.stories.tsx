import type { Meta, StoryObj } from "@storybook/react-vite";
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
