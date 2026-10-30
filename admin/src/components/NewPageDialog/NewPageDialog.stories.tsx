import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { NewPageDialog } from "./NewPageDialog.js";

const meta = {
  title: "Components/NewPageDialog",
  component: NewPageDialog,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: {
    others: ["index.md", "about/index.md", "blog/hello.md"],
    onCreate: fn(async () => {}),
    onClose: fn(),
  },
} satisfies Meta<typeof NewPageDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** `.md` is added when it is left out, and the new path is what gets created. */
export const Creates: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByLabelText("Path"), "blog/second");
    await userEvent.click(canvas.getByRole("button", { name: "Create" }));
    await waitFor(() =>
      expect(args.onCreate).toHaveBeenCalledWith("blog/second.md"),
    );
  },
};

export const PathTaken: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByLabelText("Path"), "blog/hello");
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "A page already exists at blog/hello.md.",
    );
    await expect(canvas.getByRole("button", { name: "Create" })).toBeDisabled();
  },
};

/** `about.md` and `about/index.md` would be shown at the same address. */
export const SharedAddress: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByLabelText("Path"), "about");
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "about/index.md",
    );
    await expect(canvas.getByRole("button", { name: "Create" })).toBeDisabled();
  },
};

export const InvalidPath: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByLabelText("Path"), "../outside");
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "not allowed",
    );
  },
};

/** The server can refuse what the page could not tell (say, a page added meanwhile). */
export const ServerRefuses: Story = {
  args: {
    onCreate: fn(async () => {
      const { ApiRequestError } = await import("../../api.js");
      throw new ApiRequestError(
        "A page already exists at new.md.",
        409,
        "exists",
      );
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByLabelText("Path"), "new");
    await userEvent.click(canvas.getByRole("button", { name: "Create" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "A page already exists at new.md.",
    );
  },
};
