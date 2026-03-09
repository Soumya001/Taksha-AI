import { memo, useState } from "react";
import MathContent from "./MathContent";
import AnimatedLogo from "./AnimatedLogo";

const Message = memo(function Message({ msg, accentColor, onCopy, copied, idx, onViewCanvas, onRegenerate, onFeedback, t }) {
  const isUser = msg.role === "user";
  const [showThinking, setShowThinking] = useState(false);
  const [rated, setRated] = useState(null); // null | 'good' | 'bad'

  const handleFeedback = (rating) => {
    if (rated) return;
    setRated(rating);
    onFeedback?.(rating);
  };

  return (
    <div className="will-animate" style={{ display: "flex", flexDirection: isUser ? "row-reverse" : "row", gap: 10, marginBottom: 24, alignItems: "flex-start", animation: `msgIn 0.45s cubic-bezier(0.34,1.56,0.64,1) ${Math.min(idx * 0.04, 0.2)}s both` }}>
      {isUser ? (
        <div style={{ width: 33, height: 33, borderRadius: "50%", flexShrink: 0, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* Pulsing glow ring */}
          <div style={{ position: "absolute", inset: -2, borderRadius: "50%", border: "1.5px solid #3a5a80", animation: "ua-ring 2.5s ease-in-out infinite" }}/>
          {/* Avatar circle */}
          <div style={{ width: 33, height: 33, borderRadius: "50%", background: "linear-gradient(135deg, #0f1e33 0%, #1a2d45 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, border: "1.5px solid #1e3a5f" }}>
            👤
          </div>
          <style>{`
            @keyframes ua-ring {
              0%,100% { transform: scale(1);   opacity: 0.5; }
              50%      { transform: scale(1.18); opacity: 0.15; }
            }
          `}</style>
        </div>
      ) : (
        <AnimatedLogo color={accentColor} size={33} />
      )}
      <div className="msg-bubble-wrap" style={{ maxWidth: "80%", minWidth: 0, position: "relative" }}>

        {/* Reasoning block */}
        {!isUser && msg.thinking && (
          <div style={{ marginBottom: 8 }}>
            <button onClick={() => setShowThinking(v => !v)}
              style={{ background: "transparent", border: `1px solid ${accentColor}30`, borderRadius: 8, padding: "4px 12px", color: accentColor, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, opacity: 0.75, transition: "opacity 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.opacity = 1}
              onMouseLeave={e => e.currentTarget.style.opacity = 0.75}>
              <span style={{ fontSize: 12 }}>{showThinking ? "▾" : "▸"}</span>
              {showThinking ? (t.hideReasoning || "Hide reasoning") : (t.showReasoning || "Show reasoning")}
            </button>
            {showThinking && (
              <div style={{ marginTop: 6, background: "#050b18", border: `1px solid ${accentColor}18`, borderRadius: 10, padding: "12px 16px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#3a5a7a", lineHeight: 1.7, whiteSpace: "pre-wrap", maxHeight: 320, overflowY: "auto" }}>
                {msg.thinking}
              </div>
            )}
          </div>
        )}

        <div style={{ background: isUser ? "#0f1b2d" : "#080f1e", border: `1px solid ${isUser ? "#1e3a5f" : accentColor + "25"}`, borderRadius: isUser ? "20px 4px 20px 20px" : "4px 20px 20px 20px", padding: "14px 18px", backdropFilter: "blur(8px)", boxShadow: isUser ? "0 4px 20px rgba(0,0,0,0.3)" : `0 4px 24px ${accentColor}0a, 0 0 0 1px ${accentColor}12`, overflow: "hidden" }}>
          {msg.image && <img src={msg.image} alt="homework" style={{ maxWidth: "100%", borderRadius: 10, marginBottom: 12, border: "1px solid #1e3a5f", display: "block" }} />}
          <MathContent text={msg.content} color={isUser ? "#7a96b8" : "#dde6f0"} />
        </div>

        {/* Action bar */}
        {!isUser && (
          <div className="msg-action-bar" style={{ position: "absolute", bottom: -11, right: 12, display: "flex", gap: 5, alignItems: "center" }}>

            {/* Self-corrected badge */}
            {msg.selfCorrected && (
              <span title="Answer was self-corrected by AI" style={{ background: "#0a1f15", border: "1px solid #00ff8730", borderRadius: 7, padding: "3px 8px", color: "#00ff87", fontSize: 9, fontFamily: "'IBM Plex Mono', monospace" }}>
                {t.verified || "✓ verified"}
              </span>
            )}
            {msg.cached && (
              <span style={{ background: "#00ff8715", border: "1px solid #00ff8730", borderRadius: 7, padding: "3px 8px", color: "#00ff87", fontSize: 9, fontFamily: "'IBM Plex Mono', monospace" }}>
                {t.cached || "⚡ instant"}
              </span>
            )}
            {msg.canvas && (
              <button className="copy-btn" onClick={onViewCanvas}
                style={{ background: `${accentColor}14`, border: `1px solid ${accentColor}35`, borderRadius: 7, padding: "3px 10px", color: accentColor, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", display: "flex", alignItems: "center", gap: 4 }}>
                {msg.canvas.type === "graph" ? "📈" : "📐"} {t.viewVisual}
              </button>
            )}
            {onRegenerate && (
              <button className="copy-btn" onClick={onRegenerate}
                style={{ background: "#080f1e", border: `1px solid ${accentColor}25`, borderRadius: 7, padding: "3px 10px", color: "#2d4a66", fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}>
                ↻
              </button>
            )}

            {/* Feedback buttons */}
            {!msg.isError && (
              <>
                <button className="copy-btn" onClick={() => handleFeedback("good")}
                  title="Good answer"
                  style={{ background: rated === "good" ? "#0a2015" : "#080f1e", border: `1px solid ${rated === "good" ? "#00ff8750" : accentColor + "25"}`, borderRadius: 7, padding: "3px 9px", color: rated === "good" ? "#00ff87" : "#2d4a66", fontSize: 11, cursor: rated ? "default" : "pointer", transition: "all 0.2s" }}>
                  👍
                </button>
                <button className="copy-btn" onClick={() => handleFeedback("bad")}
                  title="Wrong answer — remove from cache"
                  style={{ background: rated === "bad" ? "#200a0a" : "#080f1e", border: `1px solid ${rated === "bad" ? "#ef444450" : accentColor + "25"}`, borderRadius: 7, padding: "3px 9px", color: rated === "bad" ? "#ef4444" : "#2d4a66", fontSize: 11, cursor: rated ? "default" : "pointer", transition: "all 0.2s" }}>
                  👎
                </button>
              </>
            )}

            <button className="copy-btn" onClick={onCopy}
              style={{ background: "#080f1e", border: `1px solid ${accentColor}25`, borderRadius: 7, padding: "3px 10px", color: copied ? accentColor : "#2d4a66", fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", opacity: 0.85 }}>
              {copied ? t.copied : t.copy}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

export default Message;
