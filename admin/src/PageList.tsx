import { useEffect, useState } from "react";
import { Link } from "react-router";
import { listPages, type PageSummary } from "./api.js";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; pages: PageSummary[] };

export const pageHref = (path: string): string =>
  `/pages/${path.split("/").map(encodeURIComponent).join("/")}`;

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

  if (state.status === "loading") return <p role="status">Loading pages…</p>;

  if (state.status === "error") {
    return (
      <div role="alert">
        <p>Could not load the pages: {state.message}</p>
        <button type="button" onClick={() => setAttempt(attempt + 1)}>
          Try again
        </button>
      </div>
    );
  }

  if (state.pages.length === 0) {
    return <p>This site has no pages yet.</p>;
  }

  return (
    <ul className="page-list">
      {state.pages.map((page) => (
        <li key={page.path}>
          <Link to={pageHref(page.path)}>
            <strong>{page.title}</strong>
            <span className="path">{page.path}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
