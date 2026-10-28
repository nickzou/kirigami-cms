import type { Meta, StoryObj } from "@storybook/react-vite";
import { App } from "./App.js";
import { installFakeApi } from "./fake-api.js";

const meta = {
  title: "Screens/App",
  component: App,
  parameters: { layout: "fullscreen" },
  beforeEach: () =>
    installFakeApi({
      "index.md": "# Basic site\n",
      "blog/hello.md": "# Hello, world\n\nSome text.\n",
    }).restore,
} satisfies Meta<typeof App>;
export default meta;
type Story = StoryObj<typeof meta>;

export const PagesRoute: Story = {};

export const EditorRoute: Story = {
  parameters: { route: "/pages/blog/hello.md" },
};

export const UnknownRoute: Story = { parameters: { route: "/nowhere" } };
