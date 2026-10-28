import { Link, Route, Routes, useParams } from "react-router";
import { PageList } from "./PageList.js";

function PagesScreen() {
  return (
    <>
      <h1>Pages</h1>
      <PageList />
    </>
  );
}

// The editor arrives in its own ticket; this keeps list links working.
function EditorPlaceholder() {
  const path = useParams()["*"] ?? "";
  return (
    <>
      <h1>{path}</h1>
      <p>The editor is not built yet.</p>
      <p>
        <Link to="/">Back to all pages</Link>
      </p>
    </>
  );
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
          <Route path="/pages/*" element={<EditorPlaceholder />} />
          <Route path="*" element={<p>There is nothing at this address.</p>} />
        </Routes>
      </main>
    </>
  );
}
