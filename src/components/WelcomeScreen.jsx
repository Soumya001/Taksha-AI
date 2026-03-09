import { useState, useEffect } from "react";
import AnimatedLogo from "./AnimatedLogo";
import BgOrbs from "./BgOrbs";
import AnimatedSolution from "./AnimatedSolution";
import TalkToTaksha from "./TalkToTaksha";
import Whitepaper from "./Whitepaper";
import { LANGS, BOARDS, UI } from "../data";
import { STYLES as STYLE_DATA } from "../prompts";

const CATEGORY_SUBJECTS = {
  math:       { icon: "🔢", label: "Mathematics",  subjects: ["algebra","calculus","geometry","trigonometry","statistics","arithmetic","wordproblems"] },
  cs:         { icon: "💻", label: "Coding & CS",  subjects: ["coding"] },
  science:    { icon: "⚛️", label: "Sciences",     subjects: ["physics","chemistry","biology"] },
  humanities: { icon: "📜", label: "Humanities",   subjects: ["history","geography","socialstudies","economics"] },
  general:    { icon: "🎓", label: "Mix / Not sure", subjects: ["general"] },
};

const GRADES = ["6","7","8","9","10","11","12","UG","Other"];

function loadProfile() {
  try { return JSON.parse(localStorage.getItem("taksha_profile") || "null"); } catch { return null; }
}
function saveProfile(p) {
  localStorage.setItem("taksha_profile", JSON.stringify(p));
}

export default function WelcomeScreen({ style, setStyle, onSelect, lang, setLang, setBoard, setGrade }) {
  const ac = STYLE_DATA[style].color;
  const t  = UI[lang];

  const [showModal,   setShowModal]   = useState(false);
  const [closingModal,setClosingModal]= useState(false);
  const [showTalk,    setShowTalk]    = useState(false);
  const [closingTalk, setClosingTalk] = useState(false);
  const [showPaper,   setShowPaper]   = useState(false);
  const [closingPaper,setClosingPaper]= useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    // Already running as installed PWA — no button needed
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstallPrompt(null));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setInstallPrompt(null);
  };

  const closeTalk = () => {
    setClosingTalk(true);
    setTimeout(() => { setShowTalk(false); setClosingTalk(false); }, 260);
  };
  const closePaper = () => {
    setClosingPaper(true);
    setTimeout(() => { setShowPaper(false); setClosingPaper(false); }, 260);
  };
  const closeModal = () => {
    setClosingModal(true);
    setTimeout(() => { setShowModal(false); setClosingModal(false); }, 260);
  };
  const [form, setForm] = useState(() => loadProfile() || {
    name: "", grade: "", board: "general", category: "general",
  });

  const openModal = () => {
    const saved = loadProfile();
    if (saved) setForm(saved);
    setShowModal(true);
  };

  const handleGo = () => {
    saveProfile({ ...form, lang, style });
    setBoard(form.board || "general");
    setGrade(form.grade || "");
    setClosingModal(true);
    setTimeout(() => {
      const subjects = CATEGORY_SUBJECTS[form.category]?.subjects || ["general"];
      onSelect(subjects[0]);
    }, 260);
  };

  const handleSkip = () => {
    setBoard("general");
    setGrade("");
    setClosingModal(true);
    setTimeout(() => onSelect("general"), 260);
  };

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div style={{ minHeight: "100vh", background: "#040b14", fontFamily: "'IBM Plex Mono', monospace", position: "relative", overflowX: "hidden" }}>
      <BgOrbs color={ac} />

      {/* Nav */}
      <nav style={{ position: "relative", zIndex: 20, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 32px", borderBottom: `1px solid ${ac}12`, }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <AnimatedLogo color={ac} size={32} />
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 900, fontSize: 24, color: "#f1f5f9", letterSpacing: "-0.5px" }}>
            Taksha <span style={{ color: ac }}>Ai</span>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* X / Twitter link — icon only */}
          <a href="https://x.com/TakshaAI" target="_blank" rel="noopener noreferrer" className="nav-x-btn"
            title="@TakshaAI on X"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "5px 7px", borderRadius: 7, border: "1px solid #1a2d45", background: "none", color: "#2d4a66", textDecoration: "none", transition: "all 0.18s", flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.color = "#f1f5f9"; e.currentTarget.style.borderColor = "#3a5570"; e.currentTarget.style.background = "#0d1b2e"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#2d4a66"; e.currentTarget.style.borderColor = "#1a2d45"; e.currentTarget.style.background = "none"; }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>

          {/* Install App — icon only, hides once installed */}
          {installPrompt && (
            <button className="btn-flat install-btn" onClick={handleInstall} title="Install App"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "5px 7px", borderRadius: 7, border: `1px solid ${ac}30`, background: `${ac}10`, color: ac, cursor: "pointer", transition: "all 0.18s", flexShrink: 0 }}
              onMouseEnter={e => { e.currentTarget.style.background = `${ac}25`; e.currentTarget.style.borderColor = `${ac}60`; }}
              onMouseLeave={e => { e.currentTarget.style.background = `${ac}10`; e.currentTarget.style.borderColor = `${ac}30`; }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v13M5 13l7 7 7-7"/><path d="M3 21h18"/>
              </svg>
            </button>
          )}

          {/* Whitepaper — hidden on mobile */}
          <button className="btn-flat wp-btn" onClick={() => setShowPaper(true)}
            style={{ background: "none", border: `1px solid #1a2d45`, borderRadius: 7, padding: "5px 13px", color: "#2d4a66", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer", letterSpacing: "0.3px", transition: "all 0.18s" }}
            onMouseEnter={e => { e.currentTarget.style.color = ac; e.currentTarget.style.borderColor = ac + "40"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#2d4a66"; e.currentTarget.style.borderColor = "#1a2d45"; }}>
            📄 Whitepaper
          </button>

          {/* Language switcher */}
          <div style={{ display: "flex", background: "#080f1e", border: "1px solid #1a2d45", borderRadius: 9, padding: 2, gap: 1 }}>
            {Object.entries(LANGS).map(([key, val]) => (
              <button key={key} className="btn-flat" onClick={() => setLang(key)} title={val.full}
                style={{ padding: "4px 8px", borderRadius: 6, border: "none", background: lang === key ? ac : "transparent", color: lang === key ? "#040b14" : "#4a6080", fontSize: 14, cursor: "pointer", transition: "all 0.18s", lineHeight: 1 }}>
                {val.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Hero split */}
      <div className="hero-wrapper" style={{ position: "relative", zIndex: 10, maxWidth: 1080, margin: "0 auto", padding: "0 32px 80px" }}>
        {/* Desktop: 2-col grid. Mobile: flex column with mock chat between title and CTAs */}
        <div className="hero-inner" style={{ padding: "64px 0 56px", minHeight: "calc(100vh - 120px)", display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "auto auto auto", gap: "0 56px", alignContent: "center" }}>

          {/* Top-left: tagline + title + subtitle */}
          <div className="hero-top" style={{ gridColumn: 1, gridRow: 1, animation: "slideUp 0.5s cubic-bezier(0.22,1,0.36,1) both", alignSelf: "end", paddingBottom: 32 }}>
            <div style={{ display: "inline-block", background: `${ac}10`, border: `1px solid ${ac}22`, borderRadius: 20, padding: "4px 14px", fontSize: 11, color: ac, letterSpacing: "0.5px", marginBottom: 24, textTransform: "uppercase" }}>
              {t.tagline}
            </div>
            <h1 className="hero-title" style={{ margin: "0 0 18px", fontFamily: "'Syne', sans-serif", fontSize: 52, fontWeight: 900, letterSpacing: "-2.5px", color: "#f1f5f9", lineHeight: 1.08 }}>
              {t.heroTitle[0]}<br />
              <span style={{ color: ac }}>{t.heroTitle[1]}</span>
            </h1>
            <p className="hero-sub" style={{ margin: 0, color: "#4a6080", fontSize: 15, lineHeight: 1.7, maxWidth: 420 }}>
              {t.heroSub}
            </p>
          </div>

          {/* Right — animated solution (spans all 3 rows on desktop) */}
          <div className="hero-right" style={{ gridColumn: 2, gridRow: "1 / 4", animation: "slideUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.1s both", alignSelf: "center", position: "relative", zIndex: 1 }}>
            <AnimatedSolution ac={ac} />
          </div>

          {/* Middle-left: style pills */}
          <div className="hero-styles" style={{ gridColumn: 1, gridRow: 2, animation: "slideUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.05s both", alignSelf: "start", position: "relative", zIndex: 2 }}>
            <p style={{ margin: "0 0 10px", color: "#1e3a5f", fontSize: 11, textTransform: "uppercase", letterSpacing: "2px" }}>{t.teachingStyle}</p>
            <div className="style-row" style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingBottom: 4 }}>
              {Object.entries(STYLE_DATA).map(([key, val]) => (
                <button key={key} className="style-pill btn-spring" onClick={() => setStyle(key)}
                  style={{ padding: "9px 18px", borderRadius: 24, border: `1px solid ${style === key ? val.color : "#1a2d45"}`, background: style === key ? val.color : "#080f1e", color: style === key ? "#040b14" : "#6b8aaa", fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, boxShadow: style === key ? `0 0 18px ${val.color}44` : "none", transition: "all 0.18s" }}>
                  {val.icon} {t.styles[key]?.label || val.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom-left: CTAs */}
          <div className="hero-cta" style={{ gridColumn: 1, gridRow: 3, animation: "slideUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.08s both", alignSelf: "start", paddingTop: 28 }}>
            <div className="cta-row" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button className="btn-spring" onClick={openModal}
                style={{ background: `linear-gradient(135deg, ${ac} 0%, ${ac}bb 100%)`, border: "none", borderRadius: 14, padding: "15px 40px", color: "#040b14", fontSize: 14, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, boxShadow: `0 0 36px ${ac}44, 0 8px 24px rgba(0,0,0,0.4)`, cursor: "pointer", letterSpacing: "0.3px", flex: 1, whiteSpace: "nowrap" }}>
                {t.startChat}
              </button>
              <button className="btn-spring" onClick={() => setShowTalk(true)}
                style={{ background: "#080f1e", border: `1px solid ${ac}40`, borderRadius: 14, padding: "15px 28px", color: ac, fontSize: 14, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, cursor: "pointer", letterSpacing: "0.3px", whiteSpace: "nowrap" }}>
                {t.talkBtn}
              </button>
            </div>
            {/* Mobile-only bottom row: Whitepaper + Install */}
            <div className="wp-mobile" style={{ display: "none", marginTop: 14, gap: 8 }}>
              <button className="btn-flat" onClick={() => setShowPaper(true)}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "none", border: `1px solid #1a2d45`, borderRadius: 10, padding: "9px 16px", color: "#2d4a66", fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer", transition: "all 0.18s" }}
                onMouseEnter={e => { e.currentTarget.style.color = ac; e.currentTarget.style.borderColor = ac + "40"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "#2d4a66"; e.currentTarget.style.borderColor = "#1a2d45"; }}>
                📄 Whitepaper
              </button>
              {installPrompt && (
                <button className="btn-flat" onClick={handleInstall} title="Install App"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", background: `${ac}10`, border: `1px solid ${ac}30`, borderRadius: 10, padding: "9px 14px", color: ac, cursor: "pointer", transition: "all 0.18s", flexShrink: 0 }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${ac}25`; }}
                  onMouseLeave={e => { e.currentTarget.style.background = `${ac}10`; }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3v13M5 13l7 7 7-7"/><path d="M3 21h18"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Talk to Taksha popup */}
      {(showTalk || closingTalk) && (
        <div
          onClick={e => { if (e.target === e.currentTarget) closeTalk(); }}
          style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px", background: "rgba(4,11,20,0.88)", backdropFilter: "blur(14px)", animation: `${closingTalk ? "fadeOut" : "fadeIn"} 0.26s ease forwards` }}>
          <div style={{ width: "100%", maxWidth: 560, height: "82vh", display: "flex", flexDirection: "column", background: "#080f1e", border: `1px solid ${ac}22`, borderRadius: 22, overflow: "hidden", boxShadow: `0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px ${ac}08`, animation: `${closingTalk ? "slideDown" : "slideUp"} 0.26s cubic-bezier(0.22,1,0.36,1) forwards` }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${ac}12`, background: "#060d18", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: ac, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, boxShadow: `0 0 18px ${ac}55`, animation: "glowPulse 3s ease-in-out infinite" }}>🎓</div>
                <div>
                  <div style={{ color: "#f1f5f9", fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: "-0.3px" }}>Taksha</div>
                  <div style={{ color: ac, fontSize: 9, opacity: 0.7, display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#00ff87", display: "inline-block", animation: "pulse 2s ease-in-out infinite" }} />
                    online · {t.talkBtn?.replace(/^💬 /, "") || "free conversation"}
                  </div>
                </div>
              </div>
              <button onClick={closeTalk}
                style={{ background: "#0a1422", border: "1px solid #1a2d45", color: "#3a5570", fontSize: 16, cursor: "pointer", lineHeight: 1, padding: "5px 9px", borderRadius: 8, transition: "all 0.15s", fontFamily: "monospace" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#1c0808"; e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.borderColor = "#ef444430"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#0a1422"; e.currentTarget.style.color = "#3a5570"; e.currentTarget.style.borderColor = "#1a2d45"; }}>
                ×
              </button>
            </div>
            {/* Chat area — fills remaining space */}
            <TalkToTaksha accentColor={ac} lang={lang} />
          </div>
        </div>
      )}

      {/* Whitepaper overlay */}
      {(showPaper || closingPaper) && (
        <Whitepaper ac={ac} onClose={closePaper} closing={closingPaper} />
      )}


      {/* Onboarding modal */}
      {(showModal || closingModal) && (
        <div className="ob-modal-backdrop" style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px", background: "rgba(4,11,20,0.85)", backdropFilter: "blur(12px)", animation: `${closingModal ? "fadeOut" : "fadeIn"} 0.26s ease forwards` }}
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>

          <div className="ob-modal ob-modal-inner" style={{ background: "#080f1e", border: `1px solid ${ac}20`, borderRadius: 20, padding: "28px 32px", width: "100%", maxWidth: 480, boxShadow: `0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px ${ac}08`, animation: `${closingModal ? "slideDown" : "slideUp"} 0.26s cubic-bezier(0.22,1,0.36,1) forwards` }}>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22 }}>
              <div>
                <div style={{ color: "#f1f5f9", fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, marginBottom: 4 }}>{t.ob.title}</div>
                <div style={{ color: "#2d4a66", fontSize: 11 }}>{t.ob.subtitle}</div>
              </div>
            </div>

            <div style={{ height: 1, background: `${ac}12`, marginBottom: 22 }} />

            {/* Name */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ color: "#1e3a5f", fontSize: 10, textTransform: "uppercase", letterSpacing: "1.5px", display: "block", marginBottom: 8 }}>{t.ob.name}</label>
              <input value={form.name} onChange={e => set("name", e.target.value)}
                placeholder={t.ob.namePlaceholder}
                style={{ width: "100%", background: "#0a1422", border: `1px solid #1a2d45`, borderRadius: 10, padding: "9px 14px", color: "#dde6f0", fontSize: 13, fontFamily: "'IBM Plex Mono', monospace", outline: "none", boxSizing: "border-box" }}
                onFocus={e => e.target.style.borderColor = ac + "60"}
                onBlur={e => e.target.style.borderColor = "#1a2d45"}
              />
            </div>

            {/* Grade */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ color: "#1e3a5f", fontSize: 10, textTransform: "uppercase", letterSpacing: "1.5px", display: "block", marginBottom: 8 }}>{t.ob.classYear}</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {GRADES.map(g => (
                  <button key={g} onClick={() => set("grade", g)}
                    style={{ padding: "5px 12px", borderRadius: 10, border: `1px solid ${form.grade === g ? ac + "60" : "#1a2d45"}`, background: form.grade === g ? ac + "18" : "#0a1422", color: form.grade === g ? ac : "#3a5570", fontSize: 11, cursor: "pointer", transition: "all 0.15s" }}>
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Board */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ color: "#1e3a5f", fontSize: 10, textTransform: "uppercase", letterSpacing: "1.5px", display: "block", marginBottom: 8 }}>{t.ob.boardExam}</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {Object.entries(BOARDS).map(([key, val]) => (
                  <button key={key} onClick={() => set("board", key)}
                    style={{ padding: "5px 12px", borderRadius: 10, border: `1px solid ${form.board === key ? val.color + "60" : "#1a2d45"}`, background: form.board === key ? val.color + "18" : "#0a1422", color: form.board === key ? val.color : "#3a5570", fontSize: 11, cursor: "pointer", transition: "all 0.15s" }}>
                    {val.icon} {val.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject category */}
            <div style={{ marginBottom: 28 }}>
              <label style={{ color: "#1e3a5f", fontSize: 10, textTransform: "uppercase", letterSpacing: "1.5px", display: "block", marginBottom: 8 }}>{t.ob.helpWith}</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {Object.entries(CATEGORY_SUBJECTS).map(([key, val]) => (
                  <button key={key} onClick={() => set("category", key)}
                    style={{ padding: "7px 14px", borderRadius: 10, border: `1px solid ${form.category === key ? ac + "60" : "#1a2d45"}`, background: form.category === key ? ac + "18" : "#0a1422", color: form.category === key ? ac : "#3a5570", fontSize: 11, cursor: "pointer", transition: "all 0.15s" }}>
                    {val.icon} {t.categories[key] || val.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ height: 1, background: `${ac}12`, marginBottom: 22 }} />

            {/* CTA */}
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-spring" onClick={handleGo}
                style={{ flex: 1, background: `linear-gradient(135deg, ${ac} 0%, ${ac}cc 100%)`, border: "none", borderRadius: 12, padding: "13px 0", color: "#040b14", fontSize: 14, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, boxShadow: `0 0 28px ${ac}35`, cursor: "pointer" }}>
                {form.name ? t.ob.letsGoName(form.name) : t.ob.letsGo}
              </button>
              <button className="btn-flat" onClick={handleSkip}
                style={{ background: "none", border: `1px solid #1a2d45`, borderRadius: 12, padding: "13px 18px", color: "#2d4a66", fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap" }}
                onMouseEnter={e => { e.currentTarget.style.color = "#6b8aaa"; e.currentTarget.style.borderColor = "#2d4a66"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "#2d4a66"; e.currentTarget.style.borderColor = "#1a2d45"; }}>
                {t.ob.skip}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
