@echo off
REM Local Development Startup Script for Windows
REM Run both frontend and backend for local development

echo Starting EduManage Pro locally...

REM Start Backend in a new window
echo Starting Backend on port 10000...
start "EduManage Backend" cmd /k "cd backend && python app.py"

REM Wait a moment for backend to start
timeout /t 2 /nobreak >nul

REM Start Frontend in a new window
echo Starting Frontend on port 3000...
start "EduManage Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo =========================================
echo EduManage Pro is running!
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:10000
echo =========================================
echo.
echo Press any key to exit (servers will keep running)...
pause >nul
