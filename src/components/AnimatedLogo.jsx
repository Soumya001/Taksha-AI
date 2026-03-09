export default function AnimatedLogo({ color, size = 52 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <defs>
        <radialGradient id="tl-bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.18"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.02"/>
        </radialGradient>
        <filter id="tl-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Background */}
      <rect width="64" height="64" rx="14" fill="#040b14"/>
      <rect width="64" height="64" rx="14" fill="url(#tl-bg)"/>

      {/* Outer border */}
      <rect x="1" y="1" width="62" height="62" rx="13.5" stroke={color} strokeOpacity="0.22" strokeWidth="1"/>

      {/* Spinning dashed ring */}
      <rect x="4" y="4" width="56" height="56" rx="11"
        stroke={color} strokeOpacity="0.45" strokeWidth="1.2"
        strokeDasharray="8 5" strokeLinecap="round"
        style={{ transformOrigin: "32px 32px", animation: "tl-spin 8s linear infinite" }}/>

      {/* Outer glow circle */}
      <circle cx="32" cy="32" r="24" stroke={color} strokeOpacity="0.12" strokeWidth="0.8"/>

      {/* T — horizontal bar (draws in) */}
      <rect x="14" y="19" width="36" height="7" rx="3.5" fill={color}
        style={{ transformOrigin: "32px 22.5px", animation: "tl-scaleX 0.6s cubic-bezier(0.22,1,0.36,1) 0.15s both" }}/>

      {/* T — vertical bar (draws in with delay) */}
      <rect x="28.5" y="19" width="7" height="28" rx="3.5" fill={color}
        style={{ transformOrigin: "32px 33px", animation: "tl-scaleY 0.6s cubic-bezier(0.22,1,0.36,1) 0.35s both" }}/>

      {/* Orbiting dot */}
      <circle r="3.5" fill={color} filter="url(#tl-glow)">
        <animateMotion dur="3s" repeatCount="indefinite"
          path="M8,32 a24,24 0 1,1 48,0 a24,24 0 1,1 -48,0"/>
      </circle>

      {/* Small trailing dot */}
      <circle r="2" fill={color} opacity="0.5">
        <animateMotion dur="3s" repeatCount="indefinite" begin="-1.5s"
          path="M8,32 a24,24 0 1,1 48,0 a24,24 0 1,1 -48,0"/>
      </circle>

      {/* Corner accent dots */}
      <circle cx="50" cy="50" r="2.8" fill={color} fillOpacity="0.55"
        style={{ animation: "tl-pulse 2.5s ease-in-out infinite" }}/>
      <circle cx="14" cy="50" r="1.8" fill={color} fillOpacity="0.3"
        style={{ animation: "tl-pulse 2.5s ease-in-out 0.8s infinite" }}/>

      <style>{`
        @keyframes tl-spin   { to { transform: rotate(360deg); } }
        @keyframes tl-scaleX { from { transform: scaleX(0); opacity: 0; } to { transform: scaleX(1); opacity: 1; } }
        @keyframes tl-scaleY { from { transform: scaleY(0); opacity: 0; } to { transform: scaleY(1); opacity: 1; } }
        @keyframes tl-pulse  { 0%,100% { opacity: 0.55; } 50% { opacity: 0.15; } }
      `}</style>
    </svg>
  );
}
