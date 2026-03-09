import { useState, useEffect, useRef } from "react";

const T = {
  bg:      "#060d18",
  surface: "#0d1b2e",
  border:  "#1a2d47",
  green:   "#00ff87",
  blue:    "#60a5fa",
  purple:  "#a78bfa",
  amber:   "#f59e0b",
  orange:  "#f97316",
  pink:    "#ec4899",
  text:    "#e2e8f0",
  muted:   "#64748b",
};

// ── animated counter ───────────────────────────────────────────────────────
function Counter({ to, suffix = "", duration = 1800 }) {
  const ref = useRef(null);
  useEffect(() => {
    let start = null;
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      obs.disconnect();
      const step = (ts) => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        if (ref.current) ref.current.textContent = Math.round(ease * to).toLocaleString() + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to, suffix, duration]);
  return <span ref={ref}>0{suffix}</span>;
}

function Section({ children, style }) {
  return (
    <section style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px", ...style }}>
      {children}
    </section>
  );
}

function Card({ children, accent, style, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: T.surface,
        border: `1px solid ${accent || T.border}`,
        borderRadius: 16,
        padding: "28px 32px",
        boxShadow: accent ? `0 0 24px ${accent}18` : "none",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Pill({ children, color }) {
  return (
    <span style={{
      display: "inline-block",
      background: `${color}18`,
      color,
      border: `1px solid ${color}40`,
      borderRadius: 999,
      padding: "3px 12px",
      fontSize: 12,
      fontFamily: "IBM Plex Mono, monospace",
      letterSpacing: "0.05em",
    }}>
      {children}
    </span>
  );
}

function SectionHeading({ label, title, color }) {
  return (
    <div>
      <div style={{ fontSize: 11, color, letterSpacing: "0.15em", marginBottom: 10, textTransform: "uppercase" }}>
        {label}
      </div>
      <h2 style={{
        fontFamily: "Syne, sans-serif",
        fontWeight: 800,
        fontSize: "clamp(24px, 5vw, 36px)",
        margin: 0,
        color: T.text,
        letterSpacing: "-0.5px",
      }}>
        {title}
      </h2>
    </div>
  );
}

function FAQItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      onClick={() => setOpen(o => !o)}
      style={{
        background: T.surface,
        border: `1px solid ${open ? T.blue + "60" : T.border}`,
        borderRadius: 16,
        padding: "20px 28px",
        cursor: "pointer",
        transition: "border-color 0.2s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{question}</span>
        <span style={{
          color: T.blue,
          fontSize: 18,
          transform: open ? "rotate(45deg)" : "none",
          transition: "transform 0.2s",
          flexShrink: 0,
        }}>+</span>
      </div>
      {open && (
        <div style={{ fontSize: 13, color: T.muted, marginTop: 14, lineHeight: 1.8, borderTop: `1px solid ${T.border}`, paddingTop: 14 }}>
          {answer}
        </div>
      )}
    </div>
  );
}

// ── main page ──────────────────────────────────────────────────────────────
export default function Tokenomics() {
  return (
    <div style={{
      minHeight: "100vh",
      background: T.bg,
      color: T.text,
      fontFamily: "IBM Plex Mono, monospace",
      paddingBottom: 80,
    }}>

      {/* NAV */}
      <nav style={{
        borderBottom: `1px solid ${T.border}`,
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        background: `${T.bg}ee`,
        backdropFilter: "blur(12px)",
        zIndex: 100,
      }}>
        <a href="#/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 18, color: T.green }}>Taksha AI</span>
          <span style={{ color: T.muted, fontSize: 13 }}>/ tokenomics</span>
        </a>
        <a
          href="#/"
          style={{
            background: `${T.green}18`,
            color: T.green,
            border: `1px solid ${T.green}40`,
            borderRadius: 8,
            padding: "8px 20px",
            fontSize: 13,
            textDecoration: "none",
          }}
        >
          ← Back to Tutor
        </a>
      </nav>

      {/* HERO */}
      <Section style={{ paddingTop: 72, paddingBottom: 64, textAlign: "center" }}>
        <Pill color={T.green}>SOLANA SPL TOKEN</Pill>
        <h1 style={{
          fontFamily: "Syne, sans-serif",
          fontWeight: 800,
          fontSize: "clamp(56px, 12vw, 96px)",
          margin: "24px 0 0",
          lineHeight: 1,
          background: `linear-gradient(135deg, ${T.green}, ${T.blue})`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          letterSpacing: "-3px",
        }}>
          $MATH
        </h1>
        <p style={{
          fontSize: 17,
          color: T.muted,
          marginTop: 20,
          lineHeight: 1.8,
          maxWidth: 520,
          margin: "20px auto 0",
        }}>
          The native token of Taksha AI. Pay for Pro, burn supply, own a piece of the protocol.
        </p>

        {/* stat strip */}
        <div style={{ display: "flex", justifyContent: "center", gap: 48, marginTop: 56, flexWrap: "wrap" }}>
          {[
            { label: "TOTAL SUPPLY",  value: <><Counter to={1000000000} />+</>, accent: T.green },
            { label: "BURN RATE",     value: "80%",    accent: T.orange },
            { label: "CHAIN",         value: "Solana", accent: T.purple },
            { label: "TX FEE",        value: "~$0.001", accent: T.blue },
          ].map(({ label, value, accent }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: accent, fontFamily: "Syne, sans-serif" }}>{value}</div>
              <div style={{ fontSize: 10, color: T.muted, marginTop: 6, letterSpacing: "0.12em" }}>{label}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* BURN MECHANICS */}
      <Section style={{ paddingBottom: 64 }}>
        <SectionHeading label="PAYMENT FLOW" title="How Every Subscription Works" color={T.purple} />
        <Card accent={T.purple} style={{ marginTop: 32 }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 10 }}>Student pays Pro subscription</div>

            {/* price box */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
              <div style={{
                background: `${T.green}18`,
                color: T.green,
                border: `1px solid ${T.green}50`,
                borderRadius: 10,
                padding: "12px 28px",
                fontSize: 22,
                fontWeight: 800,
                fontFamily: "Syne, sans-serif",
              }}>
                $10 USD
              </div>
              <div style={{ color: T.muted, fontSize: 16 }}>=</div>
              <div style={{
                background: `${T.purple}20`,
                color: T.purple,
                border: `1px solid ${T.purple}50`,
                borderRadius: 10,
                padding: "12px 28px",
                fontSize: 16,
                fontWeight: 700,
              }}>
                X $MATH <span style={{ fontSize: 11, opacity: 0.7 }}>(live rate)</span>
              </div>
            </div>

            <div style={{
              fontSize: 11, color: T.muted, marginTop: 14, marginBottom: 20,
              background: `${T.border}80`, borderRadius: 8, padding: "8px 16px",
              display: "inline-block",
            }}>
              💡 If $MATH = $0.001 → you pay 10,000 $MATH · If $MATH = $0.01 → you pay 1,000 $MATH
            </div>

            <div style={{ fontSize: 22, color: T.muted, margin: "4px 0" }}>↓</div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 20 }}>Smart contract splits automatically — no human involved</div>
          </div>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {[
              { pct: "80%", tokens: "80% of X", label: "Burned Forever",   icon: "🔥", color: T.orange, desc: "Sent to null address. Permanently removed from supply." },
              { pct: "10%", tokens: "10% of X", label: "Creator Wallet",   icon: "👤", color: T.green,  desc: "Goes to Taksha AI. Can be held or sold anytime." },
              { pct: "10%", tokens: "10% of X", label: "Protocol Treasury",icon: "🏦", color: T.blue,   desc: "Reserved for development and community rewards." },
            ].map(({ pct, tokens, label, icon, color, desc }) => (
              <div key={label} style={{
                flex: "1 1 180px",
                background: `${color}0d`,
                border: `1px solid ${color}30`,
                borderRadius: 14,
                padding: "20px 16px",
                textAlign: "center",
              }}>
                <div style={{ fontSize: 30 }}>{icon}</div>
                <div style={{ fontSize: 34, fontWeight: 800, color, fontFamily: "Syne, sans-serif", marginTop: 10 }}>{pct}</div>
                <div style={{ fontSize: 12, color, marginTop: 2 }}>{tokens} $MATH</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginTop: 12 }}>{label}</div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 6, lineHeight: 1.7 }}>{desc}</div>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      {/* DEFLATIONARY */}
      <Section style={{ paddingBottom: 64 }}>
        <SectionHeading label="SUPPLY DYNAMICS" title="Deflationary by Design" color={T.orange} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginTop: 32 }}>
          {[
            { step: "01", title: "Fixed Supply",       body: "1,000,000,000 $MATH minted once. No inflation. No new tokens ever printed.", color: T.blue },
            { step: "02", title: "Every Payment Burns", body: "80% of tokens paid for any subscription are destroyed permanently.", color: T.orange },
            { step: "03", title: "Scarcity Grows",     body: "As users grow and tokens burn, each remaining token represents a larger share of total supply.", color: T.green },
          ].map(({ step, title, body, color }) => (
            <Card key={step} style={{ position: "relative", overflow: "hidden" }}>
              <div style={{
                position: "absolute", top: 12, right: 16,
                fontSize: 52, fontFamily: "Syne, sans-serif", fontWeight: 800,
                color: `${color}12`, lineHeight: 1, pointerEvents: "none",
              }}>{step}</div>
              <div style={{ fontSize: 11, color, letterSpacing: "0.12em", marginBottom: 10 }}>STEP {step}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 10 }}>{title}</div>
              <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.7 }}>{body}</div>
            </Card>
          ))}
        </div>

        {/* burn table */}
        <Card style={{ marginTop: 24, padding: "24px 20px" }}>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 20 }}>
            Burn simulation — subscription = $10 USD, $MATH price = $0.001 (10,000 $MATH/sub), 1B total supply:
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 520 }}>
              <thead>
                <tr>
                  {["Subscribers", "Tokens Burned", "Supply Burned", "Remaining"].map(h => (
                    <th key={h} style={{
                      textAlign: "left", padding: "8px 14px",
                      color: T.muted, borderBottom: `1px solid ${T.border}`,
                      fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  [1_000,    8_000_000,    0.80,  992_000_000],
                  [10_000,   80_000_000,   8.00,  920_000_000],
                  [50_000,   400_000_000, 40.00,  600_000_000],
                  [100_000,  800_000_000, 80.00,  200_000_000],
                  [125_000,  1_000_000_000,100.00,          0],
                ].map(([subs, burned, pct, rem]) => (
                  <tr key={subs} style={{ borderBottom: `1px solid ${T.border}22` }}>
                    <td style={{ padding: "10px 14px", color: T.blue }}>{subs.toLocaleString()}</td>
                    <td style={{ padding: "10px 14px", color: T.orange }}>{burned.toLocaleString()}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ background: `${T.orange}18`, color: T.orange, borderRadius: 4, padding: "2px 8px", fontSize: 12 }}>
                        {pct.toFixed(2)}%
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", color: T.green }}>{rem.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Section>

      {/* TOKEN ALLOCATION */}
      <Section style={{ paddingBottom: 64 }}>
        <SectionHeading label="ALLOCATION" title="Token Distribution" color={T.blue} />

        {/* pump.fun explainer */}
        <Card accent={T.blue} style={{ marginTop: 32, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <span style={{ fontSize: 24 }}>🎯</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Launched on pump.fun</div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>Fair launch — no presale, no VC allocation, no team tokens</div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.8 }}>
            pump.fun uses a bonding curve — the price rises automatically as more people buy.
            No one gets tokens early or cheap. Everyone buys at the same fair market price.
            When the bonding curve fills (~$69k market cap), the token graduates to Raydium automatically.
          </div>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {[
            {
              label: "Bonding Curve (Public Sale)",
              pct: 80,
              color: T.green,
              note: "Sold to buyers on pump.fun via bonding curve. Price increases with each purchase.",
              icon: "📈",
            },
            {
              label: "Raydium Liquidity (Auto at Graduation)",
              pct: 20,
              color: T.blue,
              note: "When market cap hits ~$69k, pump.fun automatically seeds a Raydium pool with these tokens + collected SOL.",
              icon: "💧",
            },
          ].map(({ label, pct, color, note, icon }) => (
            <div key={label}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, fontSize: 13 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span>{icon}</span>
                  <span>{label}</span>
                </span>
                <span style={{ color, fontWeight: 700 }}>{pct}%</span>
              </div>
              <div style={{ height: 10, background: T.border, borderRadius: 4, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${pct}%`,
                  background: `linear-gradient(90deg, ${color}, ${color}80)`,
                  borderRadius: 4,
                }} />
              </div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 5 }}>{note}</div>
            </div>
          ))}
        </div>

        {/* what fair launch means */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginTop: 24 }}>
          {[
            { icon: "🚫", label: "No Presale",     desc: "Nobody bought cheap before launch", color: T.orange },
            { icon: "🚫", label: "No Team Tokens", desc: "Zero founder allocation at launch",  color: T.orange },
            { icon: "✅", label: "Fair Price",      desc: "Everyone buys on the same curve",    color: T.green  },
            { icon: "✅", label: "Open Trading",    desc: "Tradeable on Jupiter after launch",  color: T.green  },
          ].map(({ icon, label, desc, color }) => (
            <div key={label} style={{
              background: `${color}08`,
              border: `1px solid ${color}25`,
              borderRadius: 12,
              padding: "14px 16px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color }}>{label}</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 4, lineHeight: 1.5 }}>{desc}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* HOW TO BUY */}
      <Section style={{ paddingBottom: 64 }}>
        <SectionHeading label="GUIDE" title="How to Get $MATH" color={T.green} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 16, marginTop: 32 }}>
          {[
            { n: "1", icon: "👻", title: "Get Phantom",      body: "Download the free Phantom wallet. Available on Chrome, iOS & Android. Takes 2 minutes.", color: T.purple },
            { n: "2", icon: "◎",  title: "Buy SOL",          body: "Buy SOL with your debit card inside Phantom or on Coinbase. ~$5 covers fees.", color: T.blue },
            { n: "3", icon: "🎯", title: "Buy on pump.fun",  body: "Go to pump.fun, search $MATH, buy with SOL on the bonding curve. After graduation, trade on Jupiter.", color: T.amber },
            { n: "4", icon: "✅", title: "Subscribe",        body: "Connect wallet on Taksha AI, click Unlock Pro, approve in Phantom. 60 seconds total.", color: T.green },
          ].map(({ n, icon, title, body, color }) => (
            <Card key={n} accent={color}>
              <div style={{
                width: 30, height: 30, background: `${color}20`, border: `1px solid ${color}50`,
                borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, color, fontWeight: 700, marginBottom: 16,
              }}>{n}</div>
              <div style={{ fontSize: 22, marginBottom: 10 }}>{icon}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 8 }}>{title}</div>
              <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.7 }}>{body}</div>
            </Card>
          ))}
        </div>
      </Section>

      {/* ROADMAP */}
      <Section style={{ paddingBottom: 64 }}>
        <SectionHeading label="ROADMAP" title="Launch Phases" color={T.amber} />
        <div style={{ marginTop: 32, position: "relative" }}>
          <div style={{
            position: "absolute", left: 19, top: 20, bottom: 20, width: 2,
            background: `linear-gradient(180deg, ${T.green}, ${T.blue}, ${T.purple}, ${T.amber})`,
            borderRadius: 2,
          }} />
          {[
            {
              phase: "Phase 1", status: "LIVE NOW", color: T.green,
              title: "Build The Product",
              items: ["AI math tutor live ✅", "Multi-subject support ✅", "Daily active user growth"],
            },
            {
              phase: "Phase 2", status: "UPCOMING", color: T.blue,
              title: "Token Launch",
              items: ["Mint $MATH on Solana", "Deploy subscription smart contract", "Seed $80 liquidity on Raydium"],
            },
            {
              phase: "Phase 3", status: "GROWTH", color: T.purple,
              title: "Scale & Burn",
              items: ["10,000 subs = 80% of supply burned", "Jupiter listing after graduation", "Referral reward program"],
            },
            {
              phase: "Phase 4", status: "FUTURE", color: T.amber,
              title: "Protocol Expansion",
              items: ["Token holder governance voting", "Premium course marketplace", "Community content rewards"],
            },
          ].map(({ phase, status, color, title, items }, i) => (
            <div key={phase} style={{ display: "flex", gap: 24, marginBottom: 28, alignItems: "flex-start" }}>
              <div style={{
                width: 40, height: 40, minWidth: 40,
                border: `2px solid ${color}`, borderRadius: "50%",
                background: T.bg,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, color, fontWeight: 700, position: "relative", zIndex: 1,
              }}>{i + 1}</div>
              <Card style={{ flex: 1, padding: "20px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color }}>{phase}</span>
                  <Pill color={color}>{status}</Pill>
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 12 }}>{title}</div>
                {items.map(item => (
                  <div key={item} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.muted, marginBottom: 6 }}>
                    <span style={{ color, fontSize: 9 }}>▸</span>
                    {item}
                  </div>
                ))}
              </Card>
            </div>
          ))}
        </div>
      </Section>

      {/* FAQ */}
      <Section style={{ paddingBottom: 80 }}>
        <SectionHeading label="FAQ" title="Common Questions" color={T.pink} />
        <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            {
              q: "Do I need crypto experience to subscribe?",
              a: "No. If you can use a banking app, you can use Phantom. The whole process takes about 5 minutes the first time.",
            },
            {
              q: "What if the price of $MATH goes up or down?",
              a: "The subscription is always $10 USD worth of $MATH — the token amount adjusts dynamically with price. If $MATH = $0.001 you pay 10,000 tokens. If $MATH = $0.10 you pay 100 tokens. Students always pay $10, regardless of token price.",
            },
            {
              q: "Can I get a refund?",
              a: "Blockchain transactions are irreversible — tokens are burned the moment you subscribe. There are no refunds, similar to how arcade tokens can't be returned once used.",
            },
            {
              q: "Where can I see the smart contract?",
              a: "Once deployed, the contract address will be published here and verifiable on Solana Explorer. All code is open source on GitHub.",
            },
            {
              q: "How is this different from a rug pull?",
              a: "The smart contract auto-runs the 80/10/10 split — not even the creator can change it after deployment. Team tokens have a 6-month cliff + 3-year vesting schedule. Liquidity is locked.",
            },
          ].map(faq => (
            <FAQItem key={faq.q} question={faq.q} answer={faq.a} />
          ))}
        </div>
      </Section>

      {/* FOOTER */}
      <footer style={{
        borderTop: `1px solid ${T.border}`,
        padding: "32px 24px",
        textAlign: "center",
      }}>
        <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 20, color: T.green }}>Taksha AI</div>
        <div style={{ fontSize: 12, color: T.muted, marginTop: 8 }}>$MATH token · Built on Solana · Not financial advice</div>
        <div style={{ fontSize: 11, color: `${T.muted}70`, marginTop: 8, maxWidth: 480, margin: "10px auto 0", lineHeight: 1.7 }}>
          Cryptocurrency involves significant risk. Token value may go to zero. Only spend what you are willing to lose entirely.
        </div>
      </footer>
    </div>
  );
}
