import { useState } from "react";
import { BackLink } from "./components/BackLink/BackLink.js";
import { BuildProblem } from "./components/BuildProblem/BuildProblem.js";
import { ConflictPanel } from "./components/ConflictPanel/ConflictPanel.js";
import { EditorForm } from "./components/EditorForm/EditorForm.js";
import { ErrorPanel } from "./components/ErrorPanel/ErrorPanel.js";
import { LineEndingsNotice } from "./components/LineEndingsNotice/LineEndingsNotice.js";
import { LoadingMessage } from "./components/LoadingMessage/LoadingMessage.js";
import { PreviewFrame } from "./components/PreviewFrame/PreviewFrame.js";
import { PreviewToggle } from "./components/PreviewToggle/PreviewToggle.js";
import { SaveFailedPanel } from "./components/SaveFailedPanel/SaveFailedPanel.js";
import { SaveStatus } from "./components/SaveStatus/SaveStatus.js";
import { useBuildEvents } from "./hooks/useBuildEvents.js";
import { usePageEditor } from "./hooks/usePageEditor.js";
import { useSaveShortcut } from "./hooks/useSaveShortcut.js";
import { useUnsavedChangesGuard } from "./hooks/useUnsavedChangesGuard.js";

/** The screen for editing one page. The work is in `usePageEditor`. */
export function Editor({ path }: { path: string }) {
  const editor = usePageEditor(path);
  useSaveShortcut(editor.submit);
  useUnsavedChangesGuard(editor.dirty);

  const build = useBuildEvents();
  const [showPreview, setShowPreview] = useState(true);

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
        {/* The preview needs room, so it is for tablet widths and up. */}
        {editor.url && (
          <span className=":uno: hidden md:block">
            <PreviewToggle shown={showPreview} onChange={setShowPreview} />
          </span>
        )}
      </div>
      {build.error !== null && <BuildProblem message={build.error} />}
      <div
        className={
          showPreview && editor.url
            ? ":uno: grid gap-4 md:grid-cols-2 md:items-start"
            : ""
        }
      >
        <div>
          <EditorForm
            value={editor.draft}
            onChange={editor.setDraft}
            onSubmit={editor.submit}
            dirty={editor.dirty}
            saving={editor.saving}
            textareaRef={editor.textareaRef}
            notice={
              editor.endings?.mixed && (
                <LineEndingsNotice eol={editor.endings.eol} />
              )
            }
          />
          <SaveStatus saved={save.status === "saved"} />
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
        {showPreview && editor.url && (
          <div className=":uno: hidden md:block">
            <PreviewFrame
              url={editor.url}
              version={build.reloads}
              title={`Preview of ${path}`}
            />
          </div>
        )}
      </div>
    </>
  );
}
