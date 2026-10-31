import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { createPage, deletePage, listPages, type PageSummary } from "./api.js";
import { Button } from "./components/Button/Button.js";
import { DeleteDialog } from "./components/DeleteDialog/DeleteDialog.js";
import { ErrorPanel } from "./components/ErrorPanel/ErrorPanel.js";
import { HeaderActions } from "./components/HeaderActions/HeaderActions.js";
import { LoadingMessage } from "./components/LoadingMessage/LoadingMessage.js";
import { NewPageDialog } from "./components/NewPageDialog/NewPageDialog.js";
import {
  PageListView,
  pageHref,
} from "./components/PageListView/PageListView.js";
import { useBuildEvents } from "./hooks/useBuildEvents.js";
import { starterContent } from "./page-path.js";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; pages: PageSummary[] };

type Dialog =
  | { kind: "new"; folder: string }
  | { kind: "delete"; page: PageSummary };

/** Loads the site's pages and shows them, with new and delete. */
export function PageList() {
  const navigate = useNavigate();
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [dialog, setDialog] = useState<Dialog>();

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

  // Pages added, removed or renamed outside the admin (another editor, a git
  // pull) show up when the server says the content changed. The admin's own
  // changes are told too, which only reads the same list again.
  const { changes } = useBuildEvents();
  useEffect(() => {
    if (changes === 0) return;
    const controller = new AbortController();
    listPages(controller.signal).then(
      (pages) =>
        setState((current) =>
          current.status === "ready" ? { status: "ready", pages } : current,
        ),
      () => {
        // Not worth a message: the list shown is still what it was, and the
        // next change looks again.
      },
    );
    return () => controller.abort();
  }, [changes]);

  /** Loads the list again after a change, without a loading state in between. */
  const refresh = useCallback(async () => {
    setState({ status: "ready", pages: await listPages() });
  }, []);

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

  const paths = state.pages.map((page) => page.path);
  const close = () => setDialog(undefined);

  return (
    <>
      <HeaderActions>
        <Button
          variant="primary"
          onClick={() => setDialog({ kind: "new", folder: "" })}
        >
          New page
        </Button>
      </HeaderActions>
      <PageListView
        pages={state.pages}
        onDelete={(page) => setDialog({ kind: "delete", page })}
        onNewPage={(folder) => setDialog({ kind: "new", folder })}
      />
      {dialog?.kind === "new" && (
        <NewPageDialog
          others={paths}
          folder={dialog.folder}
          onClose={close}
          onCreate={async (path) => {
            await createPage(path, starterContent(path));
            navigate(pageHref(path));
          }}
        />
      )}
      {dialog?.kind === "delete" && (
        <DeleteDialog
          path={dialog.page.path}
          onClose={close}
          onDelete={async () => {
            await deletePage(dialog.page.path, dialog.page.version);
            await refresh();
            close();
          }}
        />
      )}
    </>
  );
}
