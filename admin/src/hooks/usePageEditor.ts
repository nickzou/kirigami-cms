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

/** A page changed outside the admin while it was open. */
export type OutsideChange =
  /** The text on disk is different from what was loaded. */
  | { kind: "changed" }
  /** The page is no longer there (deleted, or moved to another path). */
  | { kind: "gone" };

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
 *
 * `changes` goes up when the content changes on disk. Then the page is read
 * again: if it is different and there is nothing unsaved, it is loaded quietly
 * (`updatedOutside` is set); if there is unsaved text it is kept, and
 * `outside` says what happened, so the person can choose. Either way the text
 * is never lost.
 */
export function usePageEditor(path: string, changes = 0) {
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [base, setBase] = useState<Base>();
  const [draft, setDraftText] = useState("");
  const [save, setSave] = useState<Save>({ status: "idle" });
  const [attempt, setAttempt] = useState(0);
  const [outside, setOutside] = useState<OutsideChange>();
  const [updatedOutside, setUpdatedOutside] = useState(false);
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
    setOutside(undefined);
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

  // What the check below needs to know when an event arrives, without running
  // it again each time they change.
  const latest = useRef({ base, dirty, saving });
  latest.current = { base, dirty, saving };

  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when `changes` goes up; the rest is read from `latest`.
  useEffect(() => {
    if (changes === 0) return;
    const { base: known, saving: busy } = latest.current;
    // Our own save is told as a change too: while it is in flight, and once it
    // is done (the versions then agree), there is nothing to notice.
    if (!known || busy) return;
    const controller = new AbortController();
    getPage(path, controller.signal).then(
      (page) => {
        const { base: now, dirty: unsaved } = latest.current;
        if (!now || page.version === now.version) return;
        if (unsaved) setOutside({ kind: "changed" });
        else {
          adopt(page);
          setUpdatedOutside(true);
        }
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiRequestError && error.status === 404) {
          setOutside({ kind: "gone" });
        }
        // Any other trouble (the server is restarting): the next change will look again.
      },
    );
    return () => controller.abort();
  }, [changes, path, adopt]);

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
    setUpdatedOutside(false);
    setSave((current) =>
      current.status === "saved" ? { status: "idle" } : current,
    );
  }, []);

  /** Fetches the page again, replacing the draft. */
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const dismissSave = useCallback(() => setSave({ status: "idle" }), []);
  const dismissOutside = useCallback(() => setOutside(undefined), []);

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
    /** The version last read or saved, which rename and delete must send back. */
    version: base?.version,
    ready: load.status === "ready" && base !== undefined,
    textareaRef,
    submit: useCallback(() => void submit(), [submit]),
    reload,
    dismissSave,
    /** Set when the page changed outside the admin and there is unsaved text (or the page is gone). */
    outside,
    dismissOutside,
    /** True after a page with nothing unsaved was quietly loaded again for an outside edit, until the next keystroke. */
    updatedOutside,
    copyDraft,
  };
}
