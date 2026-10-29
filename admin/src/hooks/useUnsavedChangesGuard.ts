import { useEffect } from "react";
import { useBlocker } from "react-router";

const LEAVE_MESSAGE = "You have unsaved changes. Leave without saving?";

/**
 * While `dirty`, asks before leaving through the app (needs a data router)
 * and asks the browser to confirm closing or reloading the tab.
 */
export function useUnsavedChangesGuard(dirty: boolean): void {
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
}
