import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// A lazy-loaded chunk (like the dashboard charts) can fail to load if the
// browser still has an older build's file references cached — e.g. right
// after a new deploy replaces the old hashed filenames. Vite fires this
// event when that happens; reload once to pick up the current build
// automatically instead of leaving the page blank until a manual refresh.
window.addEventListener("vite:preloadError", () => {
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);