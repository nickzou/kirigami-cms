import { useCallback, useState } from "react";

/**
 * A true/false choice that is remembered in this browser (for example whether
 * the sidebar is thinned). Storage can be blocked or empty, so it falls back
 * to `initial` and still works for as long as the page is open.
 */
export function useStoredFlag(
  key: string,
  initial: boolean,
): [boolean, (value: boolean) => void] {
  const [flag, setFlag] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored === null ? initial : stored === "true";
    } catch {
      return initial;
    }
  });
  const set = useCallback(
    (value: boolean) => {
      setFlag(value);
      try {
        localStorage.setItem(key, String(value));
      } catch {
        // not remembered, but it still changes
      }
    },
    [key],
  );
  return [flag, set];
}
