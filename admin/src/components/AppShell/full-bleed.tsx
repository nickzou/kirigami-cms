import { createContext, useContext, useEffect } from "react";

/** Lets a screen ask the shell to give it the whole of the area under the header. */
export const FullBleedContext = createContext<(on: boolean) => void>(() => {});

/**
 * Put this in a screen that fills the whole area beside the sidebar and under
 * the header, with no margin or width limit around it. The shell goes back to
 * its usual page width when the screen goes.
 */
export function FullBleed() {
  const setBleed = useContext(FullBleedContext);
  useEffect(() => {
    setBleed(true);
    return () => setBleed(false);
  }, [setBleed]);
  return null;
}
