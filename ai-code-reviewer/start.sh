#!/usr/bin/env bash
# start.sh — Launch both backend and frontend with a single command
# Usage: chmod +x start.sh && ./start.sh

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🔍 CodeScan AI — Starting servers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Backend
echo ""
echo "▶ Starting Flask backend on port 5000…"
cd backend
if [ ! -d "venv" ]; then
  echo "  Creating virtual environment…"
  python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt -q
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "  ⚠  Created .env from template. Add your ANTHROPIC_API_KEY for AI analysis."
fi
python app.py &
BACKEND_PID=$!
cd ..

# Frontend
echo ""
echo "▶ Starting React frontend on port 3000…"
cd frontend
npm install --silent
npm start &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Both servers running!"
echo "   Frontend → http://localhost:3000"
echo "   Backend  → http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop."

# Cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'" EXIT
wait
