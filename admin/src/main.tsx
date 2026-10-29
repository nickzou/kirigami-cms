import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { App } from "./App.js";
import "virtual:uno.css";
import "@fontsource/amiko/400.css";
import "@fontsource/amiko/700.css";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

// A data router (rather than BrowserRouter) is what lets the editor stop
// navigation while there are unsaved changes.
const router = createBrowserRouter([{ path: "*", element: <App /> }], {
  basename: "/admin",
});

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
