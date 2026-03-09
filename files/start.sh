#!/bin/bash
# EduManage Pro - Start both services

echo "🎓 Starting EduManage Pro..."

# Start Flask backend
echo "Starting Flask backend on port 18080..."
cd backend
pip install -r requirements.txt -q
python app.py &
FLASK_PID=$!
echo "✅ Flask running (PID: $FLASK_PID)"

# Start React frontend
cd ../frontend
echo "Installing frontend dependencies..."
npm install --silent
echo "Starting React dev server on port 3000..."
npm run dev &
VITE_PID=$!
echo "✅ React running (PID: $VITE_PID)"

echo ""
echo "🚀 EduManage Pro is running!"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:18080"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait and handle shutdown
trap "kill $FLASK_PID $VITE_PID; echo 'Stopped.'" SIGINT SIGTERM
wait
