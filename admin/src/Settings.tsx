import { useMemo, useState } from "react";
import { BackLink } from "./components/BackLink/BackLink.js";
import { ConflictPanel } from "./components/ConflictPanel/ConflictPanel.js";
import { ErrorPanel } from "./components/ErrorPanel/ErrorPanel.js";
import { HeaderActions } from "./components/HeaderActions/HeaderActions.js";
import { HeaderTitle } from "./components/HeaderTitle/HeaderTitle.js";
import { LoadingMessage } from "./components/LoadingMessage/LoadingMessage.js";
import { SaveControls } from "./components/SaveControls/SaveControls.js";
import { SaveFailedPanel } from "./components/SaveFailedPanel/SaveFailedPanel.js";
import { SaveStatus } from "./components/SaveStatus/SaveStatus.js";
import { SegmentedControl } from "./components/SegmentedControl/SegmentedControl.js";
import { SettingField } from "./components/SettingField/SettingField.js";
import { SettingsSection } from "./components/SettingsSection/SettingsSection.js";
import { ThemePreview } from "./components/ThemePreview/ThemePreview.js";
import { usePreviewPage } from "./hooks/usePreviewPage.js";
import { useSaveShortcut } from "./hooks/useSaveShortcut.js";
import { useSettings } from "./hooks/useSettings.js";
import { useUnsavedChangesGuard } from "./hooks/useUnsavedChangesGuard.js";
import { previewDocument } from "./preview-document.js";
import { buildTheme, siteSections } from "./settings-schema.js";

/** The id of the form, so Save in the header can submit it. */
const SETTINGS_FORM_ID = "site-settings";

const views = [
  { value: "settings", label: "Settings" },
  { value: "preview", label: "Preview" },
];

/**
 * The site's settings (the theme in site.yaml), beside a live preview of a
 * page in the theme as it is being edited. Nothing is written until Save.
 */
export function Settings() {
  const settings = useSettings(siteSections);
  useSaveShortcut(settings.submit);
  useUnsavedChangesGuard(settings.dirty);

  const page = usePreviewPage();
  const html = useMemo(
    () => previewDocument(page, buildTheme(siteSections, settings.explicit)),
    [page, settings.explicit],
  );
  // On a narrow screen one of the two shows at a time. From `lg` up, both do.
  const [view, setView] = useState<"settings" | "preview">("settings");

  if (settings.load.status === "loading") {
    return (
      <>
        <HeaderTitle before={<BackLink />}>Settings</HeaderTitle>
        <LoadingMessage>Loading the settings…</LoadingMessage>
      </>
    );
  }
  if (settings.load.status === "error") {
    return (
      <>
        <HeaderTitle before={<BackLink />}>Settings</HeaderTitle>
        <ErrorPanel
          message={`Could not load the settings: ${settings.load.message}`}
          onRetry={settings.reload}
        />
      </>
    );
  }

  // Four whole class strings, so UnoCSS can find them.
  const formClass = view === "settings" ? "" : ":uno: hidden lg:block";
  const previewClass =
    view === "preview"
      ? ":uno: block lg:sticky lg:top-4 lg:self-start"
      : ":uno: hidden lg:sticky lg:top-4 lg:block lg:self-start";

  const copyChanges = async () => {
    const text = settings.changes
      .map(
        (c) => `${c.path.join(".")}: ${c.value === null ? "(reset)" : c.value}`,
      )
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // No clipboard access: nothing to fall back to, the edits are still on screen.
    }
  };

  return (
    <>
      <div className=":uno: -mx-4 min-h-[calc(100vh-5rem)] border border-solid border-line border-b-0 bg-surface px-4 pt-4 pb-28 shadow md:mx-auto md:rounded-t-lg md:px-8 md:pt-8">
        <HeaderTitle before={<BackLink />}>Settings</HeaderTitle>
        <HeaderActions>
          <SaveControls
            dirty={settings.dirty}
            saving={settings.saving}
            blocked={settings.errors.size > 0}
            formId={SETTINGS_FORM_ID}
          />
        </HeaderActions>
        <SaveStatus saved={settings.save.status === "saved"} />
        {settings.save.status === "error" && (
          <SaveFailedPanel message={settings.save.message} />
        )}
        {settings.save.status === "conflict" && (
          <ConflictPanel
            gone={false}
            onLoadLatest={settings.reload}
            onCopy={copyChanges}
            onKeepEditing={settings.dismissSave}
          />
        )}
        <div className=":uno: lg:grid lg:grid-cols-2 lg:gap-8">
          <form
            id={SETTINGS_FORM_ID}
            className={formClass}
            onSubmit={(event) => {
              event.preventDefault();
              settings.submit();
            }}
          >
            {siteSections.map((section) => (
              <SettingsSection
                key={section.key}
                title={section.title}
                description={section.description}
              >
                {section.fields.map((field) => (
                  <SettingField
                    key={field.key}
                    field={field}
                    text={settings.textOf(field)}
                    error={settings.errors.get(field.key)}
                    isSet={settings.isSet(field)}
                    onChange={(text) => settings.setText(field, text)}
                    onReset={() => settings.reset(field)}
                  />
                ))}
              </SettingsSection>
            ))}
          </form>
          <div className={previewClass}>
            <ThemePreview html={html} />
          </div>
        </div>
      </div>
      <div className=":uno: fixed bottom-4 left-1/2 z-10 w-[min(22.5rem,calc(100%-2rem))] -translate-x-1/2 lg:hidden">
        <SegmentedControl
          label="View"
          options={views}
          value={view}
          onChange={(next) =>
            setView(next === "preview" ? "preview" : "settings")
          }
        />
      </div>
    </>
  );
}
