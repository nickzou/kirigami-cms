import { useCallback, useState } from "react";

const read = (key: string): ReadonlySet<string> => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return new Set(
      Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string")
        : [],
    );
  } catch {
    return new Set();
  }
};

/**
 * A set of strings (for example the folders a person has closed) remembered
 * in this browser. Storage can be blocked, empty or damaged, so it starts
 * empty then, and still works for as long as the page is open.
 */
export function useStoredSet(
  key: string,
): [ReadonlySet<string>, (item: string) => void] {
  const [set, setSet] = useState(() => read(key));
  /** Adds the item if it is not in the set, and removes it if it is. */
  const toggle = useCallback(
    (item: string) =>
      setSet((current) => {
        const next = new Set(current);
        if (!next.delete(item)) next.add(item);
        try {
          localStorage.setItem(key, JSON.stringify([...next]));
        } catch {
          // not remembered, but it still changes
        }
        return next;
      }),
    [key],
  );
  return [set, toggle];
}
