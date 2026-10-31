import { type FormEvent, type ReactNode, useId, useState } from "react";
import { ApiRequestError } from "../../api.js";
import { normalizePagePath, pathProblem } from "../../page-path.js";
import { Alert } from "../Alert/Alert.js";
import { Button } from "../Button/Button.js";
import { Dialog } from "../Dialog/Dialog.js";

export interface PagePathDialogProps {
  title: string;
  /** What the button that goes ahead says, e.g. "Create". */
  submitLabel: string;
  /** The path to start from: empty for a new page, the current one for a rename. */
  initial: string;
  /**
   * The paths of the other pages, to say right away if the path is taken or the
   * build would refuse it. Without them only the server can say.
   */
  others?: readonly string[];
  /** Something to tell the person before they go ahead. */
  note?: ReactNode;
  /** Does the work. A refusal from the API is shown in the dialog. */
  onSubmit: (path: string) => Promise<void>;
  onClose: () => void;
}

/**
 * Asks for a page's path and checks it as it is typed. It is the body of the
 * New page dialog.
 */
export function PagePathDialog({
  title,
  submitLabel,
  initial,
  others,
  note,
  onSubmit,
  onClose,
}: PagePathDialogProps) {
  const inputId = useId();
  const helpId = useId();
  const [input, setInput] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string>();

  const path = normalizePagePath(input);
  const unchanged = path === initial;
  const problem = unchanged ? undefined : pathProblem(path, others ?? []);
  // Nothing to complain about before anything is typed.
  const shownProblem = input.trim() === "" ? undefined : problem;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (problem || unchanged || busy) return;
    setBusy(true);
    setFailure(undefined);
    try {
      await onSubmit(path);
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
    <Dialog title={title} onClose={onClose}>
      <form onSubmit={submit}>
        <label htmlFor={inputId} className=":uno: font-bold">
          Path
        </label>
        <input
          id={inputId}
          autoFocus
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
            setFailure(undefined);
          }}
          aria-describedby={helpId}
          aria-invalid={shownProblem !== undefined}
          spellCheck={false}
          placeholder="blog/hello.md"
          className=":uno: mt-1 block w-full rounded border border-solid border-line bg-bg p-2 font-mono text-text"
        />
        <p id={helpId} className=":uno: mt-2 mb-0 text-sm text-muted">
          Folders are created as needed. <code>.md</code> is added if you leave
          it out.
        </p>
        {shownProblem && (
          <p role="alert" className=":uno: mt-2 mb-0 text-sm text-danger">
            {shownProblem}
          </p>
        )}
        {note && <p className=":uno: mt-2 mb-0 text-sm text-muted">{note}</p>}
        {failure && <Alert tone="error">{failure}</Alert>}
        <div className=":uno: mt-6 flex justify-end gap-3">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            variant="primary"
            disabled={busy || unchanged || problem !== undefined || path === ""}
          >
            {busy ? "Working…" : submitLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
