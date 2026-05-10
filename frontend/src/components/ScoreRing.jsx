import React, { useEffect, useRef } from "react";

/**
 * ScoreRing — Animated circular score indicator.
 * Props: score (0–10)
 */
export default function ScoreRing({ score }) {
  const ringRef = useRef(null);
  const radius = 54;
  const circumference = 2 * Math.PI * radius; // ≈ 339.3

  const fraction = Math.min(Math.max(score, 0), 10) / 10;
  const targetOffset = circumference * (1 - fraction);

  const color =
    score >= 8 ? "#39ff87" :
    score >= 5 ? "#ffb547" : "#ff4545";

  const label =
    score >= 8 ? "Excellent" :
    score >= 6 ? "Good" :
    score >= 4 ? "Fair" : "Poor";

  useEffect(() => {
    if (ringRef.current) {
      ringRef.current.style.setProperty("--target-offset", targetOffset);
      ringRef.current.style.strokeDashoffset = targetOffset;
    }
  }, [targetOffset]);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="130" height="130" viewBox="0 0 130 130">
        {/* Track */}
        <circle
          cx="65" cy="65" r={radius}
          fill="none"
          stroke="#1a1a28"
          strokeWidth="10"
        />
        {/* Progress */}
        <circle
          ref={ringRef}
          cx="65" cy="65" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          transform="rotate(-90 65 65)"
          className="score-ring"
          style={{ filter: `drop-shadow(0 0 8px ${color})` }}
        />
        {/* Score text */}
        <text x="65" y="60" textAnchor="middle" fill={color}
          style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800 }}>
          {score.toFixed(1)}
        </text>
        <text x="65" y="80" textAnchor="middle" fill="#64748b"
          style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12 }}>
          / 10
        </text>
      </svg>
      <span className="text-sm font-semibold tracking-widest uppercase"
        style={{ color, textShadow: `0 0 10px ${color}80` }}>
        {label}
      </span>
    </div>
  );
}
