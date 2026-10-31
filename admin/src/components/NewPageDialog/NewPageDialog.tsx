import { type FormEvent, useId, useMemo, useState } from "react";
import { ApiRequestError } from "../../api.js";
import { pathProblem } from "../../page-path.js";
import { folderPaths } from "../../page-tree.js";
import { Alert } from "../Alert/Alert.js";
import { Button } from "../Button/Button.js";
import { Dialog } from "../Dialog/Dialog.js";
import { Select } from "../Select/Select.js";
import { TextField } from "../TextField/TextField.js";

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

  return (
    <Dialog title="New page" onClose={onClose}>
      <form onSubmit={submit} className=":uno: flex flex-col gap-4">
        <Select
          label="Folder"
          value={folder}
          onChange={(event) => setFolder(event.target.value)}
        >
          <option value="">Top level</option>
          {folders.map((path) => (
            <option key={path} value={path}>
              {path}
            </option>
          ))}
        </Select>
        <div>
          <TextField
            label="Name"
            autoFocus
            mono
            suffix={EXTENSION}
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
          />
          <p id={helpId} className=":uno: mt-2 mb-0 text-sm text-muted">
            Type a folder and a slash to make a new folder, like{" "}
            <code>drafts/hello</code>.
          </p>
          {problem && (
            <p role="alert" className=":uno: mt-2 mb-0 text-sm text-danger">
              {problem}
            </p>
          )}
        </div>
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
