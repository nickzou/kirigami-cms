import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useBlocker } from "react-router";
import {
  ApiRequestError,
  ConflictError,
  getPage,
  type Page,
  savePage,
} from "./api.js";
import {
  detectLineEndings,
  forDisplay,
  forSaving,
  type LineEndings,
} from "./line-endings.js";

const LEAVE_MESSAGE = "You have unsaved changes. Leave without saving?";

type Load =
  | { status: "loading" }
  | { status: "error"; message: string; missing: boolean }
  | { status: "ready" };

type Save =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved" }
  | { status: "error"; message: string }
  | { status: "conflict"; message: string; gone: boolean };

/** What was last read from, or written to, the server. */
interface Base {
  content: string;
  version: string;
  endings: LineEndings;
}

const describe = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export function Editor({ path }: { path: string }) {
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [base, setBase] = useState<Base>();
  const [draft, setDraft] = useState("");
  const [save, setSave] = useState<Save>({ status: "idle" });
  const [attempt, setAttempt] = useState(0);
  const textarea = useRef<HTMLTextAreaElement>(null);

  const adopt = useCallback((page: Page) => {
    setBase({
      content: page.content,
      version: page.version,
      endings: detectLineEndings(page.content),
    });
    setDraft(forDisplay(page.content));
    setSave({ status: "idle" });
    setLoad({ status: "ready" });
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` reruns the load when the user retries.
  useEffect(() => {
    const controller = new AbortController();
    setLoad({ status: "loading" });
    getPage(path, controller.signal).then(adopt, (error: unknown) => {
      if (controller.signal.aborted) return;
      setLoad({
        status: "error",
        message: describe(error),
        missing: error instanceof ApiRequestError && error.status === 404,
      });
    });
    return () => controller.abort();
  }, [path, attempt, adopt]);

  const dirty = base !== undefined && draft !== forDisplay(base.content);
  const saving = save.status === "saving";

  const submit = useCallback(async () => {
    if (!base || !dirty || saving) return;
    const content = forSaving(draft, base.endings);
    setSave({ status: "saving" });
    try {
      const saved = await savePage(path, content, base.version);
      setBase({ ...base, content, version: saved.version });
      setSave({ status: "saved" });
    } catch (error) {
      setSave(
        error instanceof ConflictError
          ? {
              status: "conflict",
              message: error.message,
              gone: error.currentVersion === null,
            }
          : { status: "error", message: describe(error) },
      );
    }
  }, [base, dirty, saving, draft, path]);

  // Ctrl/Cmd+S saves, wherever the focus is on this screen.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void submit();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [submit]);

  // Leaving with unsaved changes asks first: in the app, and by closing the tab.
  const blocker = useBlocker(dirty);
  useEffect(() => {
    if (blocker.state !== "blocked") return;
    if (window.confirm(LEAVE_MESSAGE)) blocker.proceed();
    else blocker.reset();
  }, [blocker]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const back = (
    <p>
      <Link to="/">Back to all pages</Link>
    </p>
  );

  if (load.status === "loading") {
    return (
      <>
        <h1>{path}</h1>
        <p role="status">Loading…</p>
      </>
    );
  }

  if (load.status === "error" || !base) {
    const failed = load.status === "error" ? load : undefined;
    return (
      <>
        <h1>{path}</h1>
        <div role="alert">
          <p>
            {failed?.missing
              ? "This page does not exist."
              : `Could not load the page: ${failed?.message ?? ""}`}
          </p>
          {!failed?.missing && (
            <button type="button" onClick={() => setAttempt(attempt + 1)}>
              Try again
            </button>
          )}
        </div>
        {back}
      </>
    );
  }

  const reloadLatest = () => {
    setLoad({ status: "loading" });
    setAttempt(attempt + 1);
  };

  const copyMyText = async () => {
    const text = forSaving(draft, base.endings);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // No clipboard access: select the text so the user can copy it.
      textarea.current?.focus();
      textarea.current?.select();
    }
  };

  return (
    <>
      <h1>{path}</h1>
      {back}

      <form
        className="editor"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label htmlFor="page-content">Markdown</label>
        <textarea
          id="page-content"
          ref={textarea}
          value={draft}
          spellCheck
          onChange={(event) => {
            setDraft(event.target.value);
            if (save.status === "saved") setSave({ status: "idle" });
          }}
        />

        {base.endings.mixed && (
          <p className="notice">
            This page mixes line endings. Saving will use{" "}
            {base.endings.eol === "\r\n" ? "Windows (CRLF)" : "Unix (LF)"} line
            endings throughout.
          </p>
        )}

        <div className="editor-actions">
          <button type="submit" disabled={!dirty || saving}>
            {saving ? "Saving…" : "Save"}
          </button>
          <span className="editor-state">
            {dirty ? "Unsaved changes" : "No changes"}
          </span>
        </div>
      </form>

      <div role="status" className="editor-status">
        {save.status === "saved" && "Saved."}
      </div>

      {save.status === "error" && (
        <div role="alert" className="editor-problem">
          <p>Could not save: {save.message}</p>
          <p>Your changes are still here. Try saving again.</p>
        </div>
      )}

      {save.status === "conflict" && (
        <div role="alert" className="editor-problem">
          <p>
            {save.gone
              ? "This page was deleted or renamed since you opened it."
              : "This page changed since you opened it, so nothing was saved."}{" "}
            Your changes are still in the editor.
          </p>
          <div className="editor-actions">
            {!save.gone && (
              <button type="button" onClick={reloadLatest}>
                Load the latest and discard my changes
              </button>
            )}
            <button type="button" onClick={copyMyText}>
              Copy my text
            </button>
            <button type="button" onClick={() => setSave({ status: "idle" })}>
              Keep editing
            </button>
          </div>
        </div>
      )}
    </>
  );
}
