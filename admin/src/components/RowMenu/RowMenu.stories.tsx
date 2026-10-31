import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { RowMenu } from "./RowMenu.js";

const meta = {
  title: "Components/RowMenu",
  component: RowMenu,
  tags: ["autodocs"],
  args: {
    label: "Actions for Hello",
    items: [
      { label: "Rename", to: "/pages/hello.md", state: { rename: true } },
      { label: "Delete", onSelect: fn(), danger: true },
    ],
  },
  decorators: [
    (Story: () => React.JSX.Element) => (
      <div className=":uno: flex justify-end p-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RowMenu>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

/** The menu is drawn on the page, so it is found from the whole document. */
export const Open: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Actions for Hello" }),
    );
    const menu = within(document.body).getByRole("menu");
    await expect(
      within(menu).getByRole("menuitem", { name: "Rename" }),
    ).toHaveFocus();
  },
};

export const Choosing: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: "Actions for Hello" });
    await userEvent.click(button);
    await userEvent.keyboard("{ArrowDown}");
    await expect(
      within(document.body).getByRole("menuitem", { name: "Delete" }),
    ).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(args.items[1]?.onSelect).toHaveBeenCalled();
    await waitFor(() =>
      expect(within(document.body).queryByRole("menu")).toBeNull(),
    );
  },
};

export const EscapeCloses: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: "Actions for Hello" });
    await userEvent.click(button);
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(within(document.body).queryByRole("menu")).toBeNull(),
    );
    await expect(button).toHaveFocus();
  },
};
