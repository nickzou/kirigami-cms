// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../../App.js";
import { createFakeApi, type FakeApiOptions } from "../../fake-api.js";
import { AuthGate } from "./AuthGate.js";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const PASSWORD = "correct horse";

function open(options: FakeApiOptions | null, path = "/") {
  const api = createFakeApi(
    { "blog/hello.md": "# Hello\n" },
    undefined,
    options ?? undefined,
  );
  vi.stubGlobal("fetch", api.fetch);
  const router = createMemoryRouter([{ path: "*", element: <App /> }], {
    initialEntries: [path],
  });
  render(
    <AuthGate>
      <RouterProvider router={router} />
    </AuthGate>,
  );
  return api;
}

const typePassword = (value: string) =>
  fireEvent.change(screen.getByLabelText("Password"), { target: { value } });

describe("AuthGate with no password set", () => {
  it("shows the admin, with nothing to sign out of", async () => {
    open(null);
    await screen.findByRole("link", { name: /Hello/ });
    expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();
    expect(screen.queryByLabelText("Password")).toBeNull();
  });
});

describe("AuthGate with a password", () => {
  it("asks for it before showing any page", async () => {
    open({ password: PASSWORD });
    expect(
      await screen.findByRole("heading", { name: "Sign in" }),
    ).toBeDefined();
    expect(screen.queryByRole("link", { name: /Hello/ })).toBeNull();
    expect(screen.queryByRole("banner")).toBeNull();
  });

  it("keeps the field and says so when the password is wrong", async () => {
    open({ password: PASSWORD });
    await screen.findByLabelText("Password");
    typePassword("nope nope");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "That password is not right.",
    );
    expect((screen.getByLabelText("Password") as HTMLInputElement).value).toBe(
      "nope nope",
    );
    expect(screen.queryByRole("link", { name: /Hello/ })).toBeNull();
  });

  it("cannot be sent empty", async () => {
    open({ password: PASSWORD });
    await screen.findByLabelText("Password");
    expect(
      (screen.getByRole("button", { name: "Sign in" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("shows the page you were going to once you are in", async () => {
    open({ password: PASSWORD }, "/pages/blog/hello.md");
    await screen.findByLabelText("Password");
    typePassword(PASSWORD);
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(
      ((await screen.findByLabelText("Markdown")) as HTMLTextAreaElement).value,
    ).toBe("# Hello\n");
  });

  it("goes straight in when already signed in", async () => {
    open({ password: PASSWORD, signedIn: true });
    await screen.findByRole("link", { name: /Hello/ });
    expect(screen.queryByLabelText("Password")).toBeNull();
  });

  it("signs out from the sidebar and asks again", async () => {
    open({ password: PASSWORD, signedIn: true });
    await screen.findByRole("link", { name: /Hello/ });
    fireEvent.click(
      screen.getAllByRole("button", { name: "Sign out" })[0] as HTMLElement,
    );
    expect(
      await screen.findByRole("heading", { name: "Sign in" }),
    ).toBeDefined();
    expect(screen.queryByRole("link", { name: /Hello/ })).toBeNull();
  });

  it("opens a sign-in dialog when the session ends, and keeps unsaved text", async () => {
    const api = open(
      { password: PASSWORD, signedIn: true },
      "/pages/blog/hello.md",
    );
    const box = (await screen.findByLabelText(
      "Markdown",
    )) as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: "# Hello\n\nUnsaved words\n" } });

    api.expireSession();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    const dialog = await screen.findByRole("dialog", { name: "Sign in again" });
    expect(
      (screen.getByLabelText("Markdown") as HTMLTextAreaElement).value,
    ).toBe("# Hello\n\nUnsaved words\n");

    fireEvent.change(within(dialog).getByLabelText("Password"), {
      target: { value: PASSWORD },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    // Back in, the text is still there and now it saves.
    expect(
      (screen.getByLabelText("Markdown") as HTMLTextAreaElement).value,
    ).toBe("# Hello\n\nUnsaved words\n");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(async () =>
      expect((await api.store.read("blog/hello.md")).content).toBe(
        "# Hello\n\nUnsaved words\n",
      ),
    );
  });
});
