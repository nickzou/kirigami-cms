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
/** The Folder select's value for "make a new folder". No folder path starts with a slash. */
const NEW_FOLDER = "/new";

/**
 * Asks where a new page should go: a folder (one of the ones there are, the
 * top level, or "New folder…" with a name to give it) and a name for the page.
 * A folder exists because a page is in it, so a new folder is made by creating
 * its first page. The page's name has no slash: the folder is picked above it.
 * Pages are markdown, so `.md` is shown after the name and is not typed. What
 * is wrong with the path is said as it is typed.
 */
export function NewPageDialog({
  others,
  folder: initialFolder = "",
  onCreate,
  onClose,
}: NewPageDialogProps) {
  const folderHelpId = useId();
  const folders = useMemo(() => folderPaths(others ?? []), [others]);
  const [folder, setFolder] = useState(initialFolder);
  const [newFolder, setNewFolder] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string>();

  const making = folder === NEW_FOLDER;
  // A new folder may be nested (`blog/2026`); the page's own name may not.
  const folderPath = making
    ? newFolder.trim().replace(/^\/+|\/+$/g, "")
    : folder;
  const stem = name.trim();
  const slash = stem.includes("/");
  const path =
    stem === "" || (making && folderPath === "")
      ? ""
      : `${folderPath === "" ? "" : `${folderPath}/`}${stem}${EXTENSION}`;
  const problem = slash
    ? "A page's name cannot contain a slash. Pick a folder above, or choose New folder…."
    : path === ""
      ? undefined
      : pathProblem(path, others ?? []);

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
          <option value={NEW_FOLDER}>New folder…</option>
        </Select>
        {making && (
          <div>
            <TextField
              label="New folder name"
              autoFocus
              mono
              value={newFolder}
              onChange={(event) => {
                setNewFolder(event.target.value);
                setFailure(undefined);
              }}
              aria-describedby={folderHelpId}
              spellCheck={false}
              placeholder="drafts"
            />
            <p id={folderHelpId} className=":uno: mt-2 mb-0 text-sm text-muted">
              Use a slash for a folder inside another, like{" "}
              <code>blog/2026</code>.
            </p>
          </div>
        )}
        <div>
          <TextField
            label="Name"
            autoFocus={!making}
            mono
            suffix={EXTENSION}
            value={name}
            onChange={(event) => {
              // Typing the extension is no use: it is added.
              setName(event.target.value.replace(/\.md$/i, ""));
              setFailure(undefined);
            }}
            aria-invalid={problem !== undefined}
            spellCheck={false}
            placeholder="hello"
          />
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
