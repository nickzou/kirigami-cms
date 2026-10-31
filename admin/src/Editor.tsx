import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { deletePage, listPages, renamePage } from "./api.js";
import { BackLink } from "./components/BackLink/BackLink.js";
import { BuildProblem } from "./components/BuildProblem/BuildProblem.js";
import { Button } from "./components/Button/Button.js";
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
import { PreviewFrame } from "./components/PreviewFrame/PreviewFrame.js";
import { SaveControls } from "./components/SaveControls/SaveControls.js";
import { SaveFailedPanel } from "./components/SaveFailedPanel/SaveFailedPanel.js";
import { SegmentedControl } from "./components/SegmentedControl/SegmentedControl.js";
import { Toast } from "./components/Toast/Toast.js";
import { useBuildEvents } from "./hooks/useBuildEvents.js";
import { usePageEditor } from "./hooks/usePageEditor.js";
import { useSaveShortcut } from "./hooks/useSaveShortcut.js";
import { useUnsavedChangesGuard } from "./hooks/useUnsavedChangesGuard.js";

const views = [
  { value: "editor", label: "Editor" },
  { value: "preview", label: "Preview" },
];

/** The screen for editing one page. The work is in `usePageEditor`. */
export function Editor({ path }: { path: string }) {
  const build = useBuildEvents();
  const editor = usePageEditor(path, build.changes);
  useSaveShortcut(editor.submit);
  useUnsavedChangesGuard(editor.dirty);

  // One view at a time, chosen with the segmented control.
  const [view, setView] = useState<"editor" | "preview">("editor");
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

  // A click on the bare sheet (not on a control) puts the cursor in the text.
  const focusText = () => {
    const box = editor.textareaRef.current;
    box?.focus();
    box?.setSelectionRange(box.value.length, box.value.length);
  };

  return (
    <>
      {/* The sheet: the page as one long piece of paper, with no bottom edge. */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: a shortcut for the mouse; the text box is already reachable by keyboard. */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: as above. */}
      <div
        onClick={(event) => {
          if (event.target === event.currentTarget) focusText();
        }}
        className=":uno: -mx-4 min-h-[calc(100vh-5rem)] px-4 pt-4 pb-28 md:mx-auto md:max-w-[55rem] md:rounded-t-lg md:px-12 md:pt-8"
      >
        <div className=":uno: mb-4 flex items-center justify-end gap-3">
          {editor.version !== undefined && (
            <div className=":uno: flex gap-2">
              <Button
                size="small"
                disabled={editor.dirty || editor.saving}
                title={editor.dirty ? "Save your changes first." : undefined}
                onClick={() => setDeleting(true)}
              >
                Delete
              </Button>
            </div>
          )}
        </div>
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
        {build.error !== null && <BuildProblem message={build.error} />}
        <HeaderActions>
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
        {editor.outside && (
          <OutsideChangePanel
            gone={editor.outside.kind === "gone"}
            onLoadLatest={editor.reload}
            onCopy={editor.copyDraft}
            onKeepEditing={editor.dismissOutside}
          />
        )}
        {save.status === "error" && <SaveFailedPanel message={save.message} />}
        {save.status === "conflict" && (
          <ConflictPanel
            gone={save.gone}
            onLoadLatest={editor.reload}
            onCopy={editor.copyDraft}
            onKeepEditing={editor.dismissSave}
          />
        )}
        {/* Kept in the page while the preview shows, so the text box keeps its cursor and scroll. */}
        <div className={view === "editor" ? "" : ":uno: hidden"}>
          <EditorForm
            value={editor.draft}
            onChange={editor.setDraft}
            onSubmit={editor.submit}
            textareaRef={editor.textareaRef}
            notice={
              editor.endings?.mixed && (
                <LineEndingsNotice eol={editor.endings.eol} />
              )
            }
          />
        </div>
        {editor.url && view === "preview" && (
          <PreviewFrame
            url={editor.url}
            version={build.reloads}
            title={`Preview of ${path}`}
          />
        )}
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
      {editor.url && (
        // Fixed to the bottom centre at every size, over the page as it scrolls.
        <div className=":uno: fixed bottom-4 left-1/2 z-10 w-[min(22.5rem,calc(100%-2rem))] -translate-x-1/2">
          <SegmentedControl
            label="View"
            options={views}
            value={view}
            onChange={(next) =>
              setView(next === "preview" ? "preview" : "editor")
            }
          />
        </div>
      )}
    </>
  );
}
