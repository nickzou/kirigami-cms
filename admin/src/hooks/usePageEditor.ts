import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiRequestError,
  ConflictError,
  getPage,
  type Page,
  savePage,
} from "../api.js";
import {
  detectLineEndings,
  forDisplay,
  forSaving,
  type LineEndings,
} from "../line-endings.js";

export type Load =
  | { status: "loading" }
  | { status: "error"; message: string; missing: boolean }
  | { status: "ready" };

export type Save =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved" }
  | { status: "error"; message: string }
  | { status: "conflict"; gone: boolean };

/** What was last read from, or written to, the server. */
interface Base {
  content: string;
  version: string;
  endings: LineEndings;
  /** Where the dev server shows the page. */
  url: string;
}

const describe = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Everything the editor screen does: loads a page, holds the draft, saves it
 * with the version last read, and reports conflicts. It renders nothing.
 */
export function usePageEditor(path: string) {
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [base, setBase] = useState<Base>();
  const [draft, setDraftText] = useState("");
  const [save, setSave] = useState<Save>({ status: "idle" });
  const [attempt, setAttempt] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adopt = useCallback((page: Page) => {
    setBase({
      content: page.content,
      version: page.version,
      endings: detectLineEndings(page.content),
      url: page.url,
    });
    setDraftText(forDisplay(page.content));
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
          ? { status: "conflict", gone: error.currentVersion === null }
          : { status: "error", message: describe(error) },
      );
    }
  }, [base, dirty, saving, draft, path]);

  const setDraft = useCallback((text: string) => {
    setDraftText(text);
    setSave((current) =>
      current.status === "saved" ? { status: "idle" } : current,
    );
  }, []);

  /** Fetches the page again, replacing the draft. */
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const dismissSave = useCallback(() => setSave({ status: "idle" }), []);

  const copyDraft = useCallback(async () => {
    if (!base) return;
    try {
      await navigator.clipboard.writeText(forSaving(draft, base.endings));
    } catch {
      // No clipboard access: select the text so the user can copy it.
      textareaRef.current?.focus();
      textareaRef.current?.select();
    }
  }, [base, draft]);

  return {
    load,
    save,
    draft,
    setDraft,
    dirty,
    saving,
    endings: base?.endings,
    url: base?.url,
    ready: load.status === "ready" && base !== undefined,
    textareaRef,
    submit: useCallback(() => void submit(), [submit]),
    reload,
    dismissSave,
    copyDraft,
  };
}
