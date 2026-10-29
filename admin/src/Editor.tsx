import { useState } from "react";
import { BackLink } from "./components/BackLink/BackLink.js";
import { BuildProblem } from "./components/BuildProblem/BuildProblem.js";
import { ConflictPanel } from "./components/ConflictPanel/ConflictPanel.js";
import {
  EDITOR_FORM_ID,
  EditorForm,
} from "./components/EditorForm/EditorForm.js";
import { ErrorPanel } from "./components/ErrorPanel/ErrorPanel.js";
import { HeaderActions } from "./components/HeaderActions/HeaderActions.js";
import { LineEndingsNotice } from "./components/LineEndingsNotice/LineEndingsNotice.js";
import { LoadingMessage } from "./components/LoadingMessage/LoadingMessage.js";
import { PreviewFrame } from "./components/PreviewFrame/PreviewFrame.js";
import { SaveControls } from "./components/SaveControls/SaveControls.js";
import { SaveFailedPanel } from "./components/SaveFailedPanel/SaveFailedPanel.js";
import { SaveStatus } from "./components/SaveStatus/SaveStatus.js";
import { SegmentedControl } from "./components/SegmentedControl/SegmentedControl.js";
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
  const editor = usePageEditor(path);
  useSaveShortcut(editor.submit);
  useUnsavedChangesGuard(editor.dirty);

  const build = useBuildEvents();
  // One view at a time, chosen with the segmented control.
  const [view, setView] = useState<"editor" | "preview">("editor");

  const { load, save } = editor;

  if (load.status === "loading") {
    return (
      <>
        <h1>{path}</h1>
        <LoadingMessage />
      </>
    );
  }

  if (load.status === "error") {
    return (
      <>
        <h1>{path}</h1>
        <ErrorPanel
          message={
            load.missing
              ? "This page does not exist."
              : `Could not load the page: ${load.message}`
          }
          onRetry={load.missing ? undefined : editor.reload}
        />
        <BackLink />
      </>
    );
  }

  return (
    <>
      <h1>{path}</h1>
      <div className=":uno: mb-4 flex items-center justify-between gap-3 [&>p]:m-0">
        <BackLink />
        {editor.url && (
          // Pinned to the bottom on phones, in the toolbar from `md` up.
          <div className=":uno: fixed inset-x-4 bottom-4 z-10 md:static md:w-72">
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
      </div>
      {build.error !== null && <BuildProblem message={build.error} />}
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
        <HeaderActions>
          <SaveControls
            dirty={editor.dirty}
            saving={editor.saving}
            formId={EDITOR_FORM_ID}
          />
        </HeaderActions>
        <SaveStatus saved={save.status === "saved"} />
        {save.status === "error" && <SaveFailedPanel message={save.message} />}
        {save.status === "conflict" && (
          <ConflictPanel
            gone={save.gone}
            onLoadLatest={editor.reload}
            onCopy={editor.copyDraft}
            onKeepEditing={editor.dismissSave}
          />
        )}
      </div>
      {editor.url && view === "preview" && (
        <PreviewFrame
          url={editor.url}
          version={build.reloads}
          title={`Preview of ${path}`}
        />
      )}
      {editor.url && (
        // Room for the pinned control on phones, so it never covers the text.
        <div className=":uno: h-16 md:hidden" aria-hidden="true" />
      )}
    </>
  );
}
