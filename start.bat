@echo off
echo Starting CareerPath SA...
echo.

echo Starting backend on http://localhost:8000
start "CareerPath Backend" cmd /k "cd backend && venv\Scripts\activate && uvicorn main:app --reload"

timeout /t 3 /nobreak >nul

echo Starting frontend on http://localhost:3000
start "CareerPath Frontend" cmd /k "cd frontend && npm run dev"

timeout /t 5 /nobreak >nul

echo.
echo ============================================
echo  Backend:  http://localhost:8000
echo  Frontend: http://localhost:3000
echo  API docs: http://localhost:8000/docs
echo ============================================
echo.
echo Both servers are starting in separate windows.
echo Open http://localhost:3000 in your browser.
pause
