<<<<<<< HEAD
# 🔍 CodeScan AI — Intelligent Code Reviewer

An AI-powered code review web application that detects bugs, security vulnerabilities, code quality issues, and estimates time complexity. Built with **React + Tailwind CSS** (frontend) and **Python Flask** (backend), powered by the **Claude API**.

---

## 📁 Project Structure

```
ai-code-reviewer/
├── backend/
│   ├── app.py              # Flask API server
│   ├── requirements.txt    # Python dependencies
│   └── .env.example        # Environment variable template
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── CodeEditor.jsx    # Code input with line numbers
│   │   │   ├── IssueCard.jsx     # Individual issue display
│   │   │   ├── ResultsPanel.jsx  # Full analysis results
│   │   │   └── ScoreRing.jsx     # Animated score circle
│   │   ├── utils/
│   │   │   └── api.js            # Axios API wrapper
│   │   ├── App.jsx               # Main application
│   │   ├── index.js              # React entry point
│   │   └── index.css             # Tailwind + custom styles
│   ├── package.json
│   ├── tailwind.config.js
│   └── postcss.config.js
└── README.md
```

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🤖 AI Analysis | Claude-powered deep code review |
| 🐛 Bug Detection | Common bugs, bad practices, bare excepts |
| 🔒 Security Scan | Hardcoded credentials, SQL injection, eval() |
| 📊 Complexity | Time complexity estimation (O notation) |
| 💡 Suggestions | Actionable improvement tips |
| 🏆 Code Score | 0–10 animated score ring |
| 🐙 GitHub Integration | Analyze public GitHub repositories |
| 📋 Rule-Based Fallback | Works without API key in demo mode |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.10+
- (Optional) Anthropic API key for AI-powered analysis

### 1. Clone and setup

```bash
git clone <your-repo>
cd ai-code-reviewer
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

### 4. Run Both Servers

**Terminal 1 — Backend:**
```bash
cd backend
source venv/bin/activate
python app.py
# → Running on http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm start
# → Running on http://localhost:3000
```

Open **http://localhost:3000** in your browser.

---

## 🔑 Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Optional | Claude API key for AI analysis |
| `GITHUB_TOKEN` | Optional | GitHub PAT for higher rate limits |
| `PORT` | Optional | Server port (default: 5000) |

> **Without an API key**, the app runs in demo mode using rule-based analysis — great for testing!

---

## 📡 API Endpoints

### `POST /analyze`
Analyze a code snippet.

**Request:**
```json
{ "code": "def hello():\n  print('world')" }
```

**Response:**
```json
{
  "score": 7.5,
  "complexity": "O(1) / Low",
  "summary": "Clean code with minor improvements possible.",
  "issues": [{ "line": 2, "severity": "info", "message": "..." }],
  "security_issues": [],
  "suggestions": ["Add type hints for better clarity"],
  "ai_powered": true
}
```

### `POST /analyze-github`
Analyze a public GitHub repository.

**Request:**
```json
{ "repo_url": "https://github.com/owner/repo" }
```

### `GET /health`
Check backend status.

---

## 🌐 Deployment

### Frontend → Vercel

```bash
cd frontend
npm run build
# Deploy the `build/` folder to Vercel
# Or: npx vercel --prod
```

Set environment variable in Vercel dashboard:
- `REACT_APP_API_URL` → your Render backend URL

### Backend → Render

1. Create a new **Web Service** on [render.com](https://render.com)
2. Connect your GitHub repo
3. Set:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:app`
4. Add environment variables: `ANTHROPIC_API_KEY`, `GITHUB_TOKEN`

---

## 🛠 Tech Stack

**Frontend**
- React 18
- Tailwind CSS 3
- Axios
- Custom SVG animations

**Backend**
- Python 3.10+
- Flask 3
- Flask-CORS
- Requests
- Gunicorn (production)

**AI**
- Anthropic Claude API (claude-sonnet-4-20250514)
- Rule-based NLP fallback

---

## 📝 License

MIT
=======
# AI-Code-Reviewer
>>>>>>> 38c495ee8ca5343e2789ac5880d4ad130189c5e7
