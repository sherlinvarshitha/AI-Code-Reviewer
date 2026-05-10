"""
AI Code Reviewer - Flask Backend
Analyzes code for bugs, security issues, complexity, and quality.
Uses Claude API for AI-powered analysis.
"""

import os
import json
import re
import base64
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")

# ---------------------------------------------------------------------------
# Score deduction constants — centralised so they're easy to tune
# ---------------------------------------------------------------------------
DEDUCT = {"syntax_error":        4.0,   # BUG FIX: was never checked before
    "credential_hardcoded": 2.5,  # BUG FIX: was 2, too small
    "sql_injection":        1.5,  # BUG FIX: was 1
    "eval_usage":           1.5,  # BUG FIX: was 1
    "bare_except":          0.75, # BUG FIX: was 0.5
    "high_complexity":      1.5,  # BUG FIX: was 1
    "long_lines":           0.25, # unchanged (info-level)
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def call_claude(prompt: str) -> str:
    """Call the Anthropic Messages API and return the text response."""
    if not ANTHROPIC_API_KEY:
        return None

    headers = {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    payload = {
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 2048,
        "messages": [{"role": "user", "content": prompt}],
    }
    resp = requests.post(
        "https://api.anthropic.com/v1/messages",
        headers=headers,
        json=payload,
        timeout=60,
    )
    resp.raise_for_status()
    data = resp.json()
    return data["content"][0]["text"]


# ---------------------------------------------------------------------------
# FIX 1: mock_analyze — completely rewritten scoring with correct deductions
# ---------------------------------------------------------------------------

def mock_analyze(code: str) -> dict:
    """
    Rule-based analysis used when no API key is configured, or as fallback.

    SCORING RULES (all deductions are cumulative, floor is 0):
      - Syntax error detected     : -4.0   (hard fail)
      - Each hardcoded credential : -2.5
      - SQL injection pattern     : -1.5
      - eval() usage              : -1.5
      - Bare except clause        : -0.75
      - High cyclomatic complexity: -1.5
      - Long lines (>120 chars)   : -0.25

    Only clean code that passes every check finishes near 10/10.
    """
    issues = []
    suggestions = []
    security_issues = []

    # ── FIX 2: Start with exactly 10.0 and track deductions explicitly ──
    score = 10.0
    lines = code.splitlines()

    # ── FIX 3: Syntax check (was completely missing before) ─────────────
    # Only attempt for Python-like code; skip for JS/other languages
    is_python = bool(
        re.search(r'\bdef\s+\w+\s*\(', code) or
        re.search(r'\bimport\s+\w+', code) or
        re.search(r'\bprint\s*\(', code)
    )
    syntax_ok = True
    if is_python:
        try:
            compile(code, "<string>", "exec")
        except SyntaxError as e:
            syntax_ok = False
            score -= 4 
            score -= DEDUCT["syntax_error"]
            issues.append({
                "line": e.lineno,
                "severity": "critical",
                "message": f"Syntax error: {e.msg} (line {e.lineno}). Code will not run.",
            })

    # ── Security: hardcoded credentials ─────────────────────────────────
    credential_patterns = [
        (r'password\s*=\s*["\'][^"\']{2,}["\']',  "password"),
        (r'passwd\s*=\s*["\'][^"\']{2,}["\']',    "passwd"),
        (r'secret\s*=\s*["\'][^"\']{2,}["\']',    "secret"),
        (r'api_key\s*=\s*["\'][^"\']{2,}["\']',   "api_key"),
        (r'token\s*=\s*["\'][^"\']{2,}["\']',     "token"),
        (r'auth\s*=\s*["\'][^"\']{2,}["\']',      "auth"),
    ]
    found_creds = 0
    for i, line in enumerate(lines, 1):
        for pat, kind in credential_patterns:
            if re.search(pat, line, re.IGNORECASE):
                found_creds += 1
                score -= DEDUCT["credential_hardcoded"]
                security_issues.append({
                    "line": i,
                    "severity": "critical",
                    "message": (
                        f"Hardcoded {kind} detected. "
                        "Never embed credentials in source code — use environment variables or a secrets manager."
                    ),
                    "code": line.strip(),
                })

    # ── Security: SQL injection ──────────────────────────────────────────
    sql_patterns = [
        r'execute\s*\(\s*["\'].*%s',
        r'execute\s*\(\s*f["\'].*\{',
        r'f["\'].*SELECT.*WHERE.*\{',
        r'["\'].*SELECT.*\+.*["\']',
        r'cursor\.execute\s*\(\s*["\'][^"\']*\'\s*\+',
    ]
    if any(re.search(p, code, re.IGNORECASE) for p in sql_patterns):
        score -= DEDUCT["sql_injection"]
        security_issues.append({
            "line": None,
            "severity": "high",
            "message": (
                "Potential SQL injection vulnerability. "
                "Use parameterised queries (cursor.execute(sql, params)) instead of string formatting."
            ),
            "code": None,
        })

    # ── Security: eval() ────────────────────────────────────────────────
    if re.search(r'\beval\s*\(', code):
        score -= DEDUCT["eval_usage"]
        security_issues.append({
            "line": None,
            "severity": "high",
            "message": (
                "Use of eval() is dangerous — it executes arbitrary code and "
                "can be exploited for remote code execution. Remove or replace with ast.literal_eval()."
            ),
            "code": None,
        })

    # ── Quality: bare except ─────────────────────────────────────────────
    if re.search(r'except\s*:', code):
        score -= DEDUCT["bare_except"]
        issues.append({
            "line": None,
            "severity": "warning",
            "message": (
                "Bare `except:` clause catches everything including KeyboardInterrupt and SystemExit. "
                "Specify the exception type(s) you expect, e.g. `except ValueError`."
            ),
        })

    # ── Quality: TODO / FIXME ────────────────────────────────────────────
    todo_count = len(re.findall(r'\b(TODO|FIXME|HACK|XXX)\b', code))
    if todo_count:
        issues.append({
            "line": None,
            "severity": "info",
            "message": f"Found {todo_count} TODO/FIXME comment(s). Resolve or track in an issue tracker before shipping.",
        })
        score -= todo_count * 0.15   # small cumulative penalty

    # ── Quality: excessive print() ───────────────────────────────────────
    print_count = len(re.findall(r'\bprint\s*\(', code))
    if print_count > 3:
        suggestions.append(
            f"Found {print_count} print() calls. Replace with the `logging` module "
            "so you can control verbosity per environment."
        )

    # ── Quality: missing docstrings ──────────────────────────────────────
    function_defs = re.findall(r'def\s+\w+\s*\(', code)
    docstring_count = len(re.findall(r'"""', code))
    if function_defs and docstring_count < len(function_defs):
        suggestions.append(
            f"{len(function_defs)} function(s) found but fewer than {len(function_defs)} docstrings. "
            "Add docstrings so IDEs and documentation tools can assist maintainers."
        )

    # ── Quality: long lines ───────────────────────────────────────────────
    long_lines = [i + 1 for i, ln in enumerate(lines) if len(ln) > 120]
    if long_lines:
        score -= DEDUCT["long_lines"]
        issues.append({
            "line": long_lines[0],
            "severity": "info",
            "message": (
                f"{len(long_lines)} line(s) exceed 120 characters (first at line {long_lines[0]}). "
                "Break them up for readability and easier code review."
            ),
        })

    # ── Type hints check ─────────────────────────────────────────────────
    has_type_hints = bool(re.search(
        r':\s*(int|str|float|bool|list|dict|tuple|set|Optional|Union|Any|None)\b|from typing import',
        code
    ))
    if function_defs and not has_type_hints:
        suggestions.append(
            "No type hints detected. Adding type annotations improves IDE support, "
            "catches bugs early, and makes code easier to review."
        )

    # ── Complexity estimation ─────────────────────────────────────────────
    branch_keywords = re.findall(
        r'\b(if|elif|else|for|while|try|except|with|case|match|and|or)\b', code
    )
    branches = len(branch_keywords)

    if branches <= 5:
        complexity = "O(1) / Low"
    elif branches <= 15:
        complexity = "O(n) / Moderate"
    elif branches <= 30:
        complexity = "O(n²) / High"
        score -= DEDUCT["high_complexity"]
        suggestions.append(
            "High cyclomatic complexity detected. Consider breaking logic into smaller, "
            "single-responsibility functions."
        )
    else:
        complexity = "O(n³)+ / Very High"
        score -= DEDUCT["high_complexity"]
        issues.append({
            "line": None,
            "severity": "warning",
            "message": (
                f"Very high cyclomatic complexity ({branches} branches). "
                "This code will be difficult to test and maintain."
            ),
        })

    # ── FIX 4: Clamp score — never allow it to go below 0 or above 10 ───
    # Also ensure it is rounded to 1 decimal place for consistent display.
    # IMPORTANT: do NOT reset score here; only clamp the accumulated value.
    score = max(0.0, min(10.0, round(score, 1)))

    # ── Build summary ────────────────────────────────────────────────────
    total_problems = len(issues) + len(security_issues)
    if score >= 9:
        verdict = "Code looks clean with minimal issues."
    elif score >= 7:
        verdict = "Some improvements recommended."
    elif score >= 5:
        verdict = "Several issues detected that should be addressed."
    elif score >= 3:
        verdict = "Significant problems found — refactoring recommended."
    else:
        verdict = "Critical issues detected. Code needs substantial rework before use."
    
    if not issues and not security_issues:
        suggestions.append("No major issues found, but consider adding logging, tests, and validations.")

    return {
        "score": score,
        "complexity": complexity,
        "issues": issues,
        "security_issues": security_issues,
        "suggestions": suggestions,
        "summary": (
            f"{verdict} "
            f"Found {total_problems} issue(s) and {len(security_issues)} security concern(s)."
        ),
        "ai_powered": False,
    }


# ---------------------------------------------------------------------------
# FIX 5: ai_analyze — catch JSON errors separately so mock never silently
#         replaces a real AI result that simply failed to parse.
# ---------------------------------------------------------------------------

def ai_analyze(code: str) -> dict:
    """
    Use Claude API for deep analysis. Returns a structured dict, or raises
    an exception so the caller can decide what to do (not silently fall back).
    """
    prompt = f"""You are an expert code reviewer. Analyze the following code thoroughly and return ONLY a valid JSON object (no markdown, no explanation outside JSON).

The JSON must have this exact structure:
{{
  "score": <number 0-10, where 10 is perfect clean code>,
  "complexity": "<complexity description like O(n) / Moderate>",
  "summary": "<2-3 sentence overall assessment>",
  "issues": [
    {{"line": <int or null>, "severity": "<critical|high|warning|info>", "message": "<description>"}}
  ],
  "security_issues": [
    {{"line": <int or null>, "severity": "<critical|high|warning|info>", "message": "<description>", "code": "<snippet or null>"}}
  ],
  "suggestions": ["<actionable suggestion>"],
  "ai_powered": true
}}

SCORING GUIDE (be strict — most real-world code scores 5-8, not 9-10):
- 9-10: Genuinely clean, idiomatic, well-documented code with no issues
- 7-8: Minor style or maintainability issues only
- 5-6: Moderate issues (missing error handling, poor naming, mild complexity)
- 3-4: Significant issues (bad practices, some bugs, security concerns)
- 1-2: Critical bugs or multiple security vulnerabilities
- 0: Code does not run (syntax errors, undefined references)

Analyze for: syntax errors, bugs, bad practices, security vulnerabilities
(hardcoded secrets, injection flaws, use of eval), code quality,
maintainability, and time complexity.

CODE TO ANALYZE:
```
{code}
```"""

    raw = call_claude(prompt)
    if raw is None:
        # No API key — caller should use mock_analyze instead
        raise ValueError("No API key configured")

    # Strip accidental markdown fences
    clean = re.sub(r"```json\s*|```\s*", "", raw).strip()

    # FIX 5: Raise JSONDecodeError explicitly so /analyze can handle it
    # without silently wiping the score.
    result = json.loads(clean)

    # Safety: ensure score is numeric and clamped — AI can hallucinate strings
    try:
        result["score"] = max(0.0, min(10.0, float(result["score"])))
    except (KeyError, TypeError, ValueError):
        result["score"] = 5.0   # neutral fallback if AI returned bad value

    return result


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "ai_available": bool(ANTHROPIC_API_KEY)})


@app.route("/analyze", methods=["POST"])
def analyze():
    """
    Accepts JSON body: { "code": "<source code>" }
    Returns structured analysis result.

    Priority:
      1. Try AI analysis (if API key set)
      2. If JSON parse fails → log error, fall back to mock (don't silently reset)
      3. If no API key → use mock directly
    """
    data = request.get_json(silent=True)
    if not data or "code" not in data:
        return jsonify({"error": "Missing 'code' field in request body"}), 400

    code = data["code"].strip()
    if not code:
        return jsonify({"error": "Code cannot be empty"}), 400

    if len(code) > 50_000:
        return jsonify({"error": "Code too large (max 50,000 characters)"}), 400

    if ANTHROPIC_API_KEY:
        try:
            result = ai_analyze(code)
            return jsonify(result)
        except json.JSONDecodeError as e:
            # FIX 5: AI returned non-JSON — fall back to mock but log clearly
            app.logger.warning(f"AI returned invalid JSON, using mock fallback: {e}")
            result = mock_analyze(code)
            result["summary"] = "[AI parse error — rule-based fallback] " + result["summary"]
            return jsonify(result)
        except Exception as e:
            app.logger.error(f"AI analysis error: {e}")
            # Fall through to mock so user still gets a result
            result = mock_analyze(code)
            return jsonify(result)
    else:
        # No API key — use rule-based analysis directly
        return jsonify(mock_analyze(code))


@app.route("/analyze-github", methods=["POST"])
def analyze_github():
    """
    Accepts JSON body: { "repo_url": "https://github.com/owner/repo" }
    Fetches source files from the repo and analyzes them.
    """
    data = request.get_json(silent=True)
    if not data or "repo_url" not in data:
        return jsonify({"error": "Missing 'repo_url' field"}), 400

    repo_url = data["repo_url"].strip().rstrip("/")
    match = re.search(r"github\.com/([^/]+)/([^/]+)", repo_url)
    if not match:
        return jsonify({"error": "Invalid GitHub URL. Expected: https://github.com/owner/repo"}), 400

    owner, repo = match.group(1), match.group(2)
    headers = {"Accept": "application/vnd.github.v3+json"}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"token {GITHUB_TOKEN}"

    try:
        meta_resp = requests.get(
            f"https://api.github.com/repos/{owner}/{repo}",
            headers=headers, timeout=10
        )
        if meta_resp.status_code == 404:
            return jsonify({"error": "Repository not found or is private"}), 404
        meta_resp.raise_for_status()
        meta = meta_resp.json()

        tree_resp = requests.get(
            f"https://api.github.com/repos/{owner}/{repo}/git/trees/HEAD?recursive=1",
            headers=headers, timeout=15
        )
        tree_resp.raise_for_status()
        tree = tree_resp.json().get("tree", [])

        ALLOWED_EXTS = {".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".go", ".rb", ".php"}
        source_files = [
            f for f in tree
            if f["type"] == "blob"
            and any(f["path"].endswith(ext) for ext in ALLOWED_EXTS)
            and f.get("size", 0) < 500_000
        ][:5]

        analyzed_files = []
        combined_code = ""

        for file in source_files:
            blob_resp = requests.get(
                f"https://api.github.com/repos/{owner}/{repo}/contents/{file['path']}",
                headers=headers, timeout=10
            )
            blob_resp.raise_for_status()
            content = base64.b64decode(
                blob_resp.json().get("content", "")
            ).decode("utf-8", errors="replace")
            combined_code += f"\n\n# --- File: {file['path']} ---\n{content}"
            analyzed_files.append(file["path"])

        if not combined_code.strip():
            return jsonify({"error": "No analyzable source files found in repository"}), 400

        code_to_analyze = combined_code[:30_000]

        if ANTHROPIC_API_KEY:
            try:
                result = ai_analyze(code_to_analyze)
            except Exception:
                result = mock_analyze(code_to_analyze)
        else:
            result = mock_analyze(code_to_analyze)

        result["repo_meta"] = {
            "name": meta.get("full_name"),
            "description": meta.get("description"),
            "stars": meta.get("stargazers_count"),
            "language": meta.get("language"),
            "analyzed_files": analyzed_files,
        }
        return jsonify(result)

    except requests.exceptions.HTTPError as e:
        return jsonify({"error": f"GitHub API error: {e.response.status_code}"}), 502
    except Exception as e:
        app.logger.error(f"GitHub analysis error: {e}")
        return jsonify({"error": "Failed to fetch or analyze repository"}), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(debug=True, port=port)
