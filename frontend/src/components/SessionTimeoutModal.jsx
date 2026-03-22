import { useState, useEffect } from "react";

// Session timeout constants
const TOTAL_SESSION_MS = 15 * 60 * 1000; // 15 minutes total
const COLOR_CHANGE_MS = 13 * 60 * 1000; // Change color at 13 minutes (60 seconds left)

const TASSIA_BLUE = "#4F46E5"; // Indigo-600
const WARNING_RED = "#DC2626"; // Red-600

export default function SessionTimeoutModal({ 
  show, 
  onStayLoggedIn, 
  onLogout,
  lastActivityTime 
}) {
  const [timeRemaining, setTimeRemaining] = useState(TOTAL_SESSION_MS);
  
  // Calculate progress percentage (0 to 1)
  const progress = timeRemaining / TOTAL_SESSION_MS;
  
  // SVG circle calculations
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);
  
  // Color calculation - shift to red in the last 60 seconds
  const isWarningPhase = timeRemaining <= (TOTAL_SESSION_MS - COLOR_CHANGE_MS);
  const circleColor = isWarningPhase ? WARNING_RED : TASSIA_BLUE;
  
  // Format time as MM:SS
  const formatTime = (ms) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Update timer every second
  useEffect(() => {
    if (!show || !lastActivityTime) return;
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivityTime;
      const remaining = Math.max(0, TOTAL_SESSION_MS - elapsed);
      setTimeRemaining(remaining);
      
      if (remaining <= 0) {
        onLogout();
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [show, lastActivityTime, onLogout]);
  
  if (!show) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
        {/* Header */}
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Session Expiring Soon
        </h2>
        <p className="text-gray-500 mb-6">
          Your session will expire due to inactivity.
        </p>
        
        {/* Analog Timer Circle */}
        <div className="relative w-32 h-32 mx-auto mb-6">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
            {/* Background circle */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="#E5E7EB"
              strokeWidth="8"
            />
            {/* Progress circle */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={circleColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-linear"
              style={{
                filter: `drop-shadow(0 0 6px ${circleColor}40)`
              }}
            />
          </svg>
          
          {/* Time display in center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span 
              className={`text-2xl font-black ${
                isWarningPhase ? "text-red-600" : "text-indigo-600"
              }`}
            >
              {formatTime(timeRemaining)}
            </span>
          </div>
        </div>
        
        {/* Status text */}
        <p className="text-sm text-gray-500 mb-6">
          {isWarningPhase 
            ? "Less than 1 minute remaining!" 
            : "Click below to stay logged in"}
        </p>
        
        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onLogout}
            className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
          >
            Log Out
          </button>
          <button
            onClick={onStayLoggedIn}
            className="flex-1 px-4 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
          >
            Stay Logged In
          </button>
        </div>
      </div>
    </div>
  );
}
