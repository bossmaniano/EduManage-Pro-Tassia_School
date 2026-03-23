// Live Clock Component - Top-right header position
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

  // Format time: 06:36 PM (Bold, Darker Slate)
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  // Format date: Monday, March 23, 2026 (Smaller, Light Slate)
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Warning colors
  const timeColor = isWarning ? "text-red-600" : "text-slate-800";
  const dateColor = isWarning ? "text-red-500" : "text-slate-500";
  const dotColor = isWarning ? "bg-red-500" : "bg-emerald-500";

  return (
    <div className="flex items-center gap-3">
      {/* Time - Bold, Darker Slate */}
      <div className={`text-lg font-bold ${timeColor} font-mono`}>
        {formatTime(time)}
      </div>
      
      {/* Date - Smaller, Light Slate */}
      <div className={`text-sm ${dateColor}`}>
        {formatDate(time)}
      </div>
      
      {/* Green dot for live connection */}
      <div className={`w-2 h-2 rounded-full ${dotColor} animate-pulse`} title="Server Connected" />
    </div>
  );
}
