import React, { useState, useEffect, useCallback } from "react";
import CodeEditor from "./components/CodeEditor";
import ResultsPanel from "./components/ResultsPanel";
import { analyzeCode, analyzeGitHub, healthCheck } from "./utils/api";

/* ─────────────────────────────────────────────
   Scanning animation overlay (visual feedback)
   Used while analysis is running
   ───────────────────────────────────────────── */
function ScanningOverlay() {
  return (
    <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none z-10">
      <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-electric to-transparent opacity-70 animate-scanning" />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Loading skeleton shown during AI analysis
   Gives user feedback while waiting for results
   ───────────────────────────────────────────── */
function AnalyzingState() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-5 h-5 border-2 border-electric border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-mono text-electric">Analyzing code…</span>
      </div>

      {[80, 60, 70, 50].map((w, i) => (
        <div
          key={i}
          className="h-4 rounded-lg bg-carbon-700 animate-pulse"
          style={{
            width: `${w}%`,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Application Component
   CodeScanAI - AI-powered code review tool
   ───────────────────────────────────────────── */
export default function App() {
  const [code, setCode] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [mode, setMode] = useState("code"); // code | github
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [aiAvailable, setAiAvailable] = useState(null);

  /* ─────────────────────────────────────────────
     Health check on app load
     Checks if backend + Claude AI service is active
     ───────────────────────────────────────────── */
  useEffect(() => {
    healthCheck()
      .then(data => {
        setAiAvailable(data.ai_available);
      })
      .catch(() => {
        setAiAvailable(false);
      });
  }, []);

  /* ─────────────────────────────────────────────
     Main analysis handler
     Supports both:
     - Code snippet analysis
     - GitHub repo analysis
     
     Claude AI is used in backend (if enabled)
     ───────────────────────────────────────────── */
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
      const data =
        mode === "github"
          ? await analyzeGitHub(githubUrl.trim())
          : await analyzeCode(code);

      setResult(data);
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        "Unable to connect to analysis service. Please ensure backend is running.";

      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [mode, code, githubUrl]);

  /* Keyboard shortcut: Ctrl/Cmd + Enter triggers analysis */
  useEffect(() => {
    const handler = e => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        handleAnalyze();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleAnalyze]);

  return (
    <div className="grain min-h-screen bg-carbon-950">

      {/* Background decorative effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-electric/5 blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-80 h-80 rounded-full bg-neon-green/4 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full bg-neon-pink/3 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* ───────── Header Section ───────── */}
        <header className="mb-10 animate-fade-in">

          {/* App Logo */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-electric/10 border border-electric/30 flex items-center justify-center glow-electric">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-electric">
                <path
                  d="M9 3L3 9l6 6M15 3l6 6-6 6M13 5l-2 14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              <span className="text-white">Code</span>
              <span className="text-electric">Scan</span>
              <span className="text-slate-500 text-lg ml-2 font-normal">AI</span>
            </h1>
          </div>

          {/* Description */}
          <p className="text-slate-500 text-sm max-w-xl font-body">
            Detect bugs, security issues, and code quality problems in your project.
            {" "}
            <kbd className="bg-carbon-700 text-slate-400 text-xs px-1.5 py-0.5 rounded font-mono border border-carbon-500">
              ⌘ Enter
            </kbd>{" "}
            to analyze.
          </p>

          {/* AI status indicator (Claude AI backend status) */}
          {aiAvailable !== null && (
            <div
              className={`inline-flex items-center gap-1.5 mt-3 text-xs font-mono px-2 py-1 rounded-full border ${
                aiAvailable
                  ? "text-neon-green border-neon-green/30 bg-neon-green/5"
                  : "text-neon-amber border-neon-amber/30 bg-neon-amber/5"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  aiAvailable ? "bg-neon-green animate-pulse" : "bg-neon-amber"
                }`}
              />
              {/* Claude AI backend integration status */}
            </div>
          )}
        </header>

        {/* ───────── Main Layout ───────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* Left Panel - Input Section */}
          <div className="space-y-4">

            {/* Mode Switch */}
            <div className="flex gap-1 p-1 bg-carbon-800 border border-carbon-600 rounded-xl w-fit">
              {[
                { key: "code", label: "📋 Code Snippet" },
                { key: "github", label: "🐙 GitHub Repo" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => {
                    setMode(key);
                    setResult(null);
                    setError("");
                  }}
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

            {/* Code Editor */}
            {mode === "code" && (
              <div className="relative">
                {loading && <ScanningOverlay />}
                <CodeEditor value={code} onChange={setCode} />
              </div>
            )}

            {/* GitHub Input */}
            {mode === "github" && (
              <div className="space-y-3">
                <div className="relative rounded-xl border border-carbon-600 bg-carbon-900 px-4 py-3">
                  {loading && <ScanningOverlay />}

                  <input
                    type="url"
                    value={githubUrl}
                    onChange={e => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/owner/repository"
                    className="w-full bg-transparent text-slate-200 outline-none font-mono text-sm"
                  />
                </div>
              </div>
            )}

            {/* Analyze Button */}
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-xl font-bold transition-all duration-200"
            >
              {loading ? "Analyzing..." : "Analyze Code"}
            </button>

            {/* Error */}
            {error && (
              <div className="text-red-400 text-sm">{error}</div>
            )}
          </div>

          {/* Right Panel - Results */}
          <div>
            {loading && <AnalyzingState />}

            {!loading && result && (
              <ResultsPanel result={result} />
            )}

            {!loading && !result && (
              <div className="text-center text-slate-500">
                Paste code or GitHub repo to start analysis
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-xs text-slate-600">
          CodeScan AI • React + Backend + AI Analysis
          {/* Claude AI powered backend integration */}
        </footer>
      </div>
    </div>
  );
}