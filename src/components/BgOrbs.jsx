import { memo } from "react";

const BgOrbs = memo(function BgOrbs({ color }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "10%", left: "20%", width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(circle, ${color}0e 0%, transparent 70%)`, animation: "orbDrift1 18s ease-in-out infinite", willChange: "transform" }} />
      <div style={{ position: "absolute", top: "50%", right: "10%", width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(circle, ${color}08 0%, transparent 70%)`, animation: "orbDrift2 24s ease-in-out infinite", willChange: "transform" }} />
      <div style={{ position: "absolute", bottom: "10%", left: "40%", width: 300, height: 300, borderRadius: "50%", background: `radial-gradient(circle, ${color}06 0%, transparent 70%)`, animation: "orbDrift3 14s ease-in-out infinite", willChange: "transform" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${color}06 1px, transparent 1px), linear-gradient(90deg, ${color}06 1px, transparent 1px)`, backgroundSize: "44px 44px" }} />
    </div>
  );
});

export default BgOrbs;
