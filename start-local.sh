#!/bin/bash
# Local Development Startup Script
# Run both frontend and backend for local development

echo "Starting EduManage Pro locally..."

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "Python3 not found. Please install Python 3.9+"
    exit 1
fi

# Check if Node.js is available
if ! command -v npm &> /dev/null; then
    echo "npm not found. Please install Node.js"
    exit 1
fi

# Start Backend (in background)
echo "Starting Backend on port 10000..."
cd backend
python3 app.py &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Start Frontend (in background)
echo "Starting Frontend on port 3000..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "========================================="
echo "EduManage Pro is running!"
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:10000"
echo "========================================="
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
