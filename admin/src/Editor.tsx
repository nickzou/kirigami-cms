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
import { PreviewToggle } from "./components/PreviewToggle/PreviewToggle.js";
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

// Whole class strings, so UnoCSS can find them. On narrow screens the preview
// shows only when chosen; from `md` up it follows the Preview toggle.
const previewPane = {
  editor: { on: ":uno: hidden md:block", off: ":uno: hidden" },
  preview: { on: ":uno: block", off: ":uno: block md:hidden" },
} as const;

/** The screen for editing one page. The work is in `usePageEditor`. */
export function Editor({ path }: { path: string }) {
  const editor = usePageEditor(path);
  useSaveShortcut(editor.submit);
  useUnsavedChangesGuard(editor.dirty);

  const build = useBuildEvents();
  // Wide screens show both side by side (the toggle hides the preview). Narrow
  // screens show one at a time, chosen with the segmented control.
  const [showPreview, setShowPreview] = useState(true);
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
        <div className={view === "editor" ? "" : ":uno: hidden md:block"}>
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
        {editor.url && (showPreview || view === "preview") && (
          <div className={previewPane[view][showPreview ? "on" : "off"]}>
            <PreviewFrame
              url={editor.url}
              version={build.reloads}
              title={`Preview of ${path}`}
            />
          </div>
        )}
      </div>
      {editor.url && (
        <>
          {/* Room for the control below, so it never covers the text. */}
          <div className=":uno: h-16 md:hidden" aria-hidden="true" />
          <div className=":uno: fixed inset-x-4 bottom-4 z-10 md:hidden">
            <SegmentedControl
              label="View"
              options={views}
              value={view}
              onChange={(next) =>
                setView(next === "preview" ? "preview" : "editor")
              }
            />
          </div>
        </>
      )}
    </>
  );
}
