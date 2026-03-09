export default function MockChat({ ac, t }) {
  const m = t?.mock || {
    subject: "📐 Geometry",
    question: "Explain the Pythagorean theorem",
    method: "Pythagorean Theorem",
    step: () => `In a right triangle, the square of the hypotenuse equals the sum of squares of the other two sides.`,
    formula: "a² + b² = c²",
    result: "where c is the hypotenuse",
    or: "or",
    placeholder: "Ask a math question...",
  };

  return (
    <div style={{ background: "#060d18", border: `1px solid ${ac}25`, borderRadius: 20, overflow: "hidden", boxShadow: `0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px ${ac}10`, fontFamily: "'IBM Plex Mono', monospace" }}>
      <div style={{ background: "#080f1e", borderBottom: `1px solid ${ac}15`, padding: "12px 16px", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${ac}22`, border: `1px solid ${ac}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>∑</div>
        <span style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 13 }}>Taksha AI</span>
        <span style={{ marginLeft: "auto", background: `${ac}15`, border: `1px solid ${ac}30`, borderRadius: 8, padding: "2px 9px", color: ac, fontSize: 10 }}>{m.subject}</span>
      </div>
      <div style={{ padding: "16px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{ background: "#0f1b2d", border: "1px solid #1e3a5f", borderRadius: "16px 4px 16px 16px", padding: "10px 14px", maxWidth: "80%" }}>
            <span style={{ color: "#7a96b8", fontSize: 12 }}>{m.question}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: `${ac}20`, border: `1px solid ${ac}35`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0, color: ac }}>🎓</div>
          <div style={{ background: "#080f1e", border: `1px solid ${ac}18`, borderRadius: "4px 16px 16px 16px", padding: "10px 14px", flex: 1 }}>
            <div style={{ color: "#dde6f0", fontSize: 11, lineHeight: 1.7 }}>
              <div style={{ color: ac, fontWeight: 700, marginBottom: 6, fontSize: 11 }}>{m.method}</div>
              <div style={{ marginBottom: 4 }}>{m.step()}</div>
              <div style={{ background: `${ac}08`, border: `1px solid ${ac}18`, borderRadius: 8, padding: "8px 12px", textAlign: "center", margin: "8px 0", fontFamily: "serif", fontSize: 15, color: ac, fontWeight: 700 }}>
                {m.formula}
              </div>
              <div style={{ color: "#4a6a88", fontSize: 11 }}>∴ {m.result}</div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${ac}12`, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, background: "#060d18" }}>
        <span style={{ color: "#1e3a5f", fontSize: 11, flex: 1 }}>{m.placeholder}</span>
        <span style={{ fontSize: 13 }}>📷</span>
        <span style={{ fontSize: 13 }}>🎤</span>
        <div style={{ background: ac, borderRadius: 8, padding: "5px 12px", fontSize: 11, color: "#040b14", fontWeight: 700 }}>↑</div>
      </div>
    </div>
  );
}
