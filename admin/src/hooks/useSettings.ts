import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiRequestError,
  ConflictError,
  getSiteConfig,
  type SiteConfigChange,
  saveSiteConfig,
} from "../api.js";
import {
  explicitValues,
  fieldProblem,
  parseFieldValue,
  type SettingField,
  type SettingsSection,
} from "../settings-schema.js";

export type SettingsLoad =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready" };

export type SettingsSave =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved" }
  | { status: "error"; message: string }
  | { status: "conflict" };

/** What the file says now: its version, and the settings it sets. */
interface Base {
  version: string | null;
  values: Map<string, string | number>;
}

const describe = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Everything the settings screen does: loads the site config, holds what the
 * person has typed, checks it as they type, works out what would change in the
 * file, and saves that under the version last read. It renders nothing.
 *
 * `edits` holds the text typed into a field, whatever it is; a field not in it
 * shows what the file has. A field left empty means the default applies.
 */
export function useSettings(sections: readonly SettingsSection[]) {
  const fields = useMemo(() => sections.flatMap((s) => s.fields), [sections]);
  const [load, setLoad] = useState<SettingsLoad>({ status: "loading" });
  const [base, setBase] = useState<Base>();
  const [edits, setEdits] = useState<Readonly<Record<string, string>>>({});
  const [save, setSave] = useState<SettingsSave>({ status: "idle" });
  const [attempt, setAttempt] = useState(0);

  const adopt = useCallback(
    (config: { version: string | null; values: unknown }) => {
      setBase({
        version: config.version,
        values: explicitValues(sections, config.values),
      });
      setEdits({});
      setLoad({ status: "ready" });
    },
    [sections],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` reruns the load when the user retries.
  useEffect(() => {
    const controller = new AbortController();
    setLoad({ status: "loading" });
    getSiteConfig(controller.signal).then(
      (config) => {
        if (config.error !== null) {
          setLoad({ status: "error", message: config.error });
        } else {
          adopt(config);
          setSave({ status: "idle" });
        }
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setLoad({ status: "error", message: describe(error) });
      },
    );
    return () => controller.abort();
  }, [attempt, adopt]);

  /** The text a field shows: what was typed, or what the file has. */
  const textOf = useCallback(
    (field: SettingField): string =>
      edits[field.key] ?? String(base?.values.get(field.key) ?? ""),
    [edits, base],
  );

  const { explicit, errors } = useMemo(() => {
    const explicit = new Map<string, string | number>();
    const errors = new Map<string, string>();
    for (const field of fields) {
      const text = textOf(field);
      if (text.trim() === "") continue; // empty: the default applies
      const problem = fieldProblem(field, text);
      if (problem) errors.set(field.key, problem);
      else explicit.set(field.key, parseFieldValue(field, text));
    }
    return { explicit, errors };
  }, [fields, textOf]);

  /** What would change in the file. A field with a problem changes nothing. */
  const changes = useMemo(() => {
    const result: SiteConfigChange[] = [];
    for (const field of fields) {
      const was = base?.values.get(field.key);
      const text = textOf(field);
      if (errors.has(field.key)) continue;
      if (text.trim() === "") {
        if (was !== undefined) result.push({ path: field.path, value: null });
      } else if (explicit.get(field.key) !== was) {
        result.push({
          path: field.path,
          value: explicit.get(field.key) as string | number,
        });
      }
    }
    return result;
  }, [fields, base, textOf, errors, explicit]);

  const dirty = changes.length > 0 || errors.size > 0;
  const saving = save.status === "saving";

  const setText = useCallback((field: SettingField, text: string) => {
    setEdits((current) => ({ ...current, [field.key]: text }));
    setSave((current) =>
      current.status === "idle" ? current : { status: "idle" },
    );
  }, []);

  const reset = useCallback(
    (field: SettingField) => setText(field, ""),
    [setText],
  );

  const submit = useCallback(async () => {
    if (!base || changes.length === 0 || errors.size > 0 || saving) return;
    setSave({ status: "saving" });
    try {
      const saved = await saveSiteConfig(changes, base.version);
      adopt(saved);
      setSave({ status: "saved" });
    } catch (error) {
      setSave(
        error instanceof ConflictError
          ? { status: "conflict" }
          : {
              status: "error",
              message:
                error instanceof ApiRequestError
                  ? error.message
                  : "Could not reach the server. Try again.",
            },
      );
    }
  }, [base, changes, errors, saving, adopt]);

  return {
    load,
    save,
    textOf,
    setText,
    reset,
    /** Whether the file sets this field (so there is something to reset). */
    isSet: (field: SettingField) => textOf(field).trim() !== "",
    /** The valid settings as typed, by key: what the preview uses. */
    explicit,
    errors,
    changes,
    dirty,
    saving,
    submit: useCallback(() => void submit(), [submit]),
    reload: useCallback(() => setAttempt((n) => n + 1), []),
    dismissSave: useCallback(() => setSave({ status: "idle" }), []),
  };
}
