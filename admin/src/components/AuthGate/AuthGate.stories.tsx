import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { App } from "../../App.js";
import { installFakeApi } from "../../fake-api.js";
import { appendText, editorText } from "../../test-editor.js";
import { AuthGate } from "./AuthGate.js";

const files = {
  "index.md": "# Basic site\n",
  "blog/hello.md": "# Hello, world\n\nSome text.\n",
};

const meta = {
  title: "Screens/AuthGate",
  component: AuthGate,
  parameters: { layout: "fullscreen" },
  args: { children: <App /> },
} satisfies Meta<typeof AuthGate>;
export default meta;
type Story = StoryObj<typeof meta>;

/** A password is set and you are not signed in: the sign-in screen, in place of the admin. */
export const SignedOut: Story = {
  beforeEach: () =>
    installFakeApi(files, undefined, { password: "correct horse" }).restore,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { name: "Sign in" }),
    ).toBeVisible();
  },
};

export const WrongPassword: Story = {
  beforeEach: SignedOut.beforeEach,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByLabelText("Password"), "nope nope");
    await userEvent.click(canvas.getByRole("button", { name: "Sign in" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "That password is not right.",
    );
  },
};

export const SigningIn: Story = {
  beforeEach: SignedOut.beforeEach,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      await canvas.findByLabelText("Password"),
      "correct horse",
    );
    await userEvent.click(canvas.getByRole("button", { name: "Sign in" }));
    await expect(
      await canvas.findByRole("link", { name: /Hello, world/ }),
    ).toBeVisible();
  },
};

/** Signed in with a password set: the sidebar has a Sign out item. */
export const SignedIn: Story = {
  beforeEach: () =>
    installFakeApi(files, undefined, {
      password: "correct horse",
      signedIn: true,
    }).restore,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("link", { name: /Hello, world/ });
    await waitFor(() =>
      expect(
        canvas.getAllByRole("button", { name: "Sign out" }).length,
      ).toBeGreaterThan(0),
    );
  },
};

/** The session ends while you are in the editor: a dialog opens over it, and your text stays. */
export const SessionEndsWhileEditing: Story = {
  parameters: { route: "/pages/blog/hello.md" },
  beforeEach: () => {
    const api = installFakeApi(files, undefined, {
      password: "correct horse",
      signedIn: true,
    });
    (globalThis as { __expire?: () => void }).__expire = api.expireSession;
    return api.restore;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const box = await canvas.findByLabelText("Markdown");
    appendText(box, " More words.");
    (globalThis as { __expire?: () => void }).__expire?.();
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    const dialog = await within(document.body).findByRole("dialog", {
      name: "Sign in again",
    });
    await expect(dialog).toBeVisible();
    await expect(editorText(canvas.getByLabelText("Markdown"))).toContain(
      "More words.",
    );
  },
};
