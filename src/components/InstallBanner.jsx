import { useState, useEffect } from "react";

export default function InstallBanner({ ac }) {
  const [prompt,    setPrompt]    = useState(null);  // deferred install event
  const [show,      setShow]      = useState(false);
  const [isIOS,     setIsIOS]     = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Already installed as PWA — don't show
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    // iOS detection — no beforeinstallprompt, need manual instructions
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    if (ios) {
      // Show iOS instructions after 3s if not dismissed before
      const dismissed = sessionStorage.getItem("taksha_install_dismissed");
      if (!dismissed) setTimeout(() => setShow(true), 3000);
      return;
    }

    // Android / Chrome — capture the deferred prompt
    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
      const dismissed = sessionStorage.getItem("taksha_install_dismissed");
      if (!dismissed) setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Listen for successful install
    window.addEventListener("appinstalled", () => {
      setShow(false);
      setInstalled(true);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setShow(false);
  };

  const dismiss = () => {
    setShow(false);
    sessionStorage.setItem("taksha_install_dismissed", "1");
  };

  if (!show || installed) return null;

  return (
    <div style={{
      position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
      zIndex: 999, width: "calc(100% - 32px)", maxWidth: 440,
      background: "#080f1e",
      border: `1px solid ${ac}30`,
      borderRadius: 18,
      padding: "16px 18px",
      boxShadow: `0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px ${ac}10`,
      display: "flex", alignItems: "center", gap: 14,
      animation: "slideUp 0.3s cubic-bezier(0.22,1,0.36,1) both",
    }}>
      {/* Icon */}
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: `${ac}15`, border: `1px solid ${ac}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22,
      }}>🧠</div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 13, color: "#f1f5f9", marginBottom: 3 }}>
          Install Taksha AI
        </div>
        {isIOS ? (
          <div style={{ fontSize: 11, color: "#4a6a88", fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1.6 }}>
            Tap <span style={{ color: ac }}>Share</span> → <span style={{ color: ac }}>Add to Home Screen</span>
          </div>
        ) : (
          <div style={{ fontSize: 11, color: "#4a6a88", fontFamily: "'IBM Plex Mono', monospace" }}>
            Add to home screen · works offline
          </div>
        )}
      </div>

      {/* CTA */}
      {!isIOS && (
        <button onClick={handleInstall}
          style={{
            background: `linear-gradient(135deg, ${ac}, ${ac}bb)`,
            border: "none", borderRadius: 10, padding: "9px 16px",
            color: "#040b14", fontSize: 12, fontFamily: "'IBM Plex Mono', monospace",
            fontWeight: 700, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap",
          }}>
          Install
        </button>
      )}

      {/* Dismiss */}
      <button onClick={dismiss}
        style={{
          background: "none", border: "none", color: "#2d4a66",
          fontSize: 18, cursor: "pointer", padding: "0 2px", lineHeight: 1, flexShrink: 0,
        }}
        onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
        onMouseLeave={e => e.currentTarget.style.color = "#2d4a66"}>
        ×
      </button>
    </div>
  );
}
