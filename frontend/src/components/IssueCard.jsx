import React, { useState } from "react";

const SEVERITY_CONFIG = {
  critical: { label: "CRITICAL", bg: "bg-red-950/60", border: "border-neon-red/40", text: "text-neon-red", dot: "bg-neon-red" },
  high:     { label: "HIGH",     bg: "bg-orange-950/60", border: "border-orange-400/40", text: "text-orange-400", dot: "bg-orange-400" },
  warning:  { label: "WARN",     bg: "bg-yellow-950/60", border: "border-neon-amber/40", text: "text-neon-amber", dot: "bg-neon-amber" },
  info:     { label: "INFO",     bg: "bg-blue-950/60", border: "border-blue-400/40", text: "text-blue-400", dot: "bg-blue-400" },
};

/**
 * IssueCard — Displays a single issue or security finding.
 */
export default function IssueCard({ item, type }) {
  const [open, setOpen] = useState(false);
  const cfg = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG.info;

  return (
    <div
      className={`rounded-lg border ${cfg.bg} ${cfg.border} p-4 cursor-pointer transition-all duration-200 hover:brightness-110 animate-fade-in`}
      onClick={() => setOpen(!open)}
    >
      <div className="flex items-start gap-3">
        <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`}
          style={{ boxShadow: `0 0 6px currentColor` }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-mono font-bold tracking-widest ${cfg.text}`}>
              {cfg.label}
            </span>
            {item.line && (
              <span className="text-xs font-mono text-slate-500">Line {item.line}</span>
            )}
            {type === "security" && (
              <span className="text-xs font-mono text-neon-pink bg-neon-pink/10 px-1.5 py-0.5 rounded">
                SECURITY
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-300 leading-relaxed">{item.message}</p>
          {open && item.code && (
            <pre className="mt-3 p-3 rounded-md bg-carbon-900 border border-carbon-600 text-xs font-mono text-electric overflow-x-auto whitespace-pre-wrap">
              {item.code}
            </pre>
          )}
        </div>
        {item.code && (
          <span className="text-slate-600 text-xs flex-shrink-0 mt-1">
            {open ? "▲" : "▼"}
          </span>
        )}
      </div>
    </div>
  );
}
