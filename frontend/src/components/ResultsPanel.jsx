import React, { useState } from "react";
import ScoreRing from "./ScoreRing";
import IssueCard from "./IssueCard";

const TABS = ["Overview", "Issues", "Security", "Suggestions"];

/**
 * ResultsPanel — Full analysis output display.
 */
export default function ResultsPanel({ result }) {
  const [tab, setTab] = useState("Overview");

  const {
    score = 0,
    complexity = "Unknown",
    summary = "",
    issues = [],
    security_issues = [],
    suggestions = [],
    ai_powered = false,
    repo_meta,
  } = result;

  const counts = {
    Overview: null,
    Issues: issues.length,
    Security: security_issues.length,
    Suggestions: suggestions.length,
  };

  return (
    <div className="animate-slide-up">
      {/* AI badge */}
      <div className="flex items-center gap-2 mb-6">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono font-semibold border ${
          ai_powered
            ? "bg-neon-green/10 border-neon-green/30 text-neon-green"
            : "bg-neon-amber/10 border-neon-amber/30 text-neon-amber"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${ai_powered ? "bg-neon-green animate-pulse" : "bg-neon-amber"}`} />
          {ai_powered ? "AI-Powered Analysis" : "Rule-Based Analysis"}
        </div>
      </div>

      {/* Repo meta */}
      {repo_meta && (
        <div className="mb-6 p-4 rounded-xl bg-carbon-800 border border-carbon-600 animate-fade-in">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📦</span>
            <div>
              <h3 className="font-display font-bold text-electric">{repo_meta.name}</h3>
              {repo_meta.description && (
                <p className="text-sm text-slate-400 mt-0.5">{repo_meta.description}</p>
              )}
              <div className="flex gap-4 mt-2 text-xs text-slate-500 font-mono">
                {repo_meta.language && <span>🔤 {repo_meta.language}</span>}
                {repo_meta.stars != null && <span>⭐ {repo_meta.stars.toLocaleString()}</span>}
              </div>
              {repo_meta.analyzed_files?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {repo_meta.analyzed_files.map(f => (
                    <span key={f} className="text-xs font-mono bg-carbon-700 text-slate-400 px-2 py-0.5 rounded">
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Score + Complexity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="flex flex-col items-center justify-center p-6 rounded-xl bg-carbon-800 border border-carbon-600 glow-electric">
          <ScoreRing score={score} />
        </div>
        <div className="flex flex-col justify-center gap-4 p-6 rounded-xl bg-carbon-800 border border-carbon-600">
          <div>
            <p className="text-xs text-slate-500 font-mono uppercase tracking-widest mb-1">Time Complexity</p>
            <p className="text-lg font-mono font-bold text-electric">{complexity}</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Issues", count: issues.length, color: "text-neon-amber" },
              { label: "Security", count: security_issues.length, color: "text-neon-red" },
              { label: "Tips", count: suggestions.length, color: "text-neon-green" },
            ].map(({ label, count, color }) => (
              <div key={label} className="text-center p-2 rounded-lg bg-carbon-700">
                <p className={`text-xl font-display font-bold ${color}`}>{count}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div className="mb-6 p-4 rounded-xl bg-carbon-800 border border-carbon-600 border-l-2 border-l-electric">
          <p className="text-sm text-slate-300 leading-relaxed">{summary}</p>
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex gap-1 mb-4 p-1 rounded-xl bg-carbon-800 border border-carbon-600">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              tab === t
                ? "bg-electric text-carbon-950 font-semibold shadow-lg"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {t}
            {counts[t] !== null && counts[t] > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono ${
                tab === t ? "bg-carbon-950/30 text-carbon-950" : "bg-carbon-700 text-slate-400"
              }`}>
                {counts[t]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="space-y-3 min-h-[120px]">

        {tab === "Overview" && (
          <div className="grid gap-3">
            {[...security_issues.filter(i => i.severity === "critical"), ...issues.slice(0, 2)].length === 0 ? (
              <EmptyState icon="✅" text="No critical findings. Great code!" />
            ) : (
              [...security_issues.filter(i => i.severity === "critical"), ...issues.slice(0, 2)]
                .map((item, idx) => <IssueCard key={idx} item={item} type="mixed" />)
            )}
          </div>
        )}

        {tab === "Issues" && (
          issues.length === 0
            ? <EmptyState icon="🎉" text="No issues detected!" />
            : issues.map((item, idx) => <IssueCard key={idx} item={item} type="issue" />)
        )}

        {tab === "Security" && (
          security_issues.length === 0
            ? <EmptyState icon="🔒" text="No security issues found!" />
            : security_issues.map((item, idx) => <IssueCard key={idx} item={item} type="security" />)
        )}

        {tab === "Suggestions" && (
          suggestions.length === 0
            ? <EmptyState icon="💡" text="Nothing to suggest — code looks clean!" />
            : suggestions.map((tip, idx) => (
                <div key={idx} className="flex gap-3 p-4 rounded-lg bg-carbon-800 border border-carbon-600 animate-fade-in">
                  <span className="text-neon-green text-lg flex-shrink-0">→</span>
                  <p className="text-sm text-slate-300 leading-relaxed">{tip}</p>
                </div>
              ))
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-500 animate-fade-in">
      <span className="text-4xl mb-3">{icon}</span>
      <p className="text-sm font-medium">{text}</p>
    </div>
  );
}
