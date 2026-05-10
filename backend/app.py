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
CORS(app)  # Enable CORS for React frontend

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")

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


def mock_analyze(code: str) -> dict:
    """
    Fallback rule-based analysis when no API key is configured.
    Detects common patterns for demo purposes.
    """
    issues = []
    suggestions = []
    security_issues = []
    score = 10

    lines = code.splitlines()

    # --- Security checks ---
    password_patterns = [
        r'password\s*=\s*["\'][^"\']+["\']',
        r'passwd\s*=\s*["\'][^"\']+["\']',
        r'secret\s*=\s*["\'][^"\']+["\']',
        r'api_key\s*=\s*["\'][^"\']+["\']',
        r'token\s*=\s*["\'][^"\']+["\']',
    ]
    for i, line in enumerate(lines, 1):
        for pat in password_patterns:
            if re.search(pat, line, re.IGNORECASE):
                security_issues.append({
                    "line": i,
                    "severity": "critical",
                    "message": "Hardcoded credential detected. Use environment variables instead.",
                    "code": line.strip(),
                })
                score -= 2

    # SQL injection risk
    if re.search(r'execute\s*\(\s*["\'].*%s.*["\']', code) or \
       re.search(r'f["\'].*SELECT.*{', code, re.IGNORECASE):
        security_issues.append({
            "line": None,
            "severity": "high",
            "message": "Potential SQL injection vulnerability. Use parameterized queries.",
            "code": None,
        })
        score -= 1

    # eval() usage
    if re.search(r'\beval\s*\(', code):
        security_issues.append({
            "line": None,
            "severity": "high",
            "message": "Use of eval() is dangerous and may allow code injection.",
            "code": None,
        })
        score -= 1

    # --- Bug / quality checks ---
    # Bare except
    if re.search(r'except\s*:', code):
        issues.append({
            "line": None,
            "severity": "warning",
            "message": "Bare `except:` clause catches all exceptions including KeyboardInterrupt. Specify exception types.",
        })
        score -= 0.5

    # TODO / FIXME comments
    todo_count = len(re.findall(r'\b(TODO|FIXME|HACK|XXX)\b', code))
    if todo_count:
        issues.append({
            "line": None,
            "severity": "info",
            "message": f"Found {todo_count} TODO/FIXME comment(s). Resolve before production.",
        })

    # print() in production code
    print_count = len(re.findall(r'\bprint\s*\(', code))
    if print_count > 3:
        suggestions.append("Replace print() calls with proper logging (logging module).")

    # Missing docstrings for functions/classes
    functions = re.findall(r'def\s+\w+\s*\(', code)
    docstrings = re.findall(r'"""', code)
    if len(functions) > 0 and len(docstrings) < len(functions):
        suggestions.append("Add docstrings to functions and classes for better maintainability.")

    # Long lines
    long_lines = [i + 1 for i, l in enumerate(lines) if len(l) > 120]
    if long_lines:
        issues.append({
            "line": long_lines[0],
            "severity": "info",
            "message": f"Lines exceeding 120 characters found (e.g., line {long_lines[0]}). Consider breaking them up.",
        })

    # --- Complexity estimation ---
    branches = len(re.findall(r'\b(if|elif|else|for|while|try|except|with|case)\b', code))
    if branches <= 5:
        complexity = "O(1) / Low"
    elif branches <= 15:
        complexity = "O(n) / Moderate"
    elif branches <= 30:
        complexity = "O(n²) / High"
    else:
        complexity = "O(n³)+ / Very High"

    if branches > 30:
        score -= 1
        suggestions.append("High cyclomatic complexity detected. Refactor into smaller functions.")

    # General suggestions
    if not re.search(r'\btype\s+hints?\b|\btyping\b|:\s*(int|str|float|bool|list|dict)', code):
        suggestions.append("Consider adding type hints for better code clarity and IDE support.")

    score = max(0, min(10, round(score, 1)))

    return {
        "score": score,
        "complexity": complexity,
        "issues": issues,
        "security_issues": security_issues,
        "suggestions": suggestions,
        "summary": f"Rule-based analysis complete. Found {len(issues)} issue(s), {len(security_issues)} security concern(s).",
        "ai_powered": False,
    }


def ai_analyze(code: str) -> dict:
    """Use Claude API for deep analysis and return structured result."""
    prompt = f"""You are an expert code reviewer. Analyze the following code thoroughly and return ONLY a valid JSON object (no markdown, no explanation outside JSON).

The JSON must have this exact structure:
{{
  "score": <number 0-10>,
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

Analyze for: bugs, bad practices, security vulnerabilities (hardcoded secrets, injection, etc.), code quality, maintainability, and time complexity.

CODE TO ANALYZE:
```
{code}
```"""

    raw = call_claude(prompt)
    if not raw:
        return None

    # Strip any accidental markdown fences
    clean = re.sub(r"```json|```", "", raw).strip()
    return json.loads(clean)


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
    """
    data = request.get_json(silent=True)
    if not data or "code" not in data:
        return jsonify({"error": "Missing 'code' field in request body"}), 400

    code = data["code"].strip()
    if not code:
        return jsonify({"error": "Code cannot be empty"}), 400

    if len(code) > 50_000:
        return jsonify({"error": "Code too large (max 50,000 characters)"}), 400

    try:
        if ANTHROPIC_API_KEY:
            result = ai_analyze(code)
            if result is None:
                result = mock_analyze(code)
        else:
            result = mock_analyze(code)
        return jsonify(result)
    except Exception as e:
        app.logger.error(f"Analysis error: {e}")
        # Fallback to mock on any error
        return jsonify(mock_analyze(code))


@app.route("/analyze-github", methods=["POST"])
def analyze_github():
    """
    Accepts JSON body: { "repo_url": "https://github.com/owner/repo" }
    Fetches Python/JS/TS files from the repo and analyzes them.
    """
    data = request.get_json(silent=True)
    if not data or "repo_url" not in data:
        return jsonify({"error": "Missing 'repo_url' field"}), 400

    repo_url = data["repo_url"].strip().rstrip("/")

    # Parse owner/repo from URL
    match = re.search(r"github\.com/([^/]+)/([^/]+)", repo_url)
    if not match:
        return jsonify({"error": "Invalid GitHub URL. Expected format: https://github.com/owner/repo"}), 400

    owner, repo = match.group(1), match.group(2)

    headers = {"Accept": "application/vnd.github.v3+json"}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"token {GITHUB_TOKEN}"

    try:
        # Get repo metadata
        meta_resp = requests.get(
            f"https://api.github.com/repos/{owner}/{repo}",
            headers=headers, timeout=10
        )
        if meta_resp.status_code == 404:
            return jsonify({"error": "Repository not found or is private"}), 404
        meta_resp.raise_for_status()
        meta = meta_resp.json()

        # Get file tree (recursive)
        tree_resp = requests.get(
            f"https://api.github.com/repos/{owner}/{repo}/git/trees/HEAD?recursive=1",
            headers=headers, timeout=15
        )
        tree_resp.raise_for_status()
        tree = tree_resp.json().get("tree", [])

        # Filter to source files, max 5 files, max 500KB each
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
            blob_data = blob_resp.json()

            content_b64 = blob_data.get("content", "")
            content = base64.b64decode(content_b64).decode("utf-8", errors="replace")
            combined_code += f"\n\n# --- File: {file['path']} ---\n{content}"
            analyzed_files.append(file["path"])

        if not combined_code.strip():
            return jsonify({"error": "No analyzable source files found in repository"}), 400

        # Analyze combined code (truncate if too long)
        code_to_analyze = combined_code[:30_000]

        if ANTHROPIC_API_KEY:
            result = ai_analyze(code_to_analyze)
            if result is None:
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
