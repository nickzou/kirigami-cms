import type { Meta, StoryObj } from "@storybook/react-vite";
import { failures, installFakeApi } from "./fake-api.js";
import { PageList } from "./PageList.js";

const meta = {
  title: "Screens/PageList",
  component: PageList,
  tags: ["autodocs"],
} satisfies Meta<typeof PageList>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithPages: Story = {
  beforeEach: () =>
    installFakeApi({
      "index.md": "# Basic site\n",
      "about.md": "# About\n",
      "blog/hello.md": "# Hello, world\n",
    }).restore,
};

export const NoPages: Story = {
  beforeEach: () => installFakeApi({}).restore,
};

export const Loading: Story = {
  beforeEach: () => installFakeApi({}, failures.never).restore,
};

export const ServerError: Story = {
  beforeEach: () =>
    installFakeApi({}, failures.serverError("Disk on fire")).restore,
};
