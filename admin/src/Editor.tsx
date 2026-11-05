import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { deletePage, listPages, renamePage } from "./api.js";
import { FullBleed } from "./components/AppShell/full-bleed.js";
import { BackLink } from "./components/BackLink/BackLink.js";
import { BuildProblem } from "./components/BuildProblem/BuildProblem.js";
import { ConflictPanel } from "./components/ConflictPanel/ConflictPanel.js";
import { DeleteDialog } from "./components/DeleteDialog/DeleteDialog.js";
import {
  EDITOR_FORM_ID,
  EditorForm,
} from "./components/EditorForm/EditorForm.js";
import { ErrorPanel } from "./components/ErrorPanel/ErrorPanel.js";
import { HeaderActions } from "./components/HeaderActions/HeaderActions.js";
import { HeaderTitle } from "./components/HeaderTitle/HeaderTitle.js";
import { LineEndingsNotice } from "./components/LineEndingsNotice/LineEndingsNotice.js";
import { LoadingMessage } from "./components/LoadingMessage/LoadingMessage.js";
import { OutsideChangePanel } from "./components/OutsideChangePanel/OutsideChangePanel.js";
import { pageHref } from "./components/PageListView/PageListView.js";
import { PagePathField } from "./components/PagePathField/PagePathField.js";
import { RowMenu } from "./components/RowMenu/RowMenu.js";
import { SaveControls } from "./components/SaveControls/SaveControls.js";
import { SaveFailedPanel } from "./components/SaveFailedPanel/SaveFailedPanel.js";
import { Toast } from "./components/Toast/Toast.js";
import { useBuildEvents } from "./hooks/useBuildEvents.js";
import { usePageEditor } from "./hooks/usePageEditor.js";
import { useSaveShortcut } from "./hooks/useSaveShortcut.js";
import { useSiteTheme } from "./hooks/useSiteTheme.js";
import { useUnsavedChangesGuard } from "./hooks/useUnsavedChangesGuard.js";

/** The screen for editing one page. The work is in `usePageEditor`. */
export function Editor({ path }: { path: string }) {
  const build = useBuildEvents();
  const editor = usePageEditor(path, build.changes);
  // The text is shown in the site's own theme, and follows edits to it.
  const theme = useSiteTheme(build.reloads);
  useSaveShortcut(editor.submit);
  useUnsavedChangesGuard(editor.dirty);

  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  // The other pages' paths, fetched when the title field is first focused, so
  // it can say right away if a new path is taken. The server still has the last
  // word.
  const [editingPath, setEditingPath] = useState(false);
  const [others, setOthers] = useState<string[]>();
  useEffect(() => {
    if (!editingPath) return;
    const controller = new AbortController();
    listPages(controller.signal).then(
      (pages) =>
        setOthers(pages.map((page) => page.path).filter((p) => p !== path)),
      () => {},
    );
    return () => controller.abort();
  }, [editingPath, path]);

  const { load, save } = editor;

  if (load.status === "loading") {
    return (
      <>
        <HeaderTitle before={<BackLink />}>{path}</HeaderTitle>
        <LoadingMessage />
      </>
    );
  }

  if (load.status === "error") {
    return (
      <>
        <HeaderTitle before={<BackLink />}>{path}</HeaderTitle>
        <ErrorPanel
          message={
            load.missing
              ? "This page does not exist."
              : `Could not load the page: ${load.message}`
          }
          onRetry={load.missing ? undefined : editor.reload}
        />
      </>
    );
  }

  return (
    <>
      {/* The page takes the whole area under the header. */}
      <FullBleed />
      <div>
        <PagePathField
          path={path}
          before={<BackLink />}
          others={others}
          lockedReason={
            editor.dirty || editor.saving
              ? "Save your changes first."
              : editor.version === undefined
                ? "This page cannot be renamed."
                : undefined
          }
          onStartEditing={() => setEditingPath(true)}
          onRename={async (to) => {
            const moved = await renamePage(path, to, editor.version as string);
            navigate(pageHref(moved.path), { replace: true });
          }}
        />
        {/* Notices, above the page; nothing is drawn when there are none. */}
        <div className=":uno: grid gap-4 px-4 pt-4 empty:hidden">
          {build.error !== null && <BuildProblem message={build.error} />}
          {editor.outside && (
            <OutsideChangePanel
              gone={editor.outside.kind === "gone"}
              onLoadLatest={editor.reload}
              onCopy={editor.copyDraft}
              onKeepEditing={editor.dismissOutside}
            />
          )}
          {save.status === "error" && (
            <SaveFailedPanel message={save.message} />
          )}
          {save.status === "conflict" && (
            <ConflictPanel
              gone={save.gone}
              onLoadLatest={editor.reload}
              onCopy={editor.copyDraft}
              onKeepEditing={editor.dismissSave}
            />
          )}
        </div>
        <HeaderActions>
          {editor.version !== undefined && (
            <RowMenu
              label="Page actions"
              items={[
                ...(editor.url
                  ? [{ label: "Open page", href: editor.url }]
                  : []),
                {
                  label: "Delete",
                  danger: true,
                  disabled: editor.dirty || editor.saving,
                  title: editor.dirty ? "Save your changes first." : undefined,
                  onSelect: () => setDeleting(true),
                },
              ]}
            />
          )}
          <SaveControls
            dirty={editor.dirty}
            saving={editor.saving}
            formId={EDITOR_FORM_ID}
          />
        </HeaderActions>
        <Toast
          message={
            save.status === "saved"
              ? "Saved."
              : editor.updatedOutside
                ? "Updated: this page changed outside the admin."
                : null
          }
        />
        <div>
          <EditorForm
            value={editor.draft}
            onChange={editor.setDraft}
            onSubmit={editor.submit}
            editorRef={editor.editorRef}
            theme={theme}
            notice={
              editor.endings?.mixed && (
                <LineEndingsNotice eol={editor.endings.eol} />
              )
            }
          />
        </div>
      </div>
      {deleting && editor.version !== undefined && (
        <DeleteDialog
          path={path}
          onClose={() => setDeleting(false)}
          onDelete={async () => {
            await deletePage(path, editor.version as string);
            navigate("/", { replace: true });
          }}
        />
      )}
    </>
  );
}
