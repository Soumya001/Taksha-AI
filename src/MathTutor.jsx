import { useState, useRef, useEffect, useCallback } from "react";
import MathCanvas from "./MathCanvas";
import Message from "./components/Message";
import BgOrbs from "./components/BgOrbs";
import AnimatedLogo from "./components/AnimatedLogo";
import TypingIndicator from "./components/TypingIndicator";
import ThinkingPanel from "./components/ThinkingPanel";
import WelcomeScreen from "./components/WelcomeScreen";
import HistorySidebar from "./components/HistorySidebar";
import ChatInput from "./components/ChatInput";
import { useChat } from "./hooks/useChat";
import { SUBJECTS, LANGS, BOARDS, UI } from "./data";
import { STYLES } from "./prompts";
import "./global.css";

// Glow animation injected once at module level — avoids per-render style duplication
const GLOW_STYLE_ID = "taksha-glow";

export default function MathTutor() {
  const savedProfile = (() => { try { return JSON.parse(localStorage.getItem("taksha_profile") || "null"); } catch { return null; } })();

  const savedScreen  = (() => { try { return localStorage.getItem("taksha_screen")  || "welcome";   } catch { return "welcome"; } })();
  const savedSubject = (() => { try { return localStorage.getItem("taksha_subject") || "general";   } catch { return "general"; } })();
  const initialMessages = (() => {
    try {
      if (savedScreen !== "chat") return [];
      const saved = JSON.parse(localStorage.getItem("taksha_messages") || "null");
      if (saved?.length > 0) return saved;
      // No saved messages but was in chat — regenerate welcome
      const initLang = savedProfile?.lang || "en";
      const s = SUBJECTS[savedSubject] || SUBJECTS.general;
      return [{ role: "assistant", content: UI[initLang].welcome(s.label) }];
    } catch { return []; }
  })();

  const [screen,      setScreen]      = useState(savedScreen);
  const [trans,       setTrans]       = useState(false);
  const [subject,     setSubject]     = useState(savedSubject);
  const [style,       setStyle]       = useState(savedProfile?.style || "stepbystep");
  const [lang,        setLang]        = useState(savedProfile?.lang  || "en");
  const [board,       setBoard]       = useState(savedProfile?.board || "general");
  const [grade,       setGrade]       = useState(savedProfile?.grade || "");
  const [copiedIdx,   setCopiedIdx]   = useState(null);
  const [activeCanvas,setActiveCanvas]= useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [listening,   setListening]   = useState(false);
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("mm_history") || "[]"); } catch { return []; }
  });

  const chatEndRef    = useRef(null);
  const recognitionRef= useRef(null);

  const { messages, setMessages, loading, queuePos, retryFn,
          input, setInput, imageData, setImageData, imagePreview, setImagePreview,
          thinkingStream, contentStream, streamPhase,
          sendMessage, sendFeedback, resetChat } = useChat({ lang, subject, style, board, grade, initialMessages });

  const handleFeedback = (msgIdx, rating) => {
    // find the user question that preceded this assistant message
    const userMsg = [...messages].slice(0, msgIdx).reverse().find(m => m.role === "user");
    const questionText = typeof userMsg?.content === "string" ? userMsg.content : "";
    if (questionText) sendFeedback(questionText, rating, { board, subject, style, lang });
  };

  const ac   = STYLES[style].color;
  const subj = SUBJECTS[subject] || SUBJECTS.general;
  const t    = UI[lang];

  // Update glow keyframe whenever accent color changes — single style tag, no duplicates
  useEffect(() => {
    let el = document.getElementById(GLOW_STYLE_ID);
    if (!el) { el = document.createElement("style"); el.id = GLOW_STYLE_ID; document.head.appendChild(el); }
    el.textContent = `@keyframes glowPulse{0%,100%{box-shadow:0 0 20px ${ac}40}50%{box-shadow:0 0 40px ${ac}70,0 0 80px ${ac}20}}`;
  }, [ac]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  // Persist messages to localStorage whenever they change (strip image previews to keep size small)
  useEffect(() => {
    if (screen === "chat" && messages.length > 0 && !loading) {
      const toSave = messages.map(({ image, ...m }) => m);
      try { localStorage.setItem("taksha_messages", JSON.stringify(toSave)); } catch {}
    }
  }, [messages, screen, loading]);

  // When language changes on chat page, update the welcome message if it's still the only message
  useEffect(() => {
    if (screen === "chat" && messages.length === 1 && messages[0].role === "assistant") {
      const s = SUBJECTS[subject] || SUBJECTS.general;
      setMessages([{ role: "assistant", content: UI[lang].welcome(s.label) }]);
    }
  }, [lang]);

  const transition = (fn) => { setTrans(true); setTimeout(() => { fn(); setTrans(false); }, 260); };

  const openChat = useCallback((subjectKey, prefill = "") => {
    transition(() => {
      setSubject(subjectKey);
      const s = SUBJECTS[subjectKey] || SUBJECTS.general;
      setMessages([{ role: "assistant", content: UI[lang].welcome(s.label) }]);
      setScreen("chat");
      localStorage.setItem("taksha_screen", "chat");
      localStorage.setItem("taksha_subject", subjectKey);
      if (prefill) setInput(prefill);
    });
  }, [lang]);

  const newChat = () => {
    if (messages.length > 1) {
      const session = { id: Date.now(), subject, style, lang, board, grade, messages: messages.slice(0, 10), ts: Date.now() };
      const updated = [session, ...history].slice(0, 30);
      setHistory(updated);
      localStorage.setItem("mm_history", JSON.stringify(updated));
    }
    transition(() => { resetChat(); setActiveCanvas(null); setScreen("welcome"); localStorage.setItem("taksha_screen", "welcome"); localStorage.removeItem("taksha_messages"); });
  };

  const deleteHistory = (id) => {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    localStorage.setItem("mm_history", JSON.stringify(updated));
  };

  const copyMsg = async (idx) => {
    try { await navigator.clipboard.writeText(messages[idx].content); }
    catch {
      const ta = Object.assign(document.createElement("textarea"), { value: messages[idx].content, style: "position:fixed;opacity:0" });
      document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
    }
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition not supported. Try Chrome."); return; }
    const r = new SR();
    r.lang = LANGS[lang]?.voice || "en-IN"; r.continuous = false; r.interimResults = false;
    r.onresult = e => { setInput(p => (p + " " + e.results[0][0].transcript).trim()); setListening(false); };
    r.onerror = r.onend = () => setListening(false);
    recognitionRef.current = r;
    r.start(); setListening(true);
  };
  const stopListening = () => { recognitionRef.current?.stop(); setListening(false); };

  // ── Welcome ──
  if (screen === "welcome") return (
    <div style={{ opacity: trans ? 0 : 1, transform: trans ? "scale(0.97)" : "scale(1)", transition: "opacity 0.25s ease, transform 0.25s ease" }}>
      <WelcomeScreen
        style={style} setStyle={setStyle} onSelect={openChat}
        lang={lang} setLang={setLang}
        setBoard={setBoard} setGrade={setGrade}
      />
    </div>
  );

  // ── Chat ──
  const canvasWidth = "clamp(300px, 36vw, 460px)";
  const boardInfo   = BOARDS[board] || BOARDS.general;

  return (
    <div style={{ minHeight: "100vh", background: "#040b14", display: "flex", flexDirection: "column", fontFamily: "'IBM Plex Mono', monospace", position: "relative", overflow: "hidden", opacity: trans ? 0 : 1, transform: trans ? "translateY(12px)" : "translateY(0)", transition: "opacity 0.25s ease, transform 0.25s ease, padding-right 0.38s cubic-bezier(0.22,1,0.36,1)", paddingRight: activeCanvas ? canvasWidth : 0 }}>
      <BgOrbs color={ac} />

      {/* Header */}
      <div className="chat-header" style={{ position: "relative", zIndex: 20, padding: "12px 22px", borderBottom: `1px solid ${ac}20`, background: "rgba(4,11,20,0.95)", backdropFilter: "blur(20px)", display: "flex", alignItems: "center", gap: 10, flexWrap: "nowrap", boxShadow: `0 1px 0 ${ac}12` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, minWidth: 0 }}>
          <button className="btn-flat" onClick={newChat} title="Home" aria-label="Back to home"
            style={{ background: "none", border: "none", padding: 0, lineHeight: 1, flexShrink: 0, cursor: "pointer" }}>
            <AnimatedLogo color={ac} size={32} />
          </button>
          <span style={{ color: "#f1f5f9", fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 16, letterSpacing: "-0.5px", whiteSpace: "nowrap", flexShrink: 0 }}>
            Taksha <span style={{ color: ac }}>AI</span>
          </span>
          <span style={{ background: `${subj.color}15`, border: `1px solid ${subj.color}35`, borderRadius: 8, padding: "2px 9px", color: subj.color, fontSize: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 110 }}>
            {subj.icon} {t.topics[subject]?.label || subj.label}
          </span>
          {board !== "general" && (
            <span className="hdr-board" style={{ background: `${boardInfo.color}15`, border: `1px solid ${boardInfo.color}35`, borderRadius: 8, padding: "2px 9px", color: boardInfo.color, fontSize: 10, whiteSpace: "nowrap" }}>
              {boardInfo.icon} {boardInfo.label}{grade ? ` · ${grade}` : ""}
            </span>
          )}
        </div>
        <div className="chat-header-right" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {messages.some(m => m.canvas) && (
            <button className="btn-flat hdr-canvas" aria-label="View canvas" onClick={() => setActiveCanvas([...messages].reverse().find(m => m.canvas)?.canvas ?? null)}
              style={{ background: `${ac}15`, border: `1px solid ${ac}35`, borderRadius: 9, color: ac, padding: "5px 10px", fontSize: 11, display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
              📊 Canvas
            </button>
          )}
          <div style={{ display: "flex", background: "#080f1e", border: "1px solid #1a2d45", borderRadius: 8, padding: 2, gap: 1 }}>
            {Object.entries(LANGS).map(([key, val]) => (
              <button key={key} className="btn-flat" onClick={() => setLang(key)} title={val.full} aria-label={val.full}
                style={{ padding: "3px 7px", borderRadius: 5, border: "none", background: lang === key ? ac : "transparent", color: lang === key ? "#040b14" : "#4a6080", fontSize: 13, cursor: "pointer", transition: "all 0.15s", lineHeight: 1 }}>
                {val.label}
              </button>
            ))}
          </div>
          <button className="btn-flat" onClick={newChat}
            style={{ background: "#080f1e", border: "1px solid #1a2d45", borderRadius: 9, color: "#6b8aaa", padding: "5px 10px", fontSize: 11, whiteSpace: "nowrap" }}>
            ✏️ <span className="hdr-newchat-lbl">{t.newChat}</span>
          </button>
          <button className="btn-flat" onClick={() => setShowHistory(h => !h)} aria-label="Chat history"
            style={{ background: showHistory ? `${ac}15` : "#080f1e", border: `1px solid ${showHistory ? ac + "35" : "#1a2d45"}`, borderRadius: 9, color: showHistory ? ac : "#6b8aaa", padding: "5px 10px", fontSize: 11, whiteSpace: "nowrap" }}>
            📋 <span className="hdr-history-lbl">{t.history}</span>
          </button>
        </div>
      </div>

      {activeCanvas && <MathCanvas canvas={activeCanvas} accentColor={ac} onClose={() => setActiveCanvas(null)} />}

      {showHistory && (
        <HistorySidebar
          history={history} accentColor={ac} t={t}
          onSelect={h => { setMessages(h.messages); setSubject(h.subject); setStyle(h.style); setLang(h.lang || "en"); setBoard(h.board || "general"); setGrade(h.grade || ""); setScreen("chat"); setShowHistory(false); }}
          onDelete={deleteHistory}
          onClear={() => { setHistory([]); localStorage.removeItem("mm_history"); }}
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* Messages */}
      <div className="chat-messages" style={{ flex: 1, overflowY: "auto", padding: "28px 22px 16px", position: "relative", zIndex: 5, maxWidth: 820, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
        {messages.map((msg, i) => (
          <Message key={i} idx={i} msg={msg} accentColor={ac}
            onCopy={() => copyMsg(i)} copied={copiedIdx === i}
            onViewCanvas={() => setActiveCanvas(msg.canvas)}
            onRegenerate={i > 0 && !msg.isError ? () => sendMessage(null, messages[i - 1]?.content, true) : null}
            onFeedback={msg.role === "assistant" ? (rating) => handleFeedback(i, rating) : null}
            t={t}
          />
        ))}
        {loading && (
          <div className="will-animate" style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 24, animation: "fadeIn 0.3s ease" }}>
            <AnimatedLogo color={ac} size={33} />
            <div style={{ flex: 1, minWidth: 0, background: "#080f1e", border: `1px solid ${ac}25`, borderRadius: "4px 20px 20px 20px", backdropFilter: "blur(8px)", overflow: "hidden" }}>
              {queuePos > 0
                ? <div style={{ padding: "12px 18px", color: "#4a6080", fontSize: 11 }}>
                    <span style={{ color: ac }}>#{queuePos}</span> {t.queueWait||"in queue — waiting for GPU..."}
                  </div>
                : (streamPhase === "thinking" || streamPhase === "verifying" || streamPhase === "content")
                  ? <ThinkingPanel text={thinkingStream} contentStream={contentStream} color={ac} phase={streamPhase} />
                  : <TypingIndicator color={ac} />}
            </div>
          </div>
        )}
        {/* Retry button on error */}
        {retryFn && !loading && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <button onClick={retryFn} style={{ background: "#080f1e", border: `1px solid ${ac}30`, borderRadius: 10, color: ac, fontSize: 11, padding: "7px 20px", cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace" }}>
              {t.retry||"↻ Retry"}
            </button>
          </div>
        )}
        {messages.length === 1 && !loading && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8, animation: "slideUp 0.4s cubic-bezier(0.22,1,0.36,1) 0.3s both" }}>
            {(t.topics[subject]?.examples || SUBJECTS[subject]?.examples || SUBJECTS.general.examples).map((ex, i) => (
              <button key={i} className="btn-flat" onClick={() => setInput(ex)}
                style={{ background: `${ac}08`, border: `1px solid ${ac}20`, borderRadius: 10, padding: "8px 14px", color: "#3d5a78", fontSize: 12 }}>
                {ex}
              </button>
            ))}
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <ChatInput
        input={input} setInput={setInput}
        loading={loading}
        imageData={imageData} setImageData={setImageData}
        imagePreview={imagePreview} setImagePreview={setImagePreview}
        lang={lang} style={style} setStyle={setStyle} subject={subject}
        board={board} grade={grade} setBoard={setBoard} setGrade={setGrade}
        listening={listening} onStartListen={startListening} onStopListen={stopListening}
        onSend={sendMessage} accentColor={ac} t={t}
      />
    </div>
  );
}
