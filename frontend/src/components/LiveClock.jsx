// Live Clock Component - Bottom-left position with modern styling
import { useState, useEffect } from "react";

const TOTAL_SESSION_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_THRESHOLD_MS = 12 * 60 * 1000; // 3 minutes remaining (12 minutes elapsed)

export default function LiveClock({ lastActivityTime, showTimeoutWarning }) {
  const [time, setTime] = useState(new Date());
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    // Update every second
    const interval = setInterval(() => {
      const now = new Date();
      setTime(now);

      // Check if we're in the warning period (3 minutes or less remaining)
      if (lastActivityTime) {
        const elapsed = Date.now() - lastActivityTime;
        const remaining = TOTAL_SESSION_MS - elapsed;
        setIsWarning(remaining <= (TOTAL_SESSION_MS - WARNING_THRESHOLD_MS));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastActivityTime]);

  // Format: Monday, March 23 • 06:04 PM
  const formatDateTime = (date) => {
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const monthDay = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true 
    });
    return `${dayName}, ${monthDay} • ${timeStr}`;
  };

  // Warning colors
  const textColor = isWarning ? "text-red-600" : "text-slate-500";
  const dotColor = isWarning ? "bg-red-500" : "bg-emerald-500";

  return (
    <div className={`fixed bottom-4 left-4 z-40 flex items-center gap-2 ${textColor}`}>
      {/* Location/EAT indicator */}
      <div className="flex items-center gap-1 text-xs font-medium">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span>EAT</span>
      </div>
      
      {/* Separator */}
      <span className="text-slate-300">|</span>
      
      {/* Time display */}
      <div className="text-sm font-medium font-mono">
        {formatDateTime(time)}
      </div>
      
      {/* Status dot */}
      <div className={`w-2 h-2 rounded-full ${dotColor} animate-pulse`} />
    </div>
  );
}
