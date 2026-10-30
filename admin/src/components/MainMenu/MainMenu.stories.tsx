import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { MainMenu } from "./MainMenu.js";

const meta = {
  title: "Components/MainMenu",
  component: MainMenu,
  tags: ["autodocs"],
  // The sidebar's width, so the stories show it as it sits in the shell.
  decorators: [
    (Story: () => React.JSX.Element) => (
      <div className=":uno: w-56 p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MainMenu>;
export default meta;
type Story = StoryObj<typeof meta>;

export const OnPages: Story = {
  parameters: { route: "/" },
  play: async ({ canvasElement }) => {
    const menu = within(canvasElement);
    await expect(menu.getByRole("link", { name: "Pages" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(
      menu.getByRole("link", { name: "Settings" }),
    ).not.toHaveAttribute("aria-current");
  },
};

/** Editing a page is still "Pages". */
export const EditingAPage: Story = {
  parameters: { route: "/pages/blog/hello.md" },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("link", { name: "Pages" }),
    ).toHaveAttribute("aria-current", "page");
  },
};

export const OnSettings: Story = {
  parameters: { route: "/settings" },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("link", { name: "Settings" }),
    ).toHaveAttribute("aria-current", "page");
  },
};
