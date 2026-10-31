import { type FormEvent, useId, useMemo, useState } from "react";
import { ApiRequestError } from "../../api.js";
import { pathProblem } from "../../page-path.js";
import { folderPaths } from "../../page-tree.js";
import { Alert } from "../Alert/Alert.js";
import { Button } from "../Button/Button.js";
import { Dialog } from "../Dialog/Dialog.js";

export interface NewPageDialogProps {
  /** The paths of the pages there already are. */
  others?: readonly string[];
  /** A folder to start in (one of the existing folders), or the top level. */
  folder?: string;
  /** Creates the page at this path. A refusal from the API is shown in the dialog. */
  onCreate: (path: string) => Promise<void>;
  onClose: () => void;
}

const EXTENSION = ".md";

/**
 * Asks where a new page should go: a folder to pick from the ones there are,
 * and a name. A slash in the name makes a new folder (`drafts/hello`), since a
 * folder exists because a page is in it. Pages are markdown, so `.md` is shown
 * after the name and is not typed. What is wrong with the path is said as it
 * is typed.
 */
export function NewPageDialog({
  others,
  folder: initialFolder = "",
  onCreate,
  onClose,
}: NewPageDialogProps) {
  const folderId = useId();
  const nameId = useId();
  const helpId = useId();
  const folders = useMemo(() => folderPaths(others ?? []), [others]);
  const [folder, setFolder] = useState(initialFolder);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string>();

  const stem = name.trim().replace(/^\/+/, "");
  const path =
    stem === ""
      ? ""
      : `${folder === "" ? "" : `${folder}/`}${stem}${EXTENSION}`;
  const problem = path === "" ? undefined : pathProblem(path, others ?? []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (path === "" || problem || busy) return;
    setBusy(true);
    setFailure(undefined);
    try {
      await onCreate(path);
    } catch (error) {
      setFailure(
        error instanceof ApiRequestError
          ? error.message
          : "Could not reach the server. Try again.",
      );
      setBusy(false);
    }
  }

  const field =
    ":uno: mt-1 block w-full rounded border border-solid border-line bg-bg p-2 text-text";
  return (
    <Dialog title="New page" onClose={onClose}>
      <form onSubmit={submit}>
        <label htmlFor={folderId} className=":uno: font-bold">
          Folder
        </label>
        <select
          id={folderId}
          value={folder}
          onChange={(event) => setFolder(event.target.value)}
          className={`${field} [font:inherit]`}
        >
          <option value="">Top level</option>
          {folders.map((path) => (
            <option key={path} value={path}>
              {path}
            </option>
          ))}
        </select>
        <label htmlFor={nameId} className=":uno: mt-4 block font-bold">
          Name
        </label>
        <div className=":uno: mt-1 flex items-center rounded border border-solid border-line bg-bg px-2 focus-within:border-accent">
          <input
            id={nameId}
            autoFocus
            value={name}
            onChange={(event) => {
              // Typing the extension is no use: it is added.
              setName(event.target.value.replace(/\.md$/i, ""));
              setFailure(undefined);
            }}
            aria-describedby={helpId}
            aria-invalid={problem !== undefined}
            spellCheck={false}
            placeholder="hello"
            className=":uno: min-w-0 flex-1 border-0 bg-transparent py-2 font-mono text-text focus:outline-none"
          />
          <span
            aria-hidden="true"
            className=":uno: shrink-0 font-mono text-muted select-none"
          >
            {EXTENSION}
          </span>
        </div>
        <p id={helpId} className=":uno: mt-2 mb-0 text-sm text-muted">
          Type a folder and a slash to make a new folder, like{" "}
          <code>drafts/hello</code>.
        </p>
        {problem && (
          <p role="alert" className=":uno: mt-2 mb-0 text-sm text-danger">
            {problem}
          </p>
        )}
        {failure && <Alert tone="error">{failure}</Alert>}
        <div className=":uno: mt-6 flex justify-end gap-3">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            variant="primary"
            disabled={busy || path === "" || problem !== undefined}
          >
            {busy ? "Working…" : "Create"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
