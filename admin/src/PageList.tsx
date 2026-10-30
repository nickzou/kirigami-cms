import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  createPage,
  deletePage,
  listPages,
  type PageSummary,
  renamePage,
} from "./api.js";
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
import { RenameDialog } from "./components/RenameDialog/RenameDialog.js";
import { starterContent } from "./page-path.js";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; pages: PageSummary[] };

type Dialog =
  | { kind: "new" }
  | { kind: "rename"; page: PageSummary }
  | { kind: "delete"; page: PageSummary };

/** Loads the site's pages and shows them, with new, rename and delete. */
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
        <Button variant="primary" onClick={() => setDialog({ kind: "new" })}>
          New page
        </Button>
      </HeaderActions>
      <PageListView
        pages={state.pages}
        onRename={(page) => setDialog({ kind: "rename", page })}
        onDelete={(page) => setDialog({ kind: "delete", page })}
      />
      {dialog?.kind === "new" && (
        <NewPageDialog
          others={paths}
          onClose={close}
          onCreate={async (path) => {
            await createPage(path, starterContent(path));
            navigate(pageHref(path));
          }}
        />
      )}
      {dialog?.kind === "rename" && (
        <RenameDialog
          path={dialog.page.path}
          others={paths.filter((path) => path !== dialog.page.path)}
          onClose={close}
          onRename={async (to) => {
            await renamePage(dialog.page.path, to, dialog.page.version);
            await refresh();
            close();
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
