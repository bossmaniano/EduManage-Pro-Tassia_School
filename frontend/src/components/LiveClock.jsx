// Live Clock Component with timeout warning integration
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

  // Format: HH:mm:ss A (e.g., 05:47:12 PM)
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  // Format: Mon, March 23, 2026
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Warning colors
  const bgColor = isWarning ? "bg-red-600" : "bg-green-600";
  const textColor = isWarning ? "text-red-100" : "text-white";

  return (
    <div className={`inline-flex flex-col items-center px-3 py-1 ${bgColor} ${textColor} rounded-lg ml-3`}>
      <div className="font-mono text-sm font-bold tracking-wider">
        {formatTime(time)}
      </div>
      <div className="text-xs opacity-90">
        {formatDate(time)}
      </div>
    </div>
  );
}
