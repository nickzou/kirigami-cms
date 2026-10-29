import { Route, Routes, useParams } from "react-router";
import { AppShell } from "./components/AppShell/AppShell.js";
import { Editor } from "./Editor.js";
import { PageList } from "./PageList.js";

function PagesScreen() {
  return (
    <>
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
        <Route path="*" element={<p>There is nothing at this address.</p>} />
      </Routes>
    </AppShell>
  );
}
