import { StrictMode, useState, useEffect } from "react";
import "./global.css";
import { createRoot } from "react-dom/client";
import MathTutor from "./MathTutor";
import Tokenomics from "./Tokenomics";

function App() {
  const [page, setPage] = useState(window.location.hash);

  useEffect(() => {
    const onHash = () => setPage(window.location.hash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  if (page === "#/tokenomics") return <Tokenomics />;
  return <MathTutor />;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Register service worker for PWA install + offline support
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
