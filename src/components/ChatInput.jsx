import { memo, useRef, useState } from "react";
import { SUBJECTS, BOARDS } from "../data";
import { STYLES } from "../prompts";

const ChatInput = memo(function ChatInput({
  input, setInput, loading, imageData, imagePreview,
  setImageData, setImagePreview,
  lang, style, setStyle, subject,
  board, grade, setBoard, setGrade,
  listening, onStartListen, onStopListen,
  onSend, accentColor, t,
}) {
  const ac          = accentColor;
  const subj        = SUBJECTS[subject] || SUBJECTS.general;
  const textareaRef = useRef(null);
  const fileRef     = useRef(null);
  const canSend     = !loading && (!!input.trim() || !!imageData);
  const [showBoard, setShowBoard] = useState(false);

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setImageData({ base64: ev.target.result.split(",")[1], type: file.type });
      setImagePreview(ev.target.result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSend = () => onSend(textareaRef);

  const boardInfo = BOARDS[board] || BOARDS.general;

  return (
    <div className="chat-input-wrap" style={{ position: "relative", zIndex: 10, borderTop: `1px solid ${ac}10`, background: "rgba(4,11,20,0.94)", backdropFilter: "blur(24px)", padding: "14px 22px 18px" }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>

        {/* Board picker — slides in when open */}
        {showBoard && (
          <div style={{ marginBottom: 10, background: "#080f1e", border: `1px solid ${ac}15`, borderRadius: 14, padding: "12px 14px", animation: "slideUp 0.2s ease" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: BOARDS[board]?.grades?.length ? 8 : 0 }}>
              {Object.entries(BOARDS).map(([key, val]) => (
                <button key={key} onClick={() => { setBoard(key); if (key === "general") setGrade(""); }}
                  style={{ padding: "4px 11px", borderRadius: 12, border: `1px solid ${board === key ? val.color + "60" : "#1a2d45"}`, background: board === key ? val.color + "18" : "transparent", color: board === key ? val.color : "#3a5570", fontSize: 10, cursor: "pointer", transition: "all 0.15s" }}>
                  {val.icon} {val.label}
                </button>
              ))}
            </div>
            {BOARDS[board]?.grades?.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                <span style={{ color: "#1e3a5f", fontSize: 9, textTransform: "uppercase", letterSpacing: "1px" }}>{t.selectGrade}:</span>
                {BOARDS[board].grades.map(g => (
                  <button key={g} onClick={() => setGrade(g)}
                    style={{ padding: "2px 8px", borderRadius: 8, border: `1px solid ${grade === g ? ac + "60" : "#1a2d45"}`, background: grade === g ? ac + "18" : "transparent", color: grade === g ? ac : "#3a5570", fontSize: 10, cursor: "pointer", transition: "all 0.15s" }}>
                    {g}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Image preview */}
        {imagePreview && (
          <div style={{ marginBottom: 10, animation: "slideUp 0.3s cubic-bezier(0.22,1,0.36,1)" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "#080f1e", border: `1px solid ${ac}25`, borderRadius: 12, padding: "9px 14px" }}>
              <img src={imagePreview} alt="preview" style={{ height: 46, borderRadius: 7, display: "block" }} />
              <span style={{ color: "#2d4a66", fontSize: 11 }}>Image attached</span>
              <button className="btn-spring" onClick={() => { setImageData(null); setImagePreview(null); }}
                style={{ background: "none", border: "none", color: "#ef4444", fontSize: 18, padding: 0, lineHeight: 1, opacity: 0.7 }}>×</button>
            </div>
          </div>
        )}

        <div style={{ background: "linear-gradient(180deg, #0b1525 0%, #080f1e 100%)", border: `1px solid ${ac}20`, borderRadius: 20, boxShadow: "0 8px 32px rgba(0,0,0,0.5)", overflow: "hidden" }}>

          {/* Tag row */}
          <div className="input-tag-row" style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px 0", borderBottom: "1px solid #0a1422", flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, color: "#162030", marginRight: 2, letterSpacing: "0.5px" }}>{t.topic}</span>
            <span style={{ background: `${subj.color}10`, border: `1px solid ${subj.color}22`, borderRadius: 7, padding: "2px 9px", color: subj.color, fontSize: 10 }}>
              {subj.icon} {t.topics[subject]?.label || subj.label}
            </span>

            {/* Board tag — clickable to open picker */}
            <button className="btn-flat" onClick={() => setShowBoard(s => !s)}
              style={{ background: board !== "general" ? `${boardInfo.color}12` : "#0a1422", border: `1px solid ${board !== "general" ? boardInfo.color + "35" : "#0f1e2e"}`, borderRadius: 7, padding: "2px 9px", color: board !== "general" ? boardInfo.color : "#1e3a5f", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              {board !== "general" ? `${boardInfo.icon} ${boardInfo.label}${grade ? " · " + grade : ""} ↓` : `📚 ${t.boardBtn} ↓`}
            </button>

            {/* Style toggle */}
            <button className="btn-flat" onClick={() => { const sk = Object.keys(STYLES); setStyle(s => sk[(sk.indexOf(s) + 1) % sk.length]); }}
              style={{ background: `${ac}0c`, border: `1px solid ${ac}1e`, borderRadius: 7, padding: "2px 9px", color: ac, fontSize: 10, opacity: 0.85, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              {STYLES[style].icon} {t.styles[style]?.label} ↻
            </button>

            <div style={{ flex: 1 }} />
            {input.length > 0 && (
              <button onClick={() => { setInput(""); if (textareaRef.current) textareaRef.current.style.height = "auto"; }}
                style={{ background: "none", border: "none", color: "#1e3a5f", fontSize: 10, cursor: "pointer", padding: "0 4px", transition: "color 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
                onMouseLeave={e => e.currentTarget.style.color = "#1e3a5f"}>
                {t.clearInput} ×
              </button>
            )}
          </div>

          {/* Textarea */}
          <div style={{ padding: "12px 16px 0" }}>
            <textarea ref={textareaRef} value={input}
              onChange={e => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 180) + "px"; }}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={listening ? t.listening : t.hint}
              rows={2}
              style={{ width: "100%", background: "none", border: "none", resize: "none", color: "#dde6f0", fontSize: 14, fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1.75, minHeight: 52, maxHeight: 180, overflowY: "auto", caretColor: ac, display: "block" }}
            />
          </div>

          {/* Action row */}
          <div className="input-action-row" style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px 12px" }}>
            <input type="file" id="photo-upload" ref={fileRef} accept="image/*" onChange={handlePhoto} style={{ display: "none" }} />
            <label htmlFor="photo-upload" className="btn-flat" title="Attach photo of your problem"
              style={{ display: "flex", alignItems: "center", gap: 5, background: "#0a1422", border: "1px solid #0f1e2e", borderRadius: 10, padding: "6px 13px", color: "#2a4060", fontSize: 11, cursor: "pointer" }}>
              <span style={{ fontSize: 14 }}>📷</span><span className="btn-label"> {t.photo}</span>
            </label>
            <button className="btn-flat"
              onClick={listening ? onStopListen : onStartListen}
              style={{ display: "flex", alignItems: "center", gap: 5, background: listening ? "#1c0808" : "#0a1422", border: `1px solid ${listening ? "#ef444425" : "#0f1e2e"}`, borderRadius: 10, padding: "6px 13px", color: listening ? "#ef4444" : "#2a4060", fontSize: 11, cursor: "pointer", animation: listening ? "pulse 1.2s ease-in-out infinite" : "none" }}>
              <span style={{ fontSize: 14 }}>{listening ? "🔴" : "🎤"}</span>
              <span className="btn-label">{listening ? t.stop : t.speak}</span>
            </button>
            <div style={{ flex: 1 }} />
            <div className="kb-hint" style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <kbd style={{ background: "#0a1422", border: "1px solid #0f1e2e", borderRadius: 5, padding: "2px 8px", color: "#162030", fontSize: 9, letterSpacing: "0.5px" }}>ENTER</kbd>
              <span style={{ color: "#0f1e2e", fontSize: 10 }}>send</span>
              <span style={{ color: "#0a1422", fontSize: 10, margin: "0 2px" }}>·</span>
              <kbd style={{ background: "#0a1422", border: "1px solid #0f1e2e", borderRadius: 5, padding: "2px 8px", color: "#162030", fontSize: 9 }}>⇧ ENTER</kbd>
              <span style={{ color: "#0f1e2e", fontSize: 10 }}>newline</span>
            </div>
            <button className="btn-spring will-animate" onClick={handleSend} disabled={!canSend}
              style={{ display: "flex", alignItems: "center", gap: 8, height: 38, borderRadius: 12, paddingInline: "20px", background: canSend ? `linear-gradient(135deg, ${ac} 0%, ${ac}cc 100%)` : "#0a1422", border: `1px solid ${canSend ? ac + "50" : "#0f1e2e"}`, cursor: canSend ? "pointer" : "default", color: canSend ? "#040b14" : "#1e3a5f", fontSize: 13, fontWeight: 700, letterSpacing: "0.3px", boxShadow: canSend ? `0 0 28px ${ac}40, 0 4px 16px rgba(0,0,0,0.4)` : "none", transition: "all 0.2s cubic-bezier(0.22,1,0.36,1)", flexShrink: 0, whiteSpace: "nowrap" }}>
              {loading ? <span style={{ animation: "pulse 1s infinite" }}>●●●</span> : <>{t.send} <span style={{ fontSize: 15 }}>↑</span></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ChatInput;
