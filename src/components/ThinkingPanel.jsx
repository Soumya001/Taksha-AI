import { useEffect, useRef } from "react";

export default function ThinkingPanel({ text, color, phase, contentStream }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [text, contentStream]);

  const isVerifying = phase === "verifying";
  const isContent   = phase === "content";
  const label       = isVerifying ? "Checking answer…" : isContent ? "Writing answer…" : "Thinking…";
  const bodyText    = text || contentStream || "";

  return (
    <div style={{ borderRadius: 10, overflow: "hidden", background: "#050c17" }}>
      {/* Header with bouncing dots */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px" }}>
        <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{
              width: 5, height: 5, borderRadius: "50%", background: color,
              display: "inline-block", opacity: 0.8,
              animation: `typingWave 1.2s ease-in-out ${i * 0.18}s infinite`,
            }} />
          ))}
        </span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color, opacity: 0.8 }}>
          {label}
        </span>
      </div>

      {/* Body — shows thinking OR content stream as it arrives */}
      {bodyText && (
        <div ref={scrollRef} style={{
          maxHeight: 220, overflowY: "auto",
          padding: "6px 14px 12px",
          borderTop: `1px solid ${color}10`,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 11, lineHeight: 1.7,
          color: isContent ? "#7a9ab8" : "#3a5570",
          whiteSpace: "pre-wrap", wordBreak: "break-word",
        }}>
          {bodyText}
          <span style={{
            display: "inline-block", width: 6, height: 11, background: color,
            opacity: 0.6, marginLeft: 3, verticalAlign: "middle", borderRadius: 1,
            animation: "pulse 0.8s ease-in-out infinite",
          }} />
        </div>
      )}
    </div>
  );
}
