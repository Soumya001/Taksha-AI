import { useEffect, useRef, useState } from "react";

const PROBLEMS = [
  {
    tag: "Algebra · Quadratics",
    title: "Solve: x² − 5x + 6 = 0",
    steps: [
      { label: "Method",        text: "Factor — find two numbers that multiply to 6 and add to −5" },
      { label: "Factor",        math: "(x − 2)(x − 3) = 0" },
      { label: "Zero product",  text: "Set each factor equal to zero" },
      { label: "Solutions",     math: "x = 2    or    x = 3" },
      { label: "Verification",  text: "2² − 5(2) + 6 = 4 − 10 + 6 = 0  ✓" },
    ],
  },
  {
    tag: "Geometry · Pythagoras",
    title: "Right triangle: a = 3, b = 4. Find c",
    steps: [
      { label: "Theorem",       math: "a² + b² = c²" },
      { label: "Substitute",    math: "3² + 4² = c²" },
      { label: "Calculate",     math: "9 + 16 = 25" },
      { label: "Result",        math: "c = √25 = 5" },
      { label: "Verified",      text: "The hypotenuse of a 3-4-5 right triangle is 5  ✓" },
    ],
  },
  {
    tag: "Calculus · Derivatives",
    title: "Differentiate: f(x) = x³ + 2x",
    steps: [
      { label: "Power rule",    text: "d/dx [xⁿ] = n · xⁿ⁻¹ for each term" },
      { label: "Term 1",        math: "d/dx [x³] = 3x²" },
      { label: "Term 2",        math: "d/dx [2x] = 2" },
      { label: "Answer",        math: "f′(x) = 3x² + 2" },
    ],
  },
  {
    tag: "Statistics · Mean",
    title: "Find the mean of: 4, 7, 13, 2, 9",
    steps: [
      { label: "Formula",       math: "Mean = Σx / n" },
      { label: "Sum",           math: "4 + 7 + 13 + 2 + 9 = 35" },
      { label: "Count",         text: "There are 5 values (n = 5)" },
      { label: "Mean",          math: "35 ÷ 5 = 7" },
    ],
  },
];

const STEP_DELAY = 820;   // ms between steps
const END_PAUSE  = 2800;  // ms before cycling to next problem

export default function AnimatedSolution({ ac }) {
  const [probIdx,  setProbIdx]  = useState(0);
  const [visible,  setVisible]  = useState(0);
  const [done,     setDone]     = useState(false);
  const [fadingOut,setFadingOut]= useState(false);
  const scrollRef = useRef(null);

  const prob  = PROBLEMS[probIdx];
  const total = prob.steps.length;

  // Reveal steps one by one
  useEffect(() => {
    setVisible(0);
    setDone(false);
    setFadingOut(false);

    let step = 0;
    const tick = () => {
      step++;
      setVisible(step);
      setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, 50);
      if (step < total) {
        t = setTimeout(tick, STEP_DELAY);
      } else {
        setDone(true);
        t = setTimeout(() => {
          setFadingOut(true);
          setTimeout(() => {
            setProbIdx(i => (i + 1) % PROBLEMS.length);
          }, 400);
        }, END_PAUSE);
      }
    };
    let t = setTimeout(tick, 500);
    return () => clearTimeout(t);
  }, [probIdx, total]);

  return (
    <div style={{
      background: "#060d18",
      border: `1px solid ${ac}28`,
      borderRadius: 20,
      overflow: "hidden",
      boxShadow: `0 24px 60px rgba(0,0,0,0.55), 0 0 0 1px ${ac}0a`,
      fontFamily: "'IBM Plex Mono', monospace",
      opacity: fadingOut ? 0 : 1,
      transition: "opacity 0.36s ease",  /* opacity only — no transform so card never moves */
    }}>

      {/* Problem header */}
      <div style={{ background: "#080f1e", borderBottom: `1px solid ${ac}12`, padding: "14px 18px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: "50%", background: `${ac}20`, border: `1px solid ${ac}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, animation: "glowPulse 2.5s ease-in-out infinite" }}>🎓</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{prob.title}</div>
          <div style={{ color: ac, fontSize: 9, opacity: 0.65, marginTop: 2, letterSpacing: "0.5px" }}>{prob.tag}</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00ff87", display: "inline-block", animation: "pulse 2s ease-in-out infinite" }} />
          <span style={{ color: "#1e3a5f", fontSize: 9 }}>solving</span>
        </div>
      </div>

      {/* Steps — fixed height so card never grows */}
      <div ref={scrollRef} style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10, height: 240, overflowY: "auto", scrollbarWidth: "none" }}>
        {prob.steps.slice(0, visible).map((step, i) => (
          <div key={`${probIdx}-${i}`}
            style={{ animation: "slideUp 0.35s cubic-bezier(0.22,1,0.36,1) both" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              {/* Step number */}
              <span style={{ color: ac, fontSize: 9, opacity: 0.5, flexShrink: 0, minWidth: 16, textAlign: "right" }}>{i + 1}.</span>
              {/* Label */}
              <span style={{ color: "#1e4060", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.8px", flexShrink: 0 }}>{step.label}</span>
            </div>

            {step.math ? (
              <div style={{
                marginTop: 6, marginLeft: 24,
                background: `${ac}08`, border: `1px solid ${ac}18`,
                borderRadius: 10, padding: "9px 14px",
                textAlign: "center", fontFamily: "serif",
                fontSize: 16, color: ac, fontWeight: 700, letterSpacing: "0.5px",
              }}>
                {step.math}
                {i === visible - 1 && !done && (
                  <span style={{ display: "inline-block", width: 2, height: 16, background: ac, marginLeft: 4, verticalAlign: "middle", animation: "pulse 0.8s ease-in-out infinite" }} />
                )}
              </div>
            ) : (
              <div style={{ marginTop: 4, marginLeft: 24, color: "#4a6a88", fontSize: 12, lineHeight: 1.6 }}>
                {step.text}
                {i === visible - 1 && !done && (
                  <span style={{ display: "inline-block", width: 2, height: 13, background: ac, marginLeft: 3, verticalAlign: "middle", animation: "pulse 0.8s ease-in-out infinite" }} />
                )}
              </div>
            )}
          </div>
        ))}

        {/* Placeholder dots while waiting for first step */}
        {visible === 0 && (
          <div style={{ display: "flex", gap: 5, alignItems: "center", paddingTop: 8, paddingLeft: 4 }}>
            {[0, 1, 2].map(i => (
              <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: ac, opacity: 0.4, display: "inline-block", animation: `bounce 1.2s ease-in-out ${i * 0.18}s infinite` }} />
            ))}
          </div>
        )}
      </div>

      {/* Footer — fixed height, badge always rendered (visibility toggled) */}
      <div style={{ borderTop: `1px solid ${ac}10`, padding: "10px 18px", display: "flex", alignItems: "center", gap: 8, background: "#050c17", height: 42 }}>
        <span style={{ color: "#0f1e30", fontSize: 10, flex: 1 }}>Ask your own question below...</span>
        <span style={{ background: `${ac}15`, border: `1px solid ${ac}30`, borderRadius: 7, padding: "2px 10px", color: ac, fontSize: 9, visibility: done ? "visible" : "hidden", transition: "opacity 0.3s ease", opacity: done ? 1 : 0 }}>
          ✓ solved
        </span>
      </div>
    </div>
  );
}
