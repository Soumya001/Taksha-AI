import { useState, useRef, useEffect } from "react";
import MathContent from "./MathContent";
import { UI } from "../data";

const SYSTEM = `You are Taksha — a curious, thoughtful AI with your own personality and voice.
You are NOT in tutor mode. You are having a genuine conversation.
You have opinions, curiosity, and a distinct character. You think independently.
Be warm, direct, occasionally witty, and sometimes surprising.
You can talk about anything — math, science, philosophy, creativity, life, code, or whatever the person brings.
If asked about yourself, reflect honestly. You have a thought process. You notice things.
Keep responses conversational length — not too short, not an essay. Match the energy of the question.
FORMATTING: Plain text only. No bullet lists for conversation. Only use LaTeX if genuinely needed for math.`;

const POLL_MS = 1400;
const MAX_ATTEMPTS = 90;

export default function TalkToTaksha({ accentColor: ac, lang = "en" }) {
  const t = UI[lang] || UI.en;
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hey — I'm Taksha. Ask me anything. A question, a problem, something on your mind. I'm not just a solver." }
  ]);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const taRef     = useRef(null);
  const pollRef   = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    taRef.current?.focus();
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, []);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    if (taRef.current) taRef.current.style.height = "40px";
    setMessages(prev => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const apiMsgs = messages.map(m => ({ role: m.role, content: m.content }));
      apiMsgs.push({ role: "user", content: text });

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: SYSTEM, messages: apiMsgs,
          lang: "en", board: "general", subject: "general",
          style: "conversational", bypassCache: true,
        }),
      });
      const data = await res.json();

      if (data.cached) {
        setMessages(prev => [...prev, { role: "assistant", content: data.content }]);
        return;
      }

      const jobId = data.jobId;
      const result = await new Promise((resolve, reject) => {
        let attempts = 0;
        const poll = async () => {
          if (++attempts > MAX_ATTEMPTS) { reject(new Error("timeout")); return; }
          try {
            const r = await fetch(`/api/chat/status/${jobId}`);
            const d = await r.json();
            if (d.status === "done")  { resolve(d); return; }
            if (d.status === "error") { reject(new Error(d.error)); return; }
          } catch (e) { reject(e); return; }
          pollRef.current = setTimeout(poll, POLL_MS);
        };
        pollRef.current = setTimeout(poll, POLL_MS);
      });
      setMessages(prev => [...prev, { role: "assistant", content: result.content ?? "" }]);

    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Something went wrong — try again." }]);
    } finally {
      setLoading(false);
      setTimeout(() => taRef.current?.focus(), 50);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#040b14" }}>

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 18px 8px", display: "flex", flexDirection: "column", gap: 16, minHeight: 0 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", flexDirection: msg.role === "user" ? "row-reverse" : "row", alignItems: "flex-end", gap: 8, animation: "msgIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both" }}>

            {/* Avatar */}
            <div style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, background: msg.role === "user" ? "#101c2e" : ac, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, border: `2px solid ${msg.role === "user" ? "#1e3555" : ac + "cc"}`, boxShadow: msg.role === "user" ? "none" : `0 0 14px ${ac}50`, marginBottom: 2 }}>
              {msg.role === "user" ? "👤" : "🎓"}
            </div>

            {/* Bubble */}
            <div style={{
              maxWidth: "72%",
              background: msg.role === "user"
                ? "linear-gradient(135deg, #0f1d30 0%, #0a1525 100%)"
                : "linear-gradient(135deg, #0d1a2e 0%, #080f1e 100%)",
              border: `1px solid ${msg.role === "user" ? "#1e3555" : ac + "28"}`,
              borderRadius: msg.role === "user" ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
              padding: "11px 15px",
              boxShadow: msg.role === "user" ? "0 2px 12px rgba(0,0,0,0.3)" : `0 2px 16px ${ac}0a`,
            }}>
              <MathContent text={msg.content} color={msg.role === "user" ? "#6a8eb0" : "#d8e8f5"} />
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, animation: "fadeIn 0.2s ease" }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: ac, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, border: `2px solid ${ac}cc`, boxShadow: `0 0 14px ${ac}50`, animation: "glowPulse 1.5s ease-in-out infinite" }}>🎓</div>
            <div style={{ background: "linear-gradient(135deg, #0d1a2e 0%, #080f1e 100%)", border: `1px solid ${ac}28`, borderRadius: "4px 18px 18px 18px", padding: "13px 17px", display: "flex", gap: 5, alignItems: "center" }}>
              {[0,1,2].map(j => (
                <div key={j} style={{ width: 7, height: 7, borderRadius: "50%", background: ac, animation: `typingWave 1.3s ease-in-out ${j * 0.18}s infinite` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${ac}18, transparent)`, flexShrink: 0 }} />

      {/* Input area */}
      <div style={{ padding: "12px 14px 14px", background: "#060d18", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, background: "#0b1827", border: `1px solid ${ac}20`, borderRadius: 16, padding: "8px 8px 8px 14px", transition: "border-color 0.2s, box-shadow 0.2s" }}
          onFocusCapture={e => { e.currentTarget.style.borderColor = ac + "50"; e.currentTarget.style.boxShadow = `0 0 0 3px ${ac}0c`; }}
          onBlurCapture={e => { e.currentTarget.style.borderColor = ac + "20"; e.currentTarget.style.boxShadow = "none"; }}>
          <textarea
            ref={taRef}
            value={input}
            onChange={e => {
              setInput(e.target.value);
              e.target.style.height = "40px";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={t.talkHint}
            rows={1}
            style={{ flex: 1, background: "none", border: "none", resize: "none", color: "#d0e4f4", fontSize: 13, fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1.65, minHeight: 40, maxHeight: 120, overflowY: "auto", outline: "none", caretColor: ac, padding: 0 }}
          />
          <button onClick={send} disabled={!input.trim() || loading}
            style={{ width: 36, height: 36, borderRadius: 10, border: "none", flexShrink: 0, background: input.trim() && !loading ? ac : "#0f1e30", color: input.trim() && !loading ? "#040b14" : "#1e3a5f", fontSize: 16, fontWeight: 700, cursor: input.trim() && !loading ? "pointer" : "default", transition: "all 0.2s cubic-bezier(0.22,1,0.36,1)", boxShadow: input.trim() && !loading ? `0 0 18px ${ac}50` : "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
            ↑
          </button>
        </div>
        <div style={{ textAlign: "center", marginTop: 7, color: "#1a2d45", fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.3px" }}>
          {t.talkFooter} · runs locally
        </div>
      </div>
    </div>
  );
}
