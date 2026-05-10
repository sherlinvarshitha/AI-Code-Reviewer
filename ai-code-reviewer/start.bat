@echo off
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo   CodeScan AI - Starting servers
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo.
echo Starting Flask backend on port 5000...
cd backend
if not exist venv (
    python -m venv venv
)
call venv\Scripts\activate
pip install -r requirements.txt -q
if not exist .env (
    copy .env.example .env
    echo Created .env - add your ANTHROPIC_API_KEY for AI analysis
)
start /B python app.py
cd ..

echo.
echo Starting React frontend on port 3000...
cd frontend
call npm install --silent
start /B npm start
cd ..

echo.
echo Both servers starting...
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5000
echo.
pause
