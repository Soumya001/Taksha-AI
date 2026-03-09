import { memo } from "react";

const TypingIndicator = memo(function TypingIndicator({ color }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "14px 20px" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: color, animation: `typingWave 1.4s ease-in-out ${i * 0.18}s infinite`, willChange: "transform" }} />
      ))}
    </div>
  );
});

export default TypingIndicator;
