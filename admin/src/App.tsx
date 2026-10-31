import { Route, Routes, useParams } from "react-router";
import { AppShell } from "./components/AppShell/AppShell.js";
import { HeaderActions } from "./components/HeaderActions/HeaderActions.js";
import { SettingsLink } from "./components/SettingsLink/SettingsLink.js";
import { Editor } from "./Editor.js";
import { PageList } from "./PageList.js";
import { Settings } from "./Settings.js";

function PagesScreen() {
  return (
    <>
      <HeaderActions>
        <SettingsLink />
      </HeaderActions>
      <h1>Pages</h1>
      <PageList />
    </>
  );
}

function EditorScreen() {
  const path = useParams()["*"] ?? "";
  // `key` gives each page its own editor state when moving between pages.
  return <Editor key={path} path={path} />;
}

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<PagesScreen />} />
        <Route path="/pages/*" element={<EditorScreen />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<p>There is nothing at this address.</p>} />
      </Routes>
    </AppShell>
  );
}
