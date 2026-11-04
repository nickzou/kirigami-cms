import { type FormEvent, useState } from "react";
import { ApiRequestError } from "../../api.js";
import { Alert } from "../Alert/Alert.js";
import { Button } from "../Button/Button.js";
import { Logo } from "../Logo/Logo.js";
import { TextField } from "../TextField/TextField.js";

export interface SignInFormProps {
  /** Signs in. It rejects when the password is refused, and the message is shown. */
  onSignIn: (password: string) => Promise<void>;
}

/**
 * The password field and the Sign in button. A wrong password is said under
 * the field, which keeps what was typed so it can be fixed.
 */
export function SignInForm({ onSignIn }: SignInFormProps) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string>();

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password === "" || busy) return;
    setBusy(true);
    setFailure(undefined);
    try {
      await onSignIn(password);
    } catch (error) {
      setFailure(
        error instanceof ApiRequestError
          ? error.message
          : "Could not reach the server. Try again.",
      );
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className=":uno: flex flex-col gap-4">
      <div>
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setFailure(undefined);
          }}
          aria-invalid={failure !== undefined}
        />
        <p className=":uno: mt-2 mb-0 text-sm text-muted">
          The password is set where Kirigami runs (
          <code>KIRIGAMI_PASSWORD</code>).
        </p>
      </div>
      {failure && <Alert tone="error">{failure}</Alert>}
      <Button
        type="submit"
        variant="primary"
        disabled={busy || password === ""}
        className=":uno: w-full"
      >
        {busy ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

/** The sign-in screen: a card in the middle of the page, with no menu around it. */
export function SignIn({ onSignIn }: SignInFormProps) {
  return (
    <main className=":uno: flex min-h-screen items-center justify-center p-4">
      <div className=":uno: w-[min(24rem,100%)] rounded-lg border border-solid border-line bg-surface p-6 shadow-lg">
        <div className=":uno: mb-4 flex items-center gap-2 text-lg font-bold tracking-widest text-text uppercase">
          <Logo className=":uno: h-6 w-auto shrink-0" />
          Kirigami
        </div>
        <h1 className=":uno: mt-0 mb-4 text-xl">Sign in</h1>
        <SignInForm onSignIn={onSignIn} />
      </div>
    </main>
  );
}
