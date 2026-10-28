import { useEffect, useState } from "react";
import { listPages, type PageSummary } from "./api.js";
import { ErrorPanel } from "./components/ErrorPanel.js";
import { LoadingMessage } from "./components/LoadingMessage.js";
import { PageListView } from "./components/PageListView.js";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; pages: PageSummary[] };

/** Loads the site's pages and shows them. */
export function PageList() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` reruns the load when the user retries.
  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    listPages(controller.signal).then(
      (pages) => setState({ status: "ready", pages }),
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      },
    );
    return () => controller.abort();
  }, [attempt]);

  if (state.status === "loading") {
    return <LoadingMessage>Loading pages…</LoadingMessage>;
  }
  if (state.status === "error") {
    return (
      <ErrorPanel
        message={`Could not load the pages: ${state.message}`}
        onRetry={() => setAttempt(attempt + 1)}
      />
    );
  }
  return <PageListView pages={state.pages} />;
}
