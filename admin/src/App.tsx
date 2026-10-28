import { Link, Route, Routes, useParams } from "react-router";
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
    <>
      <header className="app-header">
        <Link to="/" className="brand">
          Kirigami
        </Link>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<PagesScreen />} />
          <Route path="/pages/*" element={<EditorScreen />} />
          <Route path="*" element={<p>There is nothing at this address.</p>} />
        </Routes>
      </main>
    </>
  );
}
