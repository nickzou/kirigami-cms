import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
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

const site = {
  "index.md": "# Basic site\n",
  "about/index.md": "# About\n",
  "blog/hello.md": "# Hello, world\n",
};

/** The path is checked as it is typed, so the problem shows before anything is sent. */
export const NewPageWarnsOfASharedAddress: Story = {
  beforeEach: () => installFakeApi(site).restore,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: "New page" }),
    );
    await userEvent.type(await canvas.findByLabelText("Name"), "about");
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "about/index.md",
    );
    await expect(canvas.getByRole("button", { name: "Create" })).toBeDisabled();
  },
};

export const DeletesAfterConfirming: Story = {
  beforeEach: () => installFakeApi(site).restore,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: "Delete blog/hello.md" }),
    );
    await expect(await canvas.findByText(/cannot be undone/)).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Delete page" }));
    // Its folder had only that page, so the folder goes with it.
    await waitFor(() =>
      expect(canvas.queryByRole("button", { name: /^blog/ })).toBeNull(),
    );
  },
};
