import { Mafs, Coordinates, Plot, Point, Polygon, Circle, Line, Vector, Text } from "mafs";
import "mafs/core.css";
const FN_COLORS = ["#00ff87", "#60a5fa", "#f59e0b", "#a78bfa", "#f97316", "#ec4899"];

// Allowlist: only math-safe characters before eval — prevents XSS/injection
const SAFE_EXPR = /^[0-9x\s\+\-\*\/\(\)\.\*\^MathPIEsincotagbqrtloe\._ ]+$/;

function buildFn(expr) {
  const safe = expr
    .replace(/\^/g, "**")
    .replace(/\bsin\b/g, "Math.sin")
    .replace(/\bcos\b/g, "Math.cos")
    .replace(/\btan\b/g, "Math.tan")
    .replace(/\bsqrt\b/g, "Math.sqrt")
    .replace(/\babs\b/g, "Math.abs")
    .replace(/\bln\b/g, "Math.log")
    .replace(/\blog10\b/g, "Math.log10")
    .replace(/\blog\b/g, "Math.log10")
    .replace(/\bexp\b/g, "Math.exp")
    .replace(/\bpi\b/g, "Math.PI")
    .replace(/\be(?![a-zA-Z])/g, "Math.E");
  try {
    if (!SAFE_EXPR.test(safe)) { console.warn("[canvas] unsafe expression blocked:", expr.slice(0, 60)); return () => NaN; }
    return new Function("x", `"use strict"; try { const v = (${safe}); return isFinite(v) ? v : NaN; } catch { return NaN; }`);
  } catch {
    return () => NaN;
  }
}

function GraphCanvas({ data }) {
  const { functions = [], xRange = [-6, 6], yRange = [-6, 6], points = [], vlines = [], hlines = [] } = data;
  return (
    <Mafs viewBox={{ x: xRange, y: yRange }} preserveAspectRatio={false}>
      <Coordinates.Cartesian />
      {functions.map((fn, i) => (
        <Plot.OfX key={i} y={buildFn(fn)} color={FN_COLORS[i % FN_COLORS.length]} />
      ))}
      {points.map((p, i) => (
        <Point key={i} x={p.x} y={p.y} color={FN_COLORS[(i + 2) % FN_COLORS.length]} />
      ))}
      {vlines.map((x, i) => (
        <Line.ThroughPoints key={i} point1={[x, -100]} point2={[x, 100]} color="#1e3a5f" />
      ))}
      {hlines.map((y, i) => (
        <Line.ThroughPoints key={i} point1={[-100, y]} point2={[100, y]} color="#1e3a5f" />
      ))}
    </Mafs>
  );
}

function GeometryCanvas({ data }) {
  const { shapes = [], xRange = [-6, 6], yRange = [-6, 6] } = data;
  // Vertex labels: A, B, C, ... assigned per polygon point
  const VERTEX_LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let vertexIdx = 0;

  return (
    <Mafs viewBox={{ x: xRange, y: yRange }} preserveAspectRatio={false}>
      <Coordinates.Cartesian />
      {shapes.map((s, i) => {
        const color = FN_COLORS[i % FN_COLORS.length];
        const labelColor = "#7ab8e0";
        const offset = (xRange[1] - xRange[0]) * 0.055; // label offset scales to viewport

        if (s.kind === "polygon" && s.points) {
          // Render polygon + auto-label each vertex
          const labels = s.points.map((pt, j) => {
            const letter = s.labels?.[j] ?? VERTEX_LABELS[vertexIdx++ % 26];
            // Push label slightly away from centroid
            const cx = s.points.reduce((a, p) => a + p[0], 0) / s.points.length;
            const cy = s.points.reduce((a, p) => a + p[1], 0) / s.points.length;
            const dx = pt[0] - cx; const dy = pt[1] - cy;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            return (
              <Text key={`lbl-${i}-${j}`} x={pt[0] + (dx / len) * offset} y={pt[1] + (dy / len) * offset}
                color={labelColor} size={14}>
                {letter}
              </Text>
            );
          });
          return [<Polygon key={i} points={s.points} color={color} />, ...labels];
        }

        if (s.kind === "circle") {
          const cx = s.cx ?? 0; const cy = s.cy ?? 0; const r = s.r ?? 1;
          return [
            <Circle key={i} center={[cx, cy]} radius={r} color={color} />,
            // radius label at top of circle
            <Text key={`r-${i}`} x={cx + r / 2} y={cy + r + offset * 0.8} color={labelColor} size={12}>
              {s.label ?? `r=${r}`}
            </Text>,
          ];
        }

        if (s.kind === "point") {
          const letter = s.label ?? VERTEX_LABELS[vertexIdx++ % 26];
          return [
            <Point key={i} x={s.x} y={s.y} color={color} />,
            <Text key={`pt-${i}`} x={s.x + offset * 0.6} y={s.y + offset * 0.6} color={labelColor} size={13}>
              {letter}
            </Text>,
          ];
        }

        if (s.kind === "segment" && s.p1 && s.p2) {
          const mx = (s.p1[0] + s.p2[0]) / 2; const my = (s.p1[1] + s.p2[1]) / 2;
          const len = Math.sqrt((s.p2[0]-s.p1[0])**2 + (s.p2[1]-s.p1[1])**2);
          return [
            <Line.Segment key={i} point1={s.p1} point2={s.p2} color={color} />,
            s.label && <Text key={`seg-${i}`} x={mx} y={my + offset * 0.7} color={labelColor} size={12}>
              {s.label}
            </Text>,
          ];
        }

        if (s.kind === "line" && s.p1 && s.p2)   return <Line.ThroughPoints key={i} point1={s.p1} point2={s.p2} color={color} />;
        if (s.kind === "vector" && s.tail && s.tip) return <Vector key={i} tail={s.tail} tip={s.tip} color={color} />;
        if (s.kind === "label") return <Text key={i} x={s.x} y={s.y} color={s.color ?? labelColor} size={s.size ?? 14}>{s.text}</Text>;
        return null;
      })}
    </Mafs>
  );
}

export default function MathCanvas({ canvas, accentColor = "#00ff87", onClose }) {
  if (!canvas) return null;
  const { type, title } = canvas;
  const ac = accentColor;

  return (
    <div style={{
      position: "fixed", right: 0, top: 0, bottom: 0,
      width: "clamp(300px, 36vw, 460px)",
      background: "#050d1a",
      borderLeft: `1px solid ${ac}18`,
      display: "flex", flexDirection: "column",
      zIndex: 50,
      animation: "canvasIn 0.38s cubic-bezier(0.22,1,0.36,1) both",
      boxShadow: `-20px 0 80px rgba(0,0,0,0.8), -1px 0 0 ${ac}10`
    }}>
      <style>{`
        @keyframes canvasIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        .mc-close:hover { background: #2a0a0a !important; color: #ef4444 !important; border-color: #ef444440 !important; }
        /* Mafs dark theme overrides */
        .mc-mafs-wrap { --mafs-bg: #06101e; }
        .mc-mafs-wrap .mafs {
          background: #06101e !important;
          border-radius: 0 !important;
        }
        .mc-mafs-wrap svg text {
          fill: #2d4a66 !important;
          font-family: 'IBM Plex Mono', monospace !important;
          font-size: 11px !important;
        }
        .mc-mafs-wrap line[stroke="#cbd5e1"],
        .mc-mafs-wrap line[stroke="#e2e8f0"] {
          stroke: #0d1f33 !important;
        }
      `}</style>

      {/* Header */}
      <div style={{
        padding: "16px 18px",
        borderBottom: `1px solid ${ac}15`,
        display: "flex", alignItems: "center", gap: 12,
        flexShrink: 0,
        background: "rgba(5,13,26,0.95)",
        backdropFilter: "blur(16px)"
      }}>
        {/* Icon */}
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${ac}12`,
          border: `1px solid ${ac}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 17,
          boxShadow: `0 0 18px ${ac}20`
        }}>
          {type === "graph" ? "📈" : "📐"}
        </div>

        {/* Title */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            color: "#dde6f0", fontSize: 13,
            fontFamily: "'Syne', sans-serif", fontWeight: 700,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
          }}>
            {title || (type === "graph" ? "Function Graph" : "Geometry Diagram")}
          </div>
          <div style={{ color: `${ac}80`, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", marginTop: 1 }}>
            {type === "graph" ? "interactive plot" : "geometric diagram"} · scroll to zoom
          </div>
        </div>

        {/* Close */}
        <button className="mc-close" onClick={onClose} style={{
          background: "#0b1525", border: `1px solid #1e3a5f`,
          borderRadius: 8, color: "#4a6a8a",
          width: 30, height: 30,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, cursor: "pointer",
          transition: "all 0.2s", flexShrink: 0
        }}>
          ×
        </button>
      </div>

      {/* Legend for graphs */}
      {type === "graph" && canvas.functions?.length > 0 && (
        <div style={{
          padding: "10px 16px",
          borderBottom: `1px solid ${ac}10`,
          display: "flex", flexWrap: "wrap", gap: 7,
          flexShrink: 0,
          background: "#040b14"
        }}>
          {canvas.functions.map((fn, i) => (
            <span key={i} style={{
              display: "flex", alignItems: "center", gap: 7,
              background: `${FN_COLORS[i % FN_COLORS.length]}0e`,
              border: `1px solid ${FN_COLORS[i % FN_COLORS.length]}30`,
              borderRadius: 7, padding: "4px 10px"
            }}>
              <span style={{
                width: 14, height: 2.5, borderRadius: 2,
                background: FN_COLORS[i % FN_COLORS.length],
                display: "inline-block",
                boxShadow: `0 0 6px ${FN_COLORS[i % FN_COLORS.length]}80`
              }} />
              <span style={{
                color: FN_COLORS[i % FN_COLORS.length],
                fontSize: 11, fontFamily: "'IBM Plex Mono', monospace"
              }}>
                y = {fn}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Canvas area */}
      <div className="mc-mafs-wrap" style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {/* Subtle accent glow top-left */}
        <div style={{
          position: "absolute", top: 0, left: 0,
          width: 180, height: 180,
          background: `radial-gradient(circle, ${ac}08 0%, transparent 70%)`,
          pointerEvents: "none", zIndex: 1
        }} />
        {type === "graph"    && <GraphCanvas    data={canvas} />}
        {type === "geometry" && <GeometryCanvas data={canvas} />}
      </div>

      {/* Footer */}
      <div style={{
        padding: "10px 18px",
        borderTop: `1px solid ${ac}10`,
        flexShrink: 0,
        background: "#040b14",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 12
      }}>
        {[["⊕", "scroll to zoom"], ["⊹", "drag to pan"]].map(([icon, label]) => (
          <span key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ color: `${ac}60`, fontSize: 13 }}>{icon}</span>
            <span style={{ color: "#2d4a66", fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}>{label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
