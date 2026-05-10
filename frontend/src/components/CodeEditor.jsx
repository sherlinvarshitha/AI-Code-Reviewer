import React from "react";

const SAMPLE_CODE = `# Sample Python — try the analyzer!
import sqlite3

def get_user(username):
    # TODO: add input validation
    password = "admin123"  # hardcoded credential
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    # SQL injection risk!
    query = f"SELECT * FROM users WHERE username = '{username}'"
    cursor.execute(query)
    return cursor.fetchone()

def process_items(items):
    result = []
    for i in range(len(items)):
        for j in range(len(items)):
            if items[i] == items[j] and i != j:
                result.append(items[i])
    return result

try:
    data = get_user(input("Enter username: "))
    print(data)
except:
    pass
`;

/**
 * CodeEditor — Textarea for pasting code with line numbers overlay.
 */
export default function CodeEditor({ value, onChange }) {
  const lines = value.split("\n").length;

  return (
    <div className="relative rounded-xl overflow-hidden border border-carbon-600 bg-carbon-900 focus-within:border-electric/50 transition-colors duration-200">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-carbon-800 border-b border-carbon-600">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-neon-red/80" />
          <span className="w-3 h-3 rounded-full bg-neon-amber/80" />
          <span className="w-3 h-3 rounded-full bg-neon-green/80" />
        </div>
        <span className="text-xs font-mono text-slate-500">
          {lines} line{lines !== 1 ? "s" : ""}
        </span>
        <button
          onClick={() => onChange(SAMPLE_CODE)}
          className="text-xs font-mono text-slate-500 hover:text-electric transition-colors duration-150"
        >
          Load sample ↓
        </button>
      </div>

      {/* Editor */}
      <div className="flex">
        {/* Line numbers */}
        <div className="select-none py-4 px-3 text-right bg-carbon-900 border-r border-carbon-700 min-w-[3rem]"
          aria-hidden="true">
          {Array.from({ length: Math.max(lines, 1) }, (_, i) => (
            <div key={i} className="text-carbon-500 font-mono text-xs leading-[1.7] pr-1">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          className="code-editor flex-1 bg-transparent w-full px-4 py-4 text-slate-200 outline-none border-none"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="// Paste your code here or click 'Load sample' →"
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        />
      </div>
    </div>
  );
}
