import React, { useState, useEffect, useCallback } from "react";
import CodeEditor from "./components/CodeEditor";
import ResultsPanel from "./components/ResultsPanel";
import { analyzeCode, analyzeGitHub, healthCheck } from "./utils/api";

/* ── Scanning animation overlay ─────────────────────────────────── */
function ScanningOverlay() {
  return (
    <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none z-10">
      <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-electric to-transparent opacity-70 animate-scanning" />
    </div>
  );
}

/* ── Loading skeleton ────────────────────────────────────────────── */
function AnalyzingState() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-5 h-5 border-2 border-electric border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-mono text-electric">Analyzing code…</span>
      </div>
      {[80, 60, 70, 50].map((w, i) => (
        <div key={i} className="h-4 rounded-lg bg-carbon-700 animate-pulse" style={{ width: `${w}%`, animationDelay: `${i * 0.1}s` }} />
      ))}
    </div>
  );
}

/* ── Main App ────────────────────────────────────────────────────── */
export default function App() {
  const [code, setCode] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [mode, setMode] = useState("code"); // "code" | "github"
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [aiAvailable, setAiAvailable] = useState(null);

  // Check backend health on mount
  useEffect(() => {
    healthCheck()
      .then(data => setAiAvailable(data.ai_available))
      .catch(() => setAiAvailable(false));
  }, []);

  const handleAnalyze = useCallback(async () => {
    setError("");
    setResult(null);

    if (mode === "code" && !code.trim()) {
      setError("Please paste some code before analyzing.");
      return;
    }
    if (mode === "github" && !githubUrl.trim()) {
      setError("Please enter a GitHub repository URL.");
      return;
    }

    setLoading(true);
    try {
      const data = mode === "github"
        ? await analyzeGitHub(githubUrl.trim())
        : await analyzeCode(code);
      setResult(data);
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to connect to the analysis server. Make sure the backend is running on port 5000.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [mode, code, githubUrl]);

  // Keyboard shortcut: Ctrl/Cmd + Enter
  useEffect(() => {
    const handler = e => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleAnalyze();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleAnalyze]);

  return (
    <div className="grain min-h-screen bg-carbon-950">
      {/* ── Ambient background blobs ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-electric/5 blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-80 h-80 rounded-full bg-neon-green/4 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full bg-neon-pink/3 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* ── Header ── */}
        <header className="mb-10 animate-fade-in">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-electric/10 border border-electric/30 flex items-center justify-center glow-electric">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-electric">
                <path d="M9 3L3 9l6 6M15 3l6 6-6 6M13 5l-2 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              <span className="text-white">Code</span>
              <span className="text-electric">Scan</span>
              <span className="text-slate-500 text-lg ml-2 font-normal">AI</span>
            </h1>
          </div>
          <p className="text-slate-500 text-sm max-w-xl font-body">
            Detect bugs, security vulnerabilities, and code quality issues with AI-powered static analysis.
            {" "}<kbd className="bg-carbon-700 text-slate-400 text-xs px-1.5 py-0.5 rounded font-mono border border-carbon-500">⌘ Enter</kbd>
            {" "}to analyze.
          </p>

          {/* AI status badge */}
          {aiAvailable !== null && (
            <div className={`inline-flex items-center gap-1.5 mt-3 text-xs font-mono px-2 py-1 rounded-full border ${
              aiAvailable
                ? "text-neon-green border-neon-green/30 bg-neon-green/5"
                : "text-neon-amber border-neon-amber/30 bg-neon-amber/5"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${aiAvailable ? "bg-neon-green animate-pulse" : "bg-neon-amber"}`} />
              {aiAvailable ? "Claude AI connected" : "Demo mode — add ANTHROPIC_API_KEY for AI analysis"}
            </div>
          )}
        </header>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* ── Left: Input panel ── */}
          <div className="space-y-4">

            {/* Mode toggle */}
            <div className="flex gap-1 p-1 bg-carbon-800 border border-carbon-600 rounded-xl w-fit">
              {[{ key: "code", label: "📋 Code Snippet" }, { key: "github", label: "🐙 GitHub Repo" }].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => { setMode(key); setResult(null); setError(""); }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    mode === key
                      ? "bg-electric text-carbon-950 font-semibold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Code input */}
            {mode === "code" && (
              <div className="relative">
                {loading && <ScanningOverlay />}
                <CodeEditor value={code} onChange={setCode} />
              </div>
            )}

            {/* GitHub URL input */}
            {mode === "github" && (
              <div className="space-y-3">
                <div className={`relative rounded-xl border transition-colors duration-200 ${loading ? "border-electric/50" : "border-carbon-600 focus-within:border-electric/50"} bg-carbon-900`}>
                  {loading && <ScanningOverlay />}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-slate-500 flex-shrink-0">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                    </svg>
                    <input
                      type="url"
                      value={githubUrl}
                      onChange={e => setGithubUrl(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleAnalyze()}
                      placeholder="https://github.com/owner/repository"
                      className="flex-1 bg-transparent text-slate-200 outline-none font-mono text-sm placeholder-slate-600"
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-600 font-mono pl-1">
                  Analyzes up to 5 source files • Public repos only (or set GITHUB_TOKEN for private)
                </p>
              </div>
            )}

            {/* Analyze button */}
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-xl font-display font-bold text-base tracking-wide transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
              style={{
                background: loading ? "#1a1a28" : "linear-gradient(135deg, #6ee7f7 0%, #3bbdd4 100%)",
                color: loading ? "#6ee7f7" : "#050508",
                boxShadow: loading ? "none" : "0 0 30px rgba(110,231,247,0.3)",
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-electric border-t-transparent rounded-full animate-spin" />
                  Analyzing…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                    <path d="m21 21-4.35-4.35M11 8v6M8 11h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Analyze Code
                </span>
              )}
            </button>

            {/* Error message */}
            {error && (
              <div className="flex gap-2 p-4 rounded-xl bg-neon-red/10 border border-neon-red/30 animate-fade-in">
                <span className="text-neon-red flex-shrink-0 mt-0.5">✕</span>
                <p className="text-sm text-neon-red">{error}</p>
              </div>
            )}
          </div>

          {/* ── Right: Results panel ── */}
          <div className="min-h-[400px]">
            {loading && (
              <div className="p-6 rounded-xl bg-carbon-800 border border-carbon-600">
                <AnalyzingState />
              </div>
            )}
            {!loading && result && (
              <div className="p-6 rounded-xl bg-carbon-800 border border-carbon-600">
                <ResultsPanel result={result} />
              </div>
            )}
            {!loading && !result && (
              <div className="h-full flex flex-col items-center justify-center p-10 rounded-xl border border-dashed border-carbon-600 text-center gap-3">
                <div className="w-14 h-14 rounded-full bg-carbon-800 border border-carbon-600 flex items-center justify-center text-2xl">
                  🔍
                </div>
                <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
                  Paste your code or enter a GitHub URL and click{" "}
                  <strong className="text-slate-400">Analyze Code</strong> to see detailed results here.
                </p>
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  {["Bug Detection", "Security Scan", "Complexity", "Best Practices"].map(tag => (
                    <span key={tag} className="text-xs font-mono text-slate-600 bg-carbon-800 border border-carbon-600 px-2 py-1 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <footer className="mt-12 pt-6 border-t border-carbon-700 text-center">
          <p className="text-xs text-slate-600 font-mono">
            CodeScan AI — Powered by Claude • Built with React + Flask
          </p>
        </footer>
      </div>
    </div>
  );
}
