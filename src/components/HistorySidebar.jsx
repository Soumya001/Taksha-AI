import { memo, useState } from "react";
import { SUBJECTS, BOARDS } from "../data";

const HistorySidebar = memo(function HistorySidebar({ history, accentColor, t, onSelect, onDelete, onClear, onClose }) {
  const ac = accentColor;
  const [search, setSearch] = useState("");

  const filtered = history.filter(h => {
    if (!search.trim()) return true;
    const q = (h.messages?.find(m => m.role === "user")?.content || "").toLowerCase();
    return q.includes(search.toLowerCase());
  });

  // Validate a history entry before restoring
  const safeSelect = (h) => {
    if (!Array.isArray(h.messages) || h.messages.length === 0) return;
    if (!h.messages.every(m => m.role && typeof m.content === "string")) return;
    onSelect(h);
  };

  // Group by date
  const now = Date.now();
  const G = { today: t.today||"Today", yesterday: t.yesterday||"Yesterday", thisWeek: t.thisWeek||"This Week", older: t.older||"Older" };
  const groups = { [G.today]: [], [G.yesterday]: [], [G.thisWeek]: [], [G.older]: [] };
  for (const h of filtered) {
    const age = now - h.ts;
    if      (age < 86_400_000)   groups[G.today].push(h);
    else if (age < 172_800_000)  groups[G.yesterday].push(h);
    else if (age < 604_800_000)  groups[G.thisWeek].push(h);
    else                         groups[G.older].push(h);
  }

  return (
    <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(340px, 100vw)", background: "#040b14", borderLeft: `1px solid ${ac}20`, zIndex: 50, display: "flex", flexDirection: "column", boxShadow: "-8px 0 40px rgba(0,0,0,0.6)", animation: "slideLeft 0.3s cubic-bezier(0.22,1,0.36,1)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${ac}15` }}>
        <span style={{ color: "#f1f5f9", fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15 }}>{t.chatHistory}</span>
        <button className="btn-flat" onClick={onClose} aria-label="Close history" style={{ background: "none", border: "none", color: "#4a6080", fontSize: 20, padding: 0 }}>×</button>
      </div>

      {/* Search */}
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${ac}10` }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder={t.searchChats||"Search chats..."}
          style={{ width: "100%", background: "#080f1e", border: `1px solid ${ac}20`, borderRadius: 8, padding: "7px 12px", color: "#dde6f0", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", outline: "none", boxSizing: "border-box" }}
        />
      </div>

      {/* Sessions */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
        {history.length === 0 && (
          <p style={{ color: "#1e3a5f", fontSize: 12, textAlign: "center", marginTop: 40 }}>{t.noHistory}</p>
        )}
        {Object.entries(groups).map(([label, items]) => items.length === 0 ? null : (
          <div key={label}>
            <div style={{ color: "#1e3a5f", fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", padding: "10px 2px 4px" }}>{label}</div>
            {items.map(h => {
              const subj = SUBJECTS[h.subject];
              const board = BOARDS[h.board];
              return (
                <div key={h.id} style={{ position: "relative", group: true }}
                  onMouseEnter={e => e.currentTarget.querySelector(".del-btn").style.opacity = "1"}
                  onMouseLeave={e => e.currentTarget.querySelector(".del-btn").style.opacity = "0"}>
                  <button className="btn-flat" onClick={() => safeSelect(h)}
                    style={{ background: "#080f1e", border: "1px solid #1a2d45", borderRadius: 10, padding: "10px 36px 10px 12px", textAlign: "left", display: "flex", flexDirection: "column", gap: 3, cursor: "pointer", width: "100%", marginBottom: 4 }}>
                    <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
                      {subj && <span style={{ fontSize: 9, background: `${subj.color}18`, color: subj.color, borderRadius: 5, padding: "1px 6px", border: `1px solid ${subj.color}30` }}>{subj.icon} {subj.label}</span>}
                      {board && h.board !== "general" && <span style={{ fontSize: 9, background: `${board.color}18`, color: board.color, borderRadius: 5, padding: "1px 6px", border: `1px solid ${board.color}30` }}>{board.icon} {board.label}{h.grade ? ` · Gr ${h.grade}` : ""}</span>}
                      <span style={{ fontSize: 9, color: "#1e3a5f", marginLeft: "auto" }}>{new Date(h.ts).toLocaleDateString()}</span>
                    </div>
                    <div style={{ color: "#4a6080", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {h.messages?.find(m => m.role === "user")?.content?.slice(0, 55) || "…"}
                    </div>
                  </button>
                  <button className="del-btn" onClick={() => onDelete(h.id)} aria-label="Delete session"
                    style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#ef4444", fontSize: 14, cursor: "pointer", opacity: 0, transition: "opacity 0.15s", padding: 4 }}>✕</button>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {history.length > 0 && (
        <div style={{ padding: "12px 14px", borderTop: `1px solid ${ac}15` }}>
          <button className="btn-flat" onClick={onClear}
            style={{ background: "none", border: "1px solid #1a2d45", borderRadius: 8, color: "#ef4444", fontSize: 11, padding: "6px 16px", width: "100%", opacity: 0.7 }}>
            {t.clearHistory}
          </button>
        </div>
      )}
    </div>
  );
});

export default HistorySidebar;
