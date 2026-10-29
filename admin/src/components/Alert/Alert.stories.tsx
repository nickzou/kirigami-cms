import type { Meta, StoryObj } from "@storybook/react-vite";
import { Alert } from "./Alert.js";

const meta = {
  title: "Components/Alert",
  component: Alert,
  tags: ["autodocs"],
} satisfies Meta<typeof Alert>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Failure: Story = {
  args: { tone: "error", children: <p>Something went wrong.</p> },
};
export const Warning: Story = {
  args: { tone: "warning", children: <p>Heads up: this is only a warning.</p> },
};

export const WithActions: Story = {
  args: {
    tone: "error",
    children: (
      <>
        <p>This page changed since you opened it, so nothing was saved.</p>
        <p>Your changes are still in the editor.</p>
      </>
    ),
  },
};

export const SingleLine: Story = {
  args: { tone: "warning", children: <p>One short line.</p> },
};

export const LongText: Story = {
  args: {
    tone: "error",
    children: (
      <p>
        A long message that wraps onto several lines, to show the icon staying
        beside the first line instead of floating in the middle. It keeps going
        for a while so that it wraps even on a wide screen, and then a little
        more for good measure, so there is no doubt about how many lines this
        takes up when it is shown.
      </p>
    ),
  },
};
