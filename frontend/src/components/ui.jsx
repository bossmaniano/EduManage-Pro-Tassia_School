// Shared UI primitives used across pages

export const Icon = ({ d, size = 20, color = "currentColor", strokeWidth = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

export const Icons = {
  dashboard: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
  students: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 7a4 4 0 100 8 4 4 0 000-8z M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75",
  grades: "M9 11l3 3L22 4 M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11",
  reports: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
  plus: "M12 5v14 M5 12h14",
  edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7 M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  trash: "M3 6h18 M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2",
  x: "M18 6L6 18 M6 6l12 12",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0",
  chevronDown: "M6 9l6 6 6-6",
  check: "M20 6L9 17l-5-5",
  award: "M12 15a7 7 0 100-14 7 7 0 000 14z M8.21 13.89L7 23l5-3 5 3-1.21-9.12",
  trending: "M23 6l-9.5 9.5-5-5L1 18",
  users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2",
  book: "M4 19.5A2.5 2.5 0 016.5 17H20",
  menu: "M3 12h18 M3 6h18 M3 18h18",
  close: "M18 6L6 18 M6 6l12 12",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 100 6 3 3 0 000-6z",
  alert: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4 M12 17h.01",
  lock: "M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z M17 11V7a5 5 0 00-10 0v4",
  unlock: "M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z M17 11V7a5 5 0 00-9.9-1",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
  clipboard: "M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2 M15 2H9a1 1 0 00-1 1v2a1 1 0 001 1h6a1 1 0 001-1V3a1 1 0 00-1-1z",
  logout: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4 M16 17l5-5-5-5 M21 12H9",
  printer: "M6 9V2h12v7 M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2 M6 14h12v8H6z",
};

export function evaluateScore(score) {
  const s = Number(score);
  if (isNaN(s) || s < 0 || s > 100) return null;
  if (s >= 90) return { rubric: "EE 1", full: "Exceeding Expectation 1 (EE 1)", points: 8, comment: "Exceptional performance", color: "#10b981", band: "EE" };
  if (s >= 75) return { rubric: "EE 2", full: "Exceeding Expectation 2 (EE 2)", points: 7, comment: "Very good performance", color: "#34d399", band: "EE" };
  if (s >= 58) return { rubric: "ME 1", full: "Meeting Expectation 1 (ME 1)", points: 6, comment: "Good performance", color: "#3b82f6", band: "ME" };
  if (s >= 41) return { rubric: "ME 2", full: "Meeting Expectation 2 (ME 2)", points: 5, comment: "Fair performance", color: "#60a5fa", band: "ME" };
  if (s >= 31) return { rubric: "AE 1", full: "Approaching Expectation 1 (AE 1)", points: 4, comment: "Needs improvement", color: "#f59e0b", band: "AE" };
  if (s >= 21) return { rubric: "AE 2", full: "Approaching Expectation 2 (AE 2)", points: 3, comment: "Below average", color: "#fbbf24", band: "AE" };
  if (s >= 11) return { rubric: "BE 1", full: "Below Expectation 1 (BE 1)", points: 2, comment: "Well below average", color: "#ef4444", band: "BE" };
  return { rubric: "BE 2", full: "Below Expectation 2 (BE 2)", points: 1, comment: "Minimal performance", color: "#dc2626", band: "BE" };
}

export function RubricBadge({ score }) {
  const ev = evaluateScore(score);
  if (!ev) return <span className="text-gray-400 text-xs">—</span>;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-white"
      style={{ backgroundColor: ev.color }}>
      {ev.rubric}
    </span>
  );
}

export function ScoreBar({ score }) {
  const ev = evaluateScore(score);
  const pct = Math.min(100, Math.max(0, score));
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: ev?.color || "#94a3b8" }} />
      </div>
      <span className="text-sm font-bold w-8 text-right" style={{ color: ev?.color }}>{score}</span>
    </div>
  );
}

export function Modal({ open, onClose, title, children, width = "max-w-lg" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${width} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Icon d={Icons.x} size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function FormField({ label, error, children }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-semibold text-gray-700">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 flex items-center gap-1"><Icon d={Icons.alert} size={12} />{error}</p>}
    </div>
  );
}

export function Input({ className = "", ...props }) {
  return (
    <input className={`w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 transition-all ${className}`}
      {...props} />
  );
}

export function Select({ className = "", children, ...props }) {
  return (
    <select className={`w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 transition-all ${className}`}
      {...props}>{children}</select>
  );
}

export function Button({ variant = "primary", className = "", children, ...props }) {
  const base = "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-indigo-200/50 hover:shadow-md",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
    ghost: "text-gray-600 hover:bg-gray-100",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
    warning: "bg-amber-50 text-amber-700 hover:bg-amber-100",
  };
  return <button className={`${base} ${variants[variant] || variants.primary} ${className}`} {...props}>{children}</button>;
}

export function Card({ className = "", children }) {
  return <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}>{children}</div>;
}

export function Toast({ msg, type }) {
  if (!msg) return null;
  const colors = { success: "bg-emerald-500", error: "bg-red-500", info: "bg-indigo-500" };
  return (
    <div className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl text-white text-sm font-semibold shadow-xl flex items-center gap-2 ${colors[type] || colors.info}`}>
      <Icon d={type === "error" ? Icons.alert : Icons.check} size={16} />
      {msg}
    </div>
  );
}

export function EmptyState({ icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
        <Icon d={icon} size={28} color="#6366f1" />
      </div>
      <h3 className="text-lg font-bold text-gray-800 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 mb-4">{subtitle}</p>
      {action}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
}
