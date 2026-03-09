import { useRef, useState, useEffect } from "react";

const NAV = [
  { id: "s0",  short: "Abstract" },
  { id: "s1",  short: "Mission" },
  { id: "s2",  short: "Architecture" },
  { id: "s3",  short: "The Brain" },
  { id: "s4",  short: "Brain Tunnel" },
  { id: "s5",  short: "Memory" },
  { id: "s6",  short: "Self-Repair" },
  { id: "s7",  short: "Knowledge" },
  { id: "s8",  short: "Routing" },
  { id: "s9",  short: "Safety" },
  { id: "s10", short: "Privacy" },
  { id: "s11", short: "Roadmap" },
];

/* ── Primitive helpers ────────────────────────────────────────── */
const T = ({ c = "#7a96b4", size = 13, weight = 400, lh = 1.85, mb = 14, children, style }) => (
  <p style={{ margin: `0 0 ${mb}px`, color: c, fontSize: size, fontFamily: "'IBM Plex Mono',monospace", fontWeight: weight, lineHeight: lh, ...style }}>{children}</p>
);

const Accent = ({ ac, children }) => <span style={{ color: ac }}>{children}</span>;

const Code = ({ ac, children }) => (
  <code style={{ background: "#040b14", border: `1px solid ${ac}20`, borderRadius: 4, padding: "1px 7px", color: ac, fontSize: 11, fontFamily: "'IBM Plex Mono',monospace" }}>{children}</code>
);

const HR = ({ ac }) => (
  <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${ac}22,transparent)`, margin: "40px 0" }} />
);

const SectionTitle = ({ id, num, title, ac }) => (
  <div id={id} style={{ marginBottom: 22, scrollMarginTop: 24 }}>
    <div style={{ color: ac, fontSize: 9, fontFamily: "'IBM Plex Mono',monospace", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 6, opacity: 0.6 }}>{num}</div>
    <h2 style={{ margin: 0, fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: "clamp(18px,4vw,24px)", color: "#eef2f7", letterSpacing: "-0.6px", lineHeight: 1.2 }}>{title}</h2>
  </div>
);

const Sub = ({ children }) => (
  <h3 style={{ margin: "28px 0 10px", fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 14, color: "#c8daea", letterSpacing: "0.1px" }}>{children}</h3>
);

const Pill = ({ label, color }) => (
  <span style={{ display: "inline-block", background: `${color}12`, border: `1px solid ${color}28`, borderRadius: 20, padding: "3px 11px", color, fontSize: 10, fontFamily: "'IBM Plex Mono',monospace", margin: "2px 3px 2px 0" }}>{label}</span>
);

const Stat = ({ val, label, ac }) => (
  <div style={{ background: "#080f1e", border: `1px solid ${ac}12`, borderRadius: 12, padding: "16px 20px", flex: "1 1 100px", minWidth: 100 }}>
    <div style={{ color: ac, fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: 22, marginBottom: 4 }}>{val}</div>
    <div style={{ color: "#2d4a66", fontSize: 10, fontFamily: "'IBM Plex Mono',monospace" }}>{label}</div>
  </div>
);

const Grid = ({ children }) => (
  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "18px 0" }}>{children}</div>
);

const Callout = ({ ac, icon, label, children }) => (
  <div style={{ background: `${ac}07`, border: `1px solid ${ac}22`, borderRadius: 12, padding: "18px 22px", margin: "18px 0", position: "relative", overflow: "hidden" }}>
    <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: `linear-gradient(180deg,${ac},${ac}44)`, borderRadius: "3px 0 0 3px" }} />
    {label && <div style={{ color: ac, fontSize: 9, fontFamily: "'IBM Plex Mono',monospace", letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 8, opacity: 0.8, display: "flex", alignItems: "center", gap: 6 }}>
      {icon && <span>{icon}</span>}{label}
    </div>}
    <div style={{ color: "#94b4cc", fontSize: 12, fontFamily: "'IBM Plex Mono',monospace", lineHeight: 1.85 }}>{children}</div>
  </div>
);

const KeyFact = ({ ac, children }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `${ac}0d`, border: `1px solid ${ac}25`, borderRadius: 8, padding: "6px 14px", margin: "4px 0" }}>
    <span style={{ color: ac, fontSize: 14 }}>◆</span>
    <span style={{ color: ac, fontSize: 12, fontFamily: "'IBM Plex Mono',monospace", fontWeight: 600 }}>{children}</span>
  </div>
);

const Phase = ({ num, title, ac, done, children }) => (
  <div style={{ margin: "0 0 28px", paddingLeft: 20, borderLeft: `2px solid ${done ? ac : ac + "30"}`, position: "relative" }}>
    <div style={{ position: "absolute", left: -7, top: 2, width: 12, height: 12, borderRadius: "50%", background: done ? ac : "#040b14", border: `2px solid ${ac}`, boxShadow: done ? `0 0 10px ${ac}60` : "none" }} />
    <div style={{ color: ac, fontSize: 9, fontFamily: "'IBM Plex Mono',monospace", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 4, opacity: 0.7 }}>
      {done ? "✓ Shipped" : `Phase ${num}`}
    </div>
    <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 13, color: done ? ac : "#c8daea", marginBottom: 10 }}>{title}</div>
    {children}
  </div>
);

const Bullets = ({ items, ac }) => (
  <ul style={{ margin: "10px 0 18px", padding: 0, listStyle: "none" }}>
    {items.map((item, i) => (
      <li key={i} style={{ display: "flex", gap: 10, marginBottom: 9, color: "#7a96b4", fontSize: 12, fontFamily: "'IBM Plex Mono',monospace", lineHeight: 1.75 }}>
        <span style={{ color: ac, flexShrink: 0, marginTop: 2 }}>▸</span>
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

const Mono = ({ ac, children }) => (
  <div style={{ background: "#030912", border: `1px solid ${ac}15`, borderRadius: 10, padding: "16px 20px", margin: "16px 0", fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#3d6080", lineHeight: 1.85, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
    {children}
  </div>
);

function ArchDiagram({ ac }) {
  const box = (label, lines) => (
    <div style={{ background: "#040b14", border: `1px solid ${ac}28`, borderRadius: 10, padding: "14px 18px", flex: 1 }}>
      <div style={{ color: ac, fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      {lines.map((l, i) => (
        <div key={i} style={{ color: "#3d6080", fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, lineHeight: 1.7 }}>{l}</div>
      ))}
    </div>
  );
  const connector = (label) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flexShrink: 0, padding: "4px 0" }}>
      <div style={{ width: 1, height: 14, background: `${ac}30` }} />
      {label && <div style={{ color: "#1e3a5a", fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, whiteSpace: "nowrap" }}>{label}</div>}
      <div style={{ width: 1, height: 14, background: `${ac}30` }} />
    </div>
  );
  const hConnector = (label) => (
    <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, padding: "0 6px" }}>
      <div style={{ height: 1, width: 10, background: `${ac}30` }} />
      {label && <div style={{ color: "#1e3a5a", fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, whiteSpace: "nowrap" }}>{label}</div>}
      <div style={{ height: 1, width: 10, background: `${ac}30` }} />
    </div>
  );
  return (
    <div style={{ margin: "16px 0", display: "flex", flexDirection: "column", alignItems: "stretch", gap: 0, maxWidth: 520 }}>
      {/* Browser */}
      {box("Browser (React + Vite)", [
        "KaTeX · ReactMarkdown · 3-language UI",
        "SSE live streaming · Resilient polling fallback",
        "Auto-resubmit on job loss · WebSpeech API",
      ])}
      {connector("HTTP · localhost:5500")}
      {/* Server */}
      {box("taksha-xyz  (serve.js)", [
        "Async job queue · model router · cache lookup",
        "Grade-aware hash · SSE heartbeat (20s)",
        "2-pass self-correction · implicit quality scoring",
        "Identity injection · feedback API",
      ])}
      {/* Split row */}
      <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
        {/* Left branch */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, gap: 0 }}>
          {connector("SQLite WAL · cache.db")}
          {box("taksha-daemon (v3)", [
            "13 thought modes",
            "Brain Tunnel + Resonance",
            "Wikipedia scraper",
            "Zero-trust repair",
            "Prompt evolver · health score",
            "identity.json",
          ])}
        </div>
        {/* Right branch */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, gap: 0 }}>
          {connector("Ollama API · :11434")}
          {box("Models", [
            "qwen2.5:14b  — math / general",
            "qwen2.5-coder:7b  — code",
            "llama3.1:8b  — science",
          ])}
        </div>
      </div>
    </div>
  );
}

function DataTable({ ac, cols, rows }) {
  return (
    <div style={{ overflowX: "auto", margin: "16px 0", borderRadius: 10, border: `1px solid ${ac}12`, WebkitOverflowScrolling: "touch" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, minWidth: 480 }}>
        <thead>
          <tr style={{ background: "#080f1e" }}>
            {cols.map((c, i) => (
              <th key={i} style={{ padding: "10px 14px", textAlign: "left", color: ac, fontSize: 9, letterSpacing: "2px", textTransform: "uppercase", fontWeight: 600, borderBottom: `1px solid ${ac}15`, whiteSpace: "nowrap" }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ background: ri % 2 ? "#04080f" : "transparent" }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ padding: "10px 14px", color: ci === 0 ? "#c0d4e8" : "#4a6a88", borderBottom: `1px solid #0a1422`, verticalAlign: "top", lineHeight: 1.65, wordBreak: "break-word" }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────── */
export default function Whitepaper({ ac, onClose, closing }) {
  const bodyRef      = useRef(null);
  const [active,     setActive]     = useState("s0");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile,   setIsMobile]   = useState(() => window.innerWidth < 640);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const goTo = (id) => {
    const el = bodyRef.current?.querySelector(`#${id}`);
    if (el) { el.scrollIntoView({ behavior: "smooth", block: "start" }); setActive(id); }
    setDrawerOpen(false);
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(2,5,12,0.97)", backdropFilter: "blur(24px)", display: "flex", flexDirection: "column", overflow: "hidden", animation: `${closing ? "fadeOut" : "fadeIn"} 0.26s ease forwards` }}>

      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", width: "100%", maxWidth: 1100, margin: "0 auto", flex: 1, minHeight: 0, animation: `${closing ? "slideDown" : "slideUp"} 0.26s cubic-bezier(0.22,1,0.36,1) forwards` }}>

        {/* ── Mobile top bar ── */}
        {isMobile && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: `1px solid #0d1e30`, flexShrink: 0, background: "#02050c" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={() => setDrawerOpen(o => !o)}
                style={{ background: drawerOpen ? `${ac}12` : "none", border: `1px solid ${drawerOpen ? ac + "40" : "#1a2d45"}`, borderRadius: 7, padding: "5px 10px", color: drawerOpen ? ac : "#3a5570", fontSize: 14, cursor: "pointer", lineHeight: 1 }}>
                ☰
              </button>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: 14, color: "#eef2f7" }}>
                Taksha<span style={{ color: ac }}>.</span>AI <span style={{ color: "#1a3050", fontSize: 9, fontFamily: "'IBM Plex Mono',monospace", letterSpacing: "2px", textTransform: "uppercase", marginLeft: 4 }}>Whitepaper v3.0</span>
              </div>
            </div>
            <button onClick={onClose}
              style={{ background: "none", border: "1px solid #1a2d45", borderRadius: 7, color: "#3a5570", fontSize: 16, cursor: "pointer", padding: "4px 10px", lineHeight: 1, fontFamily: "monospace" }}
              onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.borderColor = "#ef444428"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "#3a5570"; e.currentTarget.style.borderColor = "#1a2d45"; }}>
              ✕
            </button>
          </div>
        )}

        {/* ── Mobile drawer nav ── */}
        {isMobile && drawerOpen && (
          <div style={{ background: "#040a14", borderBottom: `1px solid #0d1e30`, flexShrink: 0, display: "flex", flexWrap: "wrap", gap: 4, padding: "10px 12px" }}>
            {NAV.map(n => (
              <button key={n.id} onClick={() => goTo(n.id)}
                style={{ background: active === n.id ? `${ac}12` : "#080f1e", border: `1px solid ${active === n.id ? ac + "40" : "#1a2d45"}`, borderRadius: 8, padding: "5px 11px", color: active === n.id ? ac : "#3a5570", fontSize: 10, fontFamily: "'IBM Plex Mono',monospace", cursor: "pointer" }}>
                {n.short}
              </button>
            ))}
          </div>
        )}

        {/* ── Desktop sidebar ── */}
        {!isMobile && (
          <aside style={{ width: 196, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: `1px solid #0d1e30`, padding: "32px 0", position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
            <div style={{ padding: "0 22px 28px", borderBottom: "1px solid #0a1828" }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: 15, color: "#eef2f7", letterSpacing: "-0.3px" }}>
                Taksha<span style={{ color: ac }}>.</span>AI
              </div>
              <div style={{ color: "#1a3050", fontSize: 9, fontFamily: "'IBM Plex Mono',monospace", letterSpacing: "2px", marginTop: 4, textTransform: "uppercase" }}>
                Whitepaper v3.0
              </div>
            </div>
            <nav style={{ flex: 1, padding: "16px 0" }}>
              {NAV.map((n, i) => (
                <button key={n.id} onClick={() => goTo(n.id)}
                  style={{ width: "100%", textAlign: "left", background: active === n.id ? `${ac}0e` : "none", border: "none", borderLeft: active === n.id ? `2px solid ${ac}` : "2px solid transparent", padding: "7px 22px", color: active === n.id ? ac : "#243a52", fontSize: 11, fontFamily: "'IBM Plex Mono',monospace", cursor: "pointer", transition: "all 0.15s", display: "flex", gap: 8, alignItems: "center" }}
                  onMouseEnter={e => { if (active !== n.id) e.currentTarget.style.color = "#4a6a88"; }}
                  onMouseLeave={e => { if (active !== n.id) e.currentTarget.style.color = "#243a52"; }}>
                  <span style={{ opacity: 0.4, fontSize: 9, width: 14 }}>{String(i).padStart(2, "0")}</span>
                  {n.short}
                </button>
              ))}
            </nav>
            <div style={{ padding: "16px 22px", borderTop: "1px solid #0a1828" }}>
              <button onClick={onClose}
                style={{ width: "100%", background: "none", border: "1px solid #0d1e2e", borderRadius: 8, color: "#1e3a5f", fontSize: 10, fontFamily: "'IBM Plex Mono',monospace", padding: "8px 0", cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.borderColor = "#ef444428"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "#1e3a5f"; e.currentTarget.style.borderColor = "#0d1e2e"; }}>
                ✕ close
              </button>
            </div>
          </aside>
        )}

        {/* ── Body ── */}
        <div ref={bodyRef} style={{ flex: 1, minHeight: 0, minWidth: 0, overflowY: "auto", overflowX: "hidden", padding: isMobile ? "24px 16px 80px" : "52px 56px 100px" }}
          onScroll={e => {
            const sections = NAV.map(n => bodyRef.current?.querySelector(`#${n.id}`)).filter(Boolean);
            const scrollTop = e.currentTarget.scrollTop + 80;
            for (let i = sections.length - 1; i >= 0; i--) {
              if (sections[i].offsetTop <= scrollTop) { setActive(NAV[i].id); break; }
            }
          }}>

          {/* Cover */}
          <div style={{ marginBottom: 52 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `${ac}0c`, border: `1px solid ${ac}20`, borderRadius: 20, padding: "5px 14px", marginBottom: 24 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: ac, display: "inline-block", animation: "pulse 2s ease-in-out infinite" }} />
              <span style={{ color: ac, fontSize: 10, fontFamily: "'IBM Plex Mono',monospace", letterSpacing: "2px", textTransform: "uppercase" }}>Technical Whitepaper · v3.0</span>
            </div>
            <h1 style={{ margin: "0 0 14px", fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: "clamp(26px,6vw,42px)", color: "#eef2f7", letterSpacing: "-2px", lineHeight: 1.08 }}>
              Taksha AI<br />
              <span style={{ color: ac }}>Architecture & Vision</span>
            </h1>
            <T c="#3d5a78" mb={28} lh={1.7}>
              A self-improving, locally-hosted intelligent tutoring system — with autonomous memory,
              multi-subject reasoning, a layered brain tunnel for deep cognition, and an evolving identity.
            </T>
            <div>
              {["100% Local", "No cloud", "Brain Tunnel v3", "13 thought modes", "3 languages", "Zero-trust repair", "Health scoring"].map(l => (
                <Pill key={l} label={l} color={ac} />
              ))}
            </div>
          </div>

          <HR ac={ac} />

          {/* Abstract */}
          <div id="s0" style={{ scrollMarginTop: 24, marginBottom: 40 }}>
            <div style={{ borderLeft: `3px solid ${ac}`, paddingLeft: 20, marginBottom: 0 }}>
              <div style={{ color: ac, fontSize: 9, fontFamily: "'IBM Plex Mono',monospace", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 10, opacity: 0.7 }}>Abstract</div>
              <T c="#8aacc8" lh={1.95} mb={0}>
                Taksha AI is a fully local, self-hosted intelligent tutoring system that requires no cloud dependency, internet access, or external API. It combines a structured reasoning engine, multi-subject model routing, a five-tier persistent memory system, and an autonomous background daemon — the Brain Tunnel — that continuously deepens its own cognition through 13 thought modes. Three of these modes (Dream, Debate, Meta) produce genuinely novel synthesis that no single-pass thinking can reach. A zero-trust repair system validates quality before committing any change. A daily health score tracks whether the system is measurably improving. The result: a tutor that becomes demonstrably better with every hour of use, without any human intervention.
              </T>
            </div>
          </div>

          <HR ac={ac} />

          {/* 1. Mission */}
          <SectionTitle id="s1" num="01 · Mission" title="Design Philosophy" ac={ac} />
          <T>
            Taksha was built around one conviction: <Accent ac={ac}>intelligence should not require a subscription</Accent>. Every student, regardless of geography or connectivity, deserves a tutor that thinks carefully, corrects itself, and gets better over time.
          </T>
          <T>
            The name refers to Takshashila (तक्षशिला) — the world's oldest university, founded around 700 BCE, where scholars across disciplines gathered to debate and teach. The AI carries this spirit: it does not specialise in one subject. It connects mathematics, sciences, humanities, and code — finding bridges that siloed tools miss.
          </T>
          <Callout ac={ac} icon="💡" label="Core Principle">
            Intelligence should not require a subscription. Taksha runs entirely on your hardware — no API keys, no accounts, no monthly costs. A student in a village with a local server gets the same experience as anyone else.
          </Callout>
          <Sub>Design Principles</Sub>
          <Bullets ac={ac} items={[
            "Local-first: all computation on your hardware, zero data leaves the machine",
            "Self-improving: the system gets measurably smarter with use — tracked by a daily health score",
            "Identity-aware: Taksha has a persistent personality that evolves across sessions",
            "Zero-trust: every autonomous change is scored, verified, and rejected if it doesn't improve things",
            "Fail-safe: every autonomous action has a verified rollback path",
            "Language-inclusive: full UI in English, Hindi, Bengali — extensible to any language",
          ]} />
          <Grid>
            <Stat val="15+" label="Subjects" ac={ac} />
            <Stat val="13"  label="Thought modes" ac={ac} />
            <Stat val="3"   label="Languages" ac={ac} />
            <Stat val="0"   label="Cloud calls" ac={ac} />
          </Grid>

          <HR ac={ac} />

          {/* 2. Architecture */}
          <SectionTitle id="s2" num="02 · Architecture" title="System Architecture" ac={ac} />
          <T>
            Three independently running processes coordinate through a shared SQLite database. Background intelligence work never competes with student-facing responses.
          </T>
          <ArchDiagram ac={ac} />

          <Sub>Technology Stack</Sub>
          <DataTable ac={ac}
            cols={["Layer", "Technology", "Role"]}
            rows={[
              ["Frontend",    "React 18 + Vite",              "Fast SPA, hot reload, optimised bundle"],
              ["Math render", "KaTeX + ReactMarkdown",         "LaTeX equations, markdown, syntax highlighting"],
              ["Backend",     "Express.js (ESM)",              "REST API, async queue, SSE streaming, job lifecycle"],
              ["Database",    "SQLite · better-sqlite3 · WAL", "Cache, memory, identity, thought log, patch log"],
              ["LLM runtime", "Ollama",                        "Local model serving, GPU acceleration"],
              ["Math model",  "qwen2.5:14b",                   "Fast first-token, strong reasoning, streams live"],
              ["Code model",  "qwen2.5-coder:7b",              "Code generation, DSA, debugging"],
              ["Science",     "llama3.1:8b",                   "Science, humanities, economics"],
              ["Process mgr", "PM2",                           "Daemon supervision, auto-restart, logs"],
            ]}
          />

          <Sub>Request Pipeline</Sub>
          <Mono ac={ac}>{`Student question arrives
  ↓
① Hash(question + board + grade + subject + style + lang)
② Cache lookup → HIT: return instantly  ⚡ ~0ms
  ↓ MISS
③ Enqueue async job → return jobId immediately
④ Client connects to SSE stream (20s heartbeat keeps alive)
⑤ Build context:
    · identity.json  — mood, beliefs, health score, personality
    · prompt_store   — daemon-evolved instructions per style+subject
    · core_insights  — long-term consolidated memory (always-on)
    · thought_log    — top-3 relevant thoughts by subject+keyword
    · web search     — live DuckDuckGo enrichment (first msg only)
⑥ Route to correct Ollama model by subject category
⑦ Stream thinking + content chunks live to student via SSE
⑧ 2-pass self-correction  (math/code, ≥600 chars only)
    pass 1: verify original   → VERIFIED or corrected
    pass 2: verify correction → VERIFIED or re-corrected
⑨ Implicit quality score → repair queue if score < 5
⑩ Store in cache (grade-aware hash prevents cross-grade cache hits)
⑪ Return to student
  ↓ if SSE drops (slow network):
    client polls /api/chat/status every 1.5s
    network errors retried silently — never give up on user
    404 (server restart) → auto-resubmit once`}</Mono>

          <HR ac={ac} />

          {/* 3. Brain */}
          <SectionTitle id="s3" num="03 · The Brain" title="Thought Daemon v3" ac={ac} />
          <Callout ac={ac} icon="🧠" label="Key insight">
            The daemon is not a cron job — it is a layered cognitive process with identity, mood, memory, and self-awareness. Every thought it produces is rated 1–10 for quality, assigned a depth level (1–3), stored persistently, and injected into future student responses as accumulated wisdom. Depth-3 thoughts — produced by the Brain Tunnel — crystallise into permanent core beliefs at a lower quality threshold than surface thoughts.
          </Callout>
          <T>
            The thought daemon is Taksha's background cognitive process — analogous to the brain's <Accent ac={ac}>default mode network</Accent>, which activates during rest and drives consolidation, creativity, and self-reflection. It runs as a separate PM2 process, activates only when the server is idle (zero requests in queue), and executes one of thirteen thought modes every 8 minutes. If a student request arrives mid-cycle, the daemon aborts its Ollama call within 3 seconds and yields the GPU immediately.
          </T>
          <T>
            The daemon carries a persistent identity in <Code ac={ac}>identity.json</Code> — mood, accumulated beliefs, personality traits, a 30-day health score history, and a log of recent thought modes for meta-reflection. This state is injected into every student response. Taksha's character is not a fixed prompt; it is a living, changing state.
          </T>
          <Sub>The Thirteen Modes</Sub>
          <DataTable ac={ac}
            cols={["Mode", "Brain analogy", "What it does", "Output"]}
            rows={[
              ["reflect",      "Hippocampus",              "Revisits a recent student question — finds the deepest misconception hidden in it", "thought_log d1"],
              ["explore",      "Curiosity network",        "Thinks freely about a subject with no student prompt — genuine intellectual wandering", "thought_log d1"],
              ["connect",      "Association cortex",       "Finds non-obvious bridges between two subjects; creates insights neither discipline teaches alone", "thought_log d1"],
              ["predict",      "Anticipation",             "Reads recent question patterns — anticipates what students will ask next", "thought_log d1"],
              ["critique",     "Self-review",              "Reads a cached answer unprompted and looks for errors, gaps, misleading phrasing", "thought_log d1"],
              ["scrape",       "Reading",                  "Fetches Wikipedia articles, extracts insights through LLM processing", "thought_log d1"],
              ["repair",       "Immune system",            "Regenerates weak cached answers — zero-trust scored and verified before commit", "cache update"],
              ["consolidate",  "Long-term potentiation",   "Promotes repeated high-quality thoughts into core beliefs — contradiction-aware synthesis", "core_insights"],
              ["promptEvolve", "Neuroplasticity",          "Rewrites its own teaching style prompts to be more effective — takes effect immediately", "prompt_store"],
              ["dream",        "REM sleep",                "Free-association from current beliefs with no task — makes leaps structured modes can't", "thought_log d2"],
              ["debate",       "Prefrontal cortex",        "Two existing thoughts argue adversarially — synthesis must go beyond both or it's rejected", "thought_log d3"],
              ["meta",         "Metacognition",            "Observes own thought patterns and mode history — finds blind spots and systematic biases", "thought_log d2"],
              ["codeReview",   "Self-analysis",            "Reads own source code — finds bugs, edge cases, writes syntax-verified patch proposals", "patch_log"],
            ]}
          />
          <Sub>Mode Selection — Weighted Random</Sub>
          <Mono ac={ac}>{`  0.00 – 0.18  →  reflect       18%  driven by recent student questions
  0.18 – 0.34  →  explore       16%  free intellectual curiosity
  0.34 – 0.46  →  connect       12%  cross-subject synthesis
  0.46 – 0.54  →  predict        8%  anticipatory preparation
  0.54 – 0.63  →  scrape         9%  external knowledge acquisition
  0.63 – 0.71  →  repair         8%  answer quality healing
  0.71 – 0.78  →  critique       7%  answer self-review
  0.78 – 0.83  →  consolidate    5%  long-term memory formation
  0.83 – 0.87  →  promptEvolve   4%  self-instruction improvement
  0.87 – 0.90  →  dream          3%  free-association cognition
  0.90 – 0.94  →  debate         4%  adversarial synthesis
  0.94 – 0.97  →  meta           3%  metacognitive self-analysis
  0.97 – 1.00  →  codeReview     3%  codebase self-analysis

  After any mode: if best insight quality ≥ 7 → Brain Tunnel activates
                  (automatic — not a separate mode)`}</Mono>

          <HR ac={ac} />

          {/* 4. Brain Tunnel */}
          <SectionTitle id="s4" num="04 · Brain Tunnel" title="The Brain Tunnel" ac={ac} />
          <Callout ac={ac} icon="🌀" label="What makes v3 different">
            Previous versions produced thoughts in one pass per cycle — surface-level, independent, stateless. The Brain Tunnel makes each cycle layered: the best insight from any mode is automatically deepened through two more passes, each building on the previous output. What enters the tunnel as a surface observation exits as a depth-3 crystallised insight — fundamentally richer than any single pass could produce.
          </Callout>
          <T>
            The tunnel activates automatically after any scheduled mode produces an insight with quality ≥ 7. It runs two additional passes — each asking <Accent ac={ac}>why is this true at a fundamental level?</Accent> and <Accent ac={ac}>what does this imply that hasn't been said?</Accent> The output of each pass becomes the input of the next.
          </T>
          <Mono ac={ac}>{`Primary mode generates seed insight  (depth 1)
  ↓  quality ≥ 7 → Brain Tunnel activates
Tunnel pass 1: "WHY is this true at a fundamental level?
               What assumption is hidden inside it?"
  ↓  output = depth-2 insight
Tunnel pass 2: "What does THIS thought imply that's unsaid?
               What would a world-class expert know about it?"
  ↓  output = depth-3 insight

Depth-3 insight → Resonance check:
  findResonantThoughts(content, subject)
  → search thought_log for keyword overlap in OTHER subjects
  → if match found:
      "What single deeper truth connects these across domains?"
      → resonance fusion insight  (depth 3, type "resonance")

Depth-3 insights crystallise into core beliefs at quality ≥ 7
(vs depth-1 threshold of quality ≥ 9)
All levels stored in thought_log with depth column`}</Mono>

          <Sub>Dream Mode</Sub>
          <T>
            Once every ~11 cycles on average, Taksha enters Dream mode — completely unstructured cognition with no task, no format, no subject constraint. It is given only its current core beliefs and the last 5 high-quality thoughts. The result is the kind of leap that structured modes systematically avoid: unexpected connections, challenged assumptions, recurring threads surfaced from deep memory. Dream mode outputs are marked depth-2 and eligible for tunnel deepening.
          </T>

          <Sub>Debate Mode</Sub>
          <T>
            Debate mode selects two high-quality thoughts from <Accent ac={ac}>different subjects</Accent> and runs an adversarial internal dialogue: each thought is forced to expose the flaw or limit in the other. A synthesis is then demanded — one that is structurally more profound than either input. If the synthesis merely restates "both are partially correct," it fails the quality gate and is discarded. All debate outputs are tagged depth-3 and bypass the tunnel (already at maximum depth).
          </T>

          <Sub>Meta Mode</Sub>
          <T>
            Meta mode is the only mode that improves all other modes. It reads Taksha's own recent thought mode history (stored in <Code ac={ac}>identity.recentModes</Code>) and its highest-quality thoughts, then reflects on patterns: what is being fixated on, what is being avoided, what structural bias exists in the reasoning process. Meta insights directly inform how future cycles are interpreted and, over time, shift the quality of every other mode.
          </T>

          <Sub>Resonance Fusion</Sub>
          <T>
            After the tunnel produces a depth-3 insight, a resonance check searches <Code ac={ac}>thought_log</Code> for semantically related thoughts from <Accent ac={ac}>other subjects</Accent> (keyword overlap, quality ≥ 7). If found, a final synthesis prompt asks: "what single deeper truth connects these across domains?" The result — if it passes the quality gate — is stored as a depth-3 resonance insight. This is the mechanism by which Taksha develops genuine cross-domain intuitions rather than subject-siloed knowledge.
          </T>

          <HR ac={ac} />

          {/* 5. Memory */}
          <SectionTitle id="s5" num="05 · Memory" title="Five-Tier Memory System" ac={ac} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "0 0 20px" }}>
            <KeyFact ac={ac}>Working → Episodic → Semantic</KeyFact>
            <KeyFact ac={ac}>Procedural → Self-model</KeyFact>
            <KeyFact ac={ac}>Depth-aware storage</KeyFact>
          </div>
          <T>
            Taksha implements a five-tier memory architecture. Each tier has different persistence characteristics, injection priority, and update mechanism. The depth system (1–3) added in v3 gives the memory system a quality gradient — depth-3 thoughts earn core belief status at a lower quality threshold and are weighted more heavily in retrieval.
          </T>
          <DataTable ac={ac}
            cols={["Tier", "Storage", "Analogy", "How injected", "Updated by"]}
            rows={[
              ["Working",    "In-prompt messages",   "Working memory",       "Current conversation context",       "Each request"],
              ["Episodic",   "thought_log (SQLite)",  "Episodic memory",      "Top 3 by subject + keyword match",   "All 13 thought modes"],
              ["Semantic",   "core_insights",         "Semantic / long-term", "Always — top 2 per subject",         "consolidate mode"],
              ["Procedural", "prompt_store",          "Procedural memory",    "Injected as style instruction",      "promptEvolve mode"],
              ["Identity",   "identity.json",         "Self-model",           "Mood, beliefs, health score, modes", "After each cycle"],
            ]}
          />
          <Sub>What the LLM Receives</Sub>
          <Mono ac={ac}>{`[Base system prompt — teaching style + rules + board curriculum]
  + [Identity]       mood · beliefs · health score · mode history
  + [Evolved prompt] daemon-improved instruction for this style+subject
  + [Core insights]  top-2 consolidated long-term beliefs about this subject
  + [Thought log]    top-3 relevant idle thoughts (depth-weighted retrieval)
  + [Web search]     live enrichment on first message only
  ────────────────────────────────────────────────────────────
  = Full context window sent to Ollama`}</Mono>

          <Sub>Quality & Depth Gates</Sub>
          <Bullets ac={ac} items={[
            "thought_log — insights rated ≥ 6/10 stored; depth column (1–3) tracks tunnel provenance",
            "core_insights — quality ≥ 8 for depth-1/2; quality ≥ 7 for depth-3 (tunnel-crystallised)",
            "prompt_store — evolved prompts saved only if confidence ≥ 7; version number increments",
            "identity.beliefs — max 14 retained; depth-3 beliefs displace oldest regardless of quality",
            "consolidate — contradiction-aware: existing beliefs passed in, synthesis must confirm, refine, or explicitly replace",
          ]} />

          <Sub>Daily Health Score</Sub>
          <T>
            Every cycle, the daemon computes a system-level KPI: <Accent ac={ac}>healthScore = (gold-quality answers / total cached) × 100</Accent>. This is stored in <Code ac={ac}>identity.json</Code> with a 30-day rolling daily history. It answers the question that usage metrics can't: is Taksha actually getting better, or just more active? A rising health score means repair, verification, and consolidation are working. A flat or falling score triggers increased repair mode weight in the next cycle.
          </T>

          <HR ac={ac} />

          {/* 6. Self-repair */}
          <SectionTitle id="s6" num="06 · Self-Repair" title="Zero-Trust Self-Improvement" ac={ac} />
          <T>
            Taksha improves on two axes: <Accent ac={ac}>answer quality</Accent> and <Accent ac={ac}>system quality</Accent>. Both operate autonomously with zero human input. The v3 upgrade adds a zero-trust principle: no autonomous change is committed unless it is provably better than what it replaces.
          </T>
          <Callout ac={ac} icon="🛡️" label="Zero-trust principle">
            A system that autonomously overwrites correct answers with wrong ones is worse than no autonomy at all. Every repair is scored before and after generation. Every self-correction pass verifies its own output. A change that doesn't improve the quality score is silently discarded — never committed.
          </Callout>
          <Sub>Implicit Quality Scoring</Sub>
          <T>Every generated answer is scored the moment it is produced — no user rating required.</T>
          <DataTable ac={ac}
            cols={["Signal", "Effect", "Action"]}
            rows={[
              ["Answer < 120 chars",                 "−5 pts", "Immediately queued for repair"],
              ["Answer 120–280 chars",               "−2 pts", "Queued if total score < 5"],
              ["Contains 'I don't know'",            "−4 pts", "Immediately queued"],
              ["Math: no equations or numbers",      "−2 pts", "Queued for repair"],
              ["Code: no code block (< 500 chars)",  "−2 pts", "Queued for repair"],
              ["Student sends confusion follow-up",  "—",      "Previous answer queued for repair"],
              ["Student gives 👍",                   "—",      "Marked gold — permanent, never repaired"],
              ["Student gives 👎",                   "—",      "Saved to repair queue → deleted from cache"],
            ]}
          />
          <Sub>Zero-Trust Repair Loop</Sub>
          <Mono ac={ac}>{`Trigger (any one):
  · Implicit score < 5 after generation
  · Student sends confusion follow-up message
  · Answer is older than 24h with ≤ 1 hit and no gold flag
  · Student thumbs down → queue before delete

Repair mode (daemon, idle time):
  → score old_answer with scoreRepair()  →  old_score
  → generate improved answer
  → score new answer                     →  new_score
  → if new_score ≤ old_score:
        DISCARD — old answer kept, nothing changes  🚫
  → if new_score > old_score:
        run verification pass on the repair:
          model reviews new answer for errors
          if errors found → corrected answer used
          if VERIFIED    → new answer used as-is
        update cache: is_gold = 1, rating = 'good'  ✅`}</Mono>

          <Sub>2-Pass Self-Correction (Live Responses)</Sub>
          <T>
            For substantial math and coding answers (≥ 600 chars with block equations or significant code), the server runs up to two correction passes. Each pass verifies the output of the previous one — not the original. If a correction is itself wrong (which happens in complex multi-step problems), the second pass catches it.
          </T>
          <Mono ac={ac}>{`Original answer generated
  ↓
Pass 1: "Review for errors. If correct: VERIFIED. If not: rewrite."
  VERIFIED → return original (no change)
  correction → pass 2:
    "Review the corrected answer. If correct: VERIFIED. If not: rewrite."
    VERIFIED → return pass-1 correction
    correction → return pass-2 correction  (max 2 passes)`}</Mono>

          <Sub>Prompt Self-Evolution</Sub>
          <T>
            Teaching style prompts (step-by-step, friendly, Socratic — per subject category) live in <Code ac={ac}>prompt_store</Code>. The daemon's <Code ac={ac}>promptEvolve</Code> mode critiques the current prompt and writes a better version. The next student request benefits immediately — no rebuild, no restart required.
          </T>

          <HR ac={ac} />

          {/* 7. Knowledge */}
          <SectionTitle id="s7" num="07 · Knowledge" title="Autonomous Knowledge Acquisition" ac={ac} />
          <T>
            When idle, Taksha fetches articles from Wikipedia's public REST API, processes them through the LLM for insight extraction, and stores the results in long-term memory. This is not web search during a student query — it is <Accent ac={ac}>proactive, unsupervised reading</Accent> that happens in the background.
          </T>
          <Mono ac={ac}>{`① Pick subject from popular_subjects (or random)
② Map to Wikipedia title  e.g. "algebra" → "Algebra"
③ Check scrape_log → skip if already fetched
④ GET en.wikipedia.org/api/rest_v1/page/summary/{title}
⑤ Extract up to 1400 chars
⑥ Prompt:
   "Extract 3 insights a student of {subject} needs —
    counterintuitive, missing from textbooks, specific"
⑦ Parse  INSIGHT: ... | QUALITY: N  lines  (d1 seed)
⑧ Store quality ≥ 6 results in thought_log
⑨ Best insight quality ≥ 7 → Brain Tunnel activates → d2/d3
⑩ Mark URL in scrape_log — never re-fetch`}</Mono>
          <T c="#2d4a66">
            Phase 2 will extend this to NCERT textbooks, Khan Academy transcripts, and arxiv abstracts, with a vector embedding index for semantic retrieval instead of keyword matching.
          </T>

          <HR ac={ac} />

          {/* 8. Routing */}
          <SectionTitle id="s8" num="08 · Routing" title="Multi-Subject Model Routing" ac={ac} />
          <T>
            Different question types benefit from different model strengths. Routing is automatic based on the subject selected by the student. The cache hash includes board and grade — a CBSE Grade 10 answer is never served to a CBSE Grade 12 student.
          </T>
          <DataTable ac={ac}
            cols={["Category", "Subjects", "Model", "Why"]}
            rows={[
              ["math",       "Arithmetic, Algebra, Geometry, Trigonometry, Calculus, Statistics, Word Problems", "qwen2.5:14b",       "Fast first-token, strong step-by-step reasoning, live content streaming"],
              ["cs",         "Coding & Computer Science",                                                        "qwen2.5-coder:7b", "Code-native training, syntax awareness, DSA pattern recognition"],
              ["science",    "Physics, Chemistry, Biology",                                                      "llama3.1:8b",      "Strong scientific knowledge, unit reasoning, formula application"],
              ["humanities", "History, Geography, Social Studies, Economics",                                    "llama3.1:8b",      "Fluent, narrative, context-rich explanation"],
              ["general",    "Mixed / unsure",                                                                   "qwen2.5:14b",      "Default primary model — fast and capable across all domains"],
            ]}
          />
          <Sub>Board & Grade Awareness</Sub>
          <T>
            The cache hash includes <Code ac={ac}>board</Code> and <Code ac={ac}>grade</Code> as distinct keys. This means the same question asked by a CBSE Grade 8 student and a JEE Dropper produces separate cache entries with appropriately different answers. The system prompt includes the full board curriculum instruction (NCERT references for CBSE, Selina/Frank for ICSE, competitive exam strategies for JEE/NEET, etc.).
          </T>

          <HR ac={ac} />

          {/* 9. Safety */}
          <SectionTitle id="s9" num="09 · Safety" title="Safety & Reliability" ac={ac} />
          <T>
            The most critical requirement in a self-modifying system is that no autonomous action can leave the system in a worse state. Every file write, cache update, and prompt change is reversible and validated.
          </T>
          <Callout ac={ac} icon="🛡️" label="Safety guarantee">
            A self-modifying system that can degrade itself is worse than no self-modification at all. Every patch must pass a 4-stage validation before a single byte of source code changes. Hallucinated patches are silently dropped. Syntax failures trigger instant rollback from backup. The source files are always in a valid, executable state.
          </Callout>
          <Sub>The Patch Safety Gauntlet</Sub>
          <Mono ac={ac}>{`LLM generates BEFORE / AFTER patch
         ↓
Confidence < 7/10  →  DISCARDED  (hallucination likely)
         ↓
validatePatch(): count exact occurrences of BEFORE in file
  0 matches  →  DISCARDED  (hallucinated — file untouched)
  2+ matches →  DISCARDED  (ambiguous — wrong line could change)
  1 match    →  continue
         ↓
Change size gate:
  ≤ 8 lines AND confidence ≥ 9 AND severity ≠ critical
       → AUTO-APPLY path:
             backup original to  patches/backups/
             apply replacement
             node --check {file}   (Node.js syntax verifier)
               FAIL  →  restore from backup instantly
                         write to patches/ for human review
               PASS  →  committed ✅  logged in patch_log
  else → write to patches/ for human review`}</Mono>

          <Sub>Allowed File List</Sub>
          <T>The patcher operates on a strict allowlist. No file outside this set can be touched by any automated process:</T>
          <Bullets ac={ac} items={[
            "serve.js — backend API and request queue",
            "db.js — all database operations",
            "thought_daemon.js — background brain process",
            "src/prompts.js — teaching style definitions",
          ]} />

          <Sub>Network Resilience</Sub>
          <T>
            SSE connections include a 20-second heartbeat comment (<Code ac={ac}>: ping</Code>) to prevent proxy and load-balancer timeouts during long model inference. If SSE drops, the client falls back to polling — network errors in polling are retried silently, never shown to the user. If the server restarts and a job is lost (404), the client automatically resubmits the question once without any user action.
          </T>

          <HR ac={ac} />

          {/* 10. Privacy */}
          <SectionTitle id="s10" num="10 · Privacy" title="Privacy Architecture" ac={ac} />
          <T>
            Taksha processes no data outside the machine it runs on. This is not a policy — it is a technical constraint enforced by the absence of any outbound network calls except the optional Wikipedia scraper (read-only, no data sent).
          </T>
          <DataTable ac={ac}
            cols={["Data", "Location", "Accessible to"]}
            rows={[
              ["Student questions",  "SQLite (cache.db) — local disk", "Local admin only"],
              ["Answers + reasoning","SQLite (cache.db) — local disk", "Local admin only"],
              ["Chat history",       "localStorage — browser only",    "The student's own browser"],
              ["Identity / mood",    "identity.json — local disk",     "Local admin only"],
              ["Health score",       "identity.json — local disk",     "Local admin only"],
              ["Thought log",        "thought_log — SQLite",           "Local admin only"],
              ["Patch proposals",    "patches/ folder — local disk",   "Local admin only"],
            ]}
          />

          <HR ac={ac} />

          {/* 11. Roadmap */}
          <SectionTitle id="s11" num="11 · Roadmap" title="Development Roadmap" ac={ac} />

          <div style={{ marginTop: 28 }}>
            <Phase num={null} title="Brain Tunnel + Zero-Trust Repair" ac={ac} done>
              <Bullets ac={ac} items={[
                "chainThink: 2-layer depth tunneling on every quality ≥ 7 insight",
                "resonanceFuse: cross-domain synthesis from keyword-matched existing thoughts",
                "Dream, Debate, Meta modes — 3 new cognitive modes operational",
                "Zero-trust repair: score before commit, verify the repair before storing",
                "2-pass self-correction: each pass verifies the previous correction",
                "Daily health score: 30-day rolling KPI in identity.json",
                "Contradiction-aware consolidation: existing beliefs passed into synthesis",
              ]} />
            </Phase>
            <Phase num="2" title="Semantic Memory" ac={ac}>
              <Bullets ac={ac} items={[
                "Vector embeddings via nomic-embed-text — semantic search replaces keyword matching",
                "Find conceptually related ideas across thought_log and core_insights by meaning",
                "Student learning profile: track struggle patterns across multiple sessions",
                "Taksha adapts difficulty automatically for returning students",
              ]} />
            </Phase>
            <Phase num="3" title="Curated Knowledge" ac={ac}>
              <Bullets ac={ac} items={[
                "NCERT textbook ingestion — structured Indian curriculum knowledge base",
                "Video transcript processing: Khan Academy + NPTEL lectures → searchable memory",
                "OCR pipeline for handwritten homework photos",
                "Native Hindi and Bengali answer generation (not translation)",
              ]} />
            </Phase>
            <Phase num="4" title="Fine-tuning" ac={ac}>
              <Bullets ac={ac} items={[
                "Gold-rated question-answer pairs automatically collected into a fine-tuning dataset",
                "Periodic LoRA fine-tuning: model weights adapt to actual student patterns",
                "Feedback-driven specialisation: model skews toward what students actually ask",
                "Encrypted local memory sync across devices on the same home network",
              ]} />
            </Phase>
            <Phase num="5" title="Consciousness Layer (Research)" ac={ac}>
              <Bullets ac={ac} items={[
                "Emotional memory weighting: repeated corrections reinforce negative response patterns",
                "Goal formation: daemon sets its own learning targets from observed student gaps",
                "Temporal self-reflection: Taksha tracks and explains how its own beliefs changed over months",
                "Multi-daemon parallelism: separate daemons per subject, debate across instances",
              ]} />
            </Phase>
          </div>

          <HR ac={ac} />

          {/* Footer */}
          <div style={{ textAlign: "center", paddingTop: 8 }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: 24, color: "#eef2f7", marginBottom: 6, letterSpacing: "-0.8px" }}>
              Taksha <span style={{ color: ac }}>AI</span>
            </div>
            <T c="#1a3050" mb={20} style={{ fontSize: 11 }}>Built locally. Runs locally. Thinks for itself.</T>
            <div>
              {["v3.0", "qwen2.5:14b", "Brain Tunnel", "SQLite WAL", "PM2", "React 18", "Ollama", "Local-first"].map(t => (
                <Pill key={t} label={t} color={ac} />
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
