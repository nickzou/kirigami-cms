import { BackLink } from "./components/BackLink/BackLink.js";
import { ConflictPanel } from "./components/ConflictPanel/ConflictPanel.js";
import { EditorForm } from "./components/EditorForm/EditorForm.js";
import { ErrorPanel } from "./components/ErrorPanel/ErrorPanel.js";
import { LineEndingsNotice } from "./components/LineEndingsNotice/LineEndingsNotice.js";
import { LoadingMessage } from "./components/LoadingMessage/LoadingMessage.js";
import { SaveFailedPanel } from "./components/SaveFailedPanel/SaveFailedPanel.js";
import { SaveStatus } from "./components/SaveStatus/SaveStatus.js";
import { usePageEditor } from "./hooks/usePageEditor.js";
import { useSaveShortcut } from "./hooks/useSaveShortcut.js";
import { useUnsavedChangesGuard } from "./hooks/useUnsavedChangesGuard.js";

/** The screen for editing one page. The work is in `usePageEditor`. */
export function Editor({ path }: { path: string }) {
  const editor = usePageEditor(path);
  useSaveShortcut(editor.submit);
  useUnsavedChangesGuard(editor.dirty);

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
      <BackLink />
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
      {save.status === "error" && <SaveFailedPanel message={save.message} />}
      {save.status === "conflict" && (
        <ConflictPanel
          gone={save.gone}
          onLoadLatest={editor.reload}
          onCopy={editor.copyDraft}
          onKeepEditing={editor.dismissSave}
        />
      )}
    </>
  );
}
