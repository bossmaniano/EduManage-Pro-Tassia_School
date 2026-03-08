import { useState, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
const API_BASE = "http://localhost:18080/api";

// ─────────────────────────────────────────────
// GRADING UTILITY (mirrors backend logic client-side)
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// API HELPERS
// ─────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─────────────────────────────────────────────
// ICONS
// ─────────────────────────────────────────────
const Icon = ({ d, size = 20, color = "currentColor", strokeWidth = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const Icons = {
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
};

// ─────────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────────

function RubricBadge({ score }) {
  const ev = evaluateScore(score);
  if (!ev) return <span className="text-gray-400 text-xs">—</span>;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-white"
      style={{ backgroundColor: ev.color }}>
      {ev.rubric}
    </span>
  );
}

function ScoreBar({ score }) {
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

function Modal({ open, onClose, title, children, width = "max-w-lg" }) {
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

function FormField({ label, error, children }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-semibold text-gray-700">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 flex items-center gap-1"><Icon d={Icons.alert} size={12} />{error}</p>}
    </div>
  );
}

function Input({ className = "", ...props }) {
  return (
    <input className={`w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 transition-all ${className}`}
      {...props} />
  );
}

function Select({ className = "", children, ...props }) {
  return (
    <select className={`w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 transition-all ${className}`}
      {...props}>{children}</select>
  );
}

function Button({ variant = "primary", className = "", children, ...props }) {
  const base = "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-indigo-200/50 hover:shadow-md",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
    ghost: "text-gray-600 hover:bg-gray-100",
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props}>{children}</button>;
}

function Card({ className = "", children }) {
  return <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}>{children}</div>;
}

function Toast({ msg, type }) {
  if (!msg) return null;
  const colors = { success: "bg-emerald-500", error: "bg-red-500", info: "bg-indigo-500" };
  return (
    <div className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl text-white text-sm font-semibold shadow-xl flex items-center gap-2 ${colors[type] || colors.info}`}>
      <Icon d={type === "error" ? Icons.alert : Icons.check} size={16} />
      {msg}
    </div>
  );
}

function EmptyState({ icon, title, subtitle, action }) {
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

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
}

// ─────────────────────────────────────────────
// DASHBOARD PAGE
// ─────────────────────────────────────────────
function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/dashboard").then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!data) return <div className="text-center text-gray-500 py-20">Could not connect to backend. Make sure Flask is running on port 18080.</div>;

  const stats = [
    { label: "Total Students", value: data.totalStudents, icon: Icons.students, color: "bg-indigo-500", bg: "bg-indigo-50" },
    { label: "Total Subjects", value: data.totalSubjects, icon: Icons.book, color: "bg-purple-500", bg: "bg-purple-50" },
    { label: "Grades Entered", value: data.totalGradesEntered, icon: Icons.grades, color: "bg-emerald-500", bg: "bg-emerald-50" },
    { label: "Average Score", value: `${data.averageScore}%`, icon: Icons.award, color: "bg-amber-500", bg: "bg-amber-50" },
  ];

  const distColors = { EE: "#10b981", ME: "#3b82f6", AE: "#f59e0b", BE: "#ef4444" };
  const distLabels = { EE: "Exceeding", ME: "Meeting", AE: "Approaching", BE: "Below" };
  const total = Object.values(data.gradeDistribution).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">{s.label}</p>
                <p className="text-3xl font-black text-gray-900 mt-1">{s.value}</p>
              </div>
              <div className={`${s.bg} p-3 rounded-xl`}>
                <Icon d={s.icon} size={22} color={s.color.replace("bg-", "").includes("indigo") ? "#6366f1" : s.color.includes("purple") ? "#a855f7" : s.color.includes("emerald") ? "#10b981" : "#f59e0b"} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grade Distribution */}
        <Card className="p-6">
          <h3 className="font-bold text-gray-800 mb-5 text-lg">Grade Distribution</h3>
          <div className="space-y-4">
            {Object.entries(data.gradeDistribution).map(([band, count]) => (
              <div key={band}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-semibold" style={{ color: distColors[band] }}>{distLabels[band]} ({band})</span>
                  <span className="text-gray-600 font-medium">{count} <span className="text-gray-400">({Math.round(count / total * 100)}%)</span></span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${(count / total) * 100}%`, backgroundColor: distColors[band] }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Subject Averages */}
        <Card className="p-6">
          <h3 className="font-bold text-gray-800 mb-5 text-lg">Subject Averages</h3>
          <div className="space-y-3">
            {data.subjectAverages.map((s) => (
              <div key={s.subject}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{s.subject}</span>
                  <span className="text-gray-500">{s.count} entries</span>
                </div>
                <ScoreBar score={s.average} />
              </div>
            ))}
            {data.subjectAverages.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No data yet</p>}
          </div>
        </Card>

        {/* Top Performers */}
        <Card className="p-6">
          <h3 className="font-bold text-gray-800 mb-5 text-lg">Top Performers</h3>
          <div className="space-y-3">
            {data.topPerformers.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white ${i === 0 ? "bg-amber-400" : i === 1 ? "bg-gray-400" : i === 2 ? "bg-amber-700" : "bg-indigo-100 !text-indigo-600"}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.grade}</p>
                </div>
                <RubricBadge score={Math.round(s.average)} />
              </div>
            ))}
            {data.topPerformers.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No data yet</p>}
          </div>
        </Card>
      </div>

      {/* Rubric Reference */}
      <Card className="p-6">
        <h3 className="font-bold text-gray-800 mb-4 text-lg">Grading Rubric Reference</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { range: "90–99", label: "EE 1", points: 8, color: "#10b981" },
            { range: "75–89", label: "EE 2", points: 7, color: "#34d399" },
            { range: "58–74", label: "ME 1", points: 6, color: "#3b82f6" },
            { range: "41–57", label: "ME 2", points: 5, color: "#60a5fa" },
            { range: "31–40", label: "AE 1", points: 4, color: "#f59e0b" },
            { range: "21–30", label: "AE 2", points: 3, color: "#fbbf24" },
            { range: "11–20", label: "BE 1", points: 2, color: "#ef4444" },
            { range: "01–10", label: "BE 2", points: 1, color: "#dc2626" },
          ].map((r) => (
            <div key={r.label} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: r.color + "15" }}>
              <div className="w-2 h-8 rounded-full" style={{ backgroundColor: r.color }} />
              <div>
                <p className="text-xs font-bold" style={{ color: r.color }}>{r.label} • {r.points}pts</p>
                <p className="text-xs text-gray-500">{r.range}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────
// STUDENTS PAGE
// ─────────────────────────────────────────────
function StudentsPage({ onToast }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  const [form, setForm] = useState({ name: "", grade: "", email: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch("/students").then(setStudents).catch(() => onToast("Failed to load students", "error")).finally(() => setLoading(false));
  }, [onToast]);

  useEffect(() => { load(); }, [load]);

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.grade.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setEditStudent(null); setForm({ name: "", grade: "", email: "" }); setErrors({}); setModalOpen(true); };
  const openEdit = (s) => { setEditStudent(s); setForm({ name: s.name, grade: s.grade, email: s.email }); setErrors({}); setModalOpen(true); };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.grade.trim()) e.grade = "Grade is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Invalid email format";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editStudent) {
        await apiFetch(`/students/${editStudent.id}`, { method: "PUT", body: JSON.stringify(form) });
        onToast("Student updated successfully", "success");
      } else {
        await apiFetch("/students", { method: "POST", body: JSON.stringify(form) });
        onToast("Student added successfully", "success");
      }
      setModalOpen(false);
      load();
    } catch (e) { onToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await apiFetch(`/students/${id}`, { method: "DELETE" });
      onToast("Student deleted", "success");
      setDeleteConfirm(null);
      load();
    } catch (e) { onToast(e.message, "error"); }
  };

  const grades = ["Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Icon d={Icons.search} size={16} color="#9ca3af" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search students..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            style={{ paddingLeft: "2.25rem" }} />
          <div className="absolute left-3 top-3"><Icon d={Icons.search} size={16} color="#9ca3af" /></div>
        </div>
        <Button onClick={openAdd}><Icon d={Icons.plus} size={16} />Add Student</Button>
      </div>

      {loading ? <Spinner /> : (
        <Card>
          {filtered.length === 0 ? (
            <EmptyState icon={Icons.students} title="No students found"
              subtitle={search ? "Try a different search term" : "Add your first student to get started"}
              action={!search && <Button onClick={openAdd}><Icon d={Icons.plus} size={16} />Add Student</Button>} />
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {["Student", "Grade", "Email", "Actions"].map(h => (
                        <th key={h} className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(s => (
                      <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600">
                              {s.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                            <span className="font-semibold text-gray-800">{s.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4"><span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold">{s.grade}</span></td>
                        <td className="px-6 py-4 text-sm text-gray-500">{s.email}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <Button variant="ghost" onClick={() => openEdit(s)} className="p-2"><Icon d={Icons.edit} size={15} /></Button>
                            <Button variant="danger" onClick={() => setDeleteConfirm(s)} className="p-2"><Icon d={Icons.trash} size={15} /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {filtered.map(s => (
                  <div key={s.id} className="p-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600 flex-shrink-0">
                        {s.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{s.name}</p>
                        <p className="text-xs text-gray-500">{s.grade} · {s.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" onClick={() => openEdit(s)} className="p-2"><Icon d={Icons.edit} size={14} /></Button>
                      <Button variant="danger" onClick={() => setDeleteConfirm(s)} className="p-2"><Icon d={Icons.trash} size={14} /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      )}

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editStudent ? "Edit Student" : "Add New Student"}>
        <div className="space-y-4">
          <FormField label="Full Name" error={errors.name}>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Alice Johnson" />
          </FormField>
          <FormField label="Grade" error={errors.grade}>
            <Select value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })}>
              <option value="">Select grade...</option>
              {grades.map(g => <option key={g} value={g}>{g}</option>)}
            </Select>
          </FormField>
          <FormField label="Email" error={errors.email}>
            <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="student@school.edu" />
          </FormField>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1">{saving ? "Saving..." : editStudent ? "Save Changes" : "Add Student"}</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Student">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
            <Icon d={Icons.trash} size={28} color="#ef4444" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">Delete {deleteConfirm?.name}?</p>
            <p className="text-sm text-gray-500 mt-1">This will also remove all their grades. This action cannot be undone.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)} className="flex-1">Cancel</Button>
            <Button variant="danger" onClick={() => handleDelete(deleteConfirm.id)} className="flex-1">Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────
// GRADING PAGE
// ─────────────────────────────────────────────
function GradingPage({ onToast }) {
  const [grades, setGrades] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editGrade, setEditGrade] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [filterStudent, setFilterStudent] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [form, setForm] = useState({ studentId: "", subjectId: "", score: "", date: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [scorePreview, setScorePreview] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [g, s, sub] = await Promise.all([apiFetch("/grades"), apiFetch("/students"), apiFetch("/subjects")]);
      setGrades(g); setStudents(s); setSubjects(sub);
    } catch { onToast("Failed to load data", "error"); }
    finally { setLoading(false); }
  }, [onToast]);

  useEffect(() => { load(); }, [load]);

  const filtered = grades.filter(g =>
    (!filterStudent || g.studentId === filterStudent) &&
    (!filterSubject || g.subjectId === filterSubject)
  );

  const openAdd = () => {
    setEditGrade(null);
    setForm({ studentId: "", subjectId: "", score: "", date: new Date().toISOString().slice(0, 10) });
    setErrors({}); setScorePreview(null); setModalOpen(true);
  };

  const openEdit = (g) => {
    setEditGrade(g);
    setForm({ studentId: g.studentId, subjectId: g.subjectId, score: String(g.score), date: g.date });
    setScorePreview(evaluateScore(g.score));
    setErrors({}); setModalOpen(true);
  };

  const validate = () => {
    const e = {};
    if (!form.studentId) e.studentId = "Select a student";
    if (!form.subjectId) e.subjectId = "Select a subject";
    const s = Number(form.score);
    if (form.score === "" || isNaN(s)) e.score = "Score is required";
    else if (!Number.isInteger(s) || s < 0 || s > 100) e.score = "Score must be a whole number between 0 and 100";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = { ...form, score: Number(form.score) };
      if (editGrade) {
        await apiFetch(`/grades/${editGrade.id}`, { method: "PUT", body: JSON.stringify(payload) });
        onToast("Grade updated", "success");
      } else {
        await apiFetch("/grades", { method: "POST", body: JSON.stringify(payload) });
        onToast("Grade added", "success");
      }
      setModalOpen(false);
      load();
    } catch (e) { onToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await apiFetch(`/grades/${id}`, { method: "DELETE" });
      onToast("Grade deleted", "success");
      setDeleteConfirm(null);
      load();
    } catch (e) { onToast(e.message, "error"); }
  };

  const handleScoreChange = (val) => {
    setForm(f => ({ ...f, score: val }));
    const n = Number(val);
    if (!isNaN(n) && n >= 0 && n <= 100) setScorePreview(evaluateScore(Math.round(n)));
    else setScorePreview(null);
  };

  return (
    <div className="space-y-5">
      {/* Filters + Add */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3">
          <Select value={filterStudent} onChange={e => setFilterStudent(e.target.value)} className="w-44">
            <option value="">All Students</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} className="w-44">
            <option value="">All Subjects</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </div>
        <Button onClick={openAdd}><Icon d={Icons.plus} size={16} />Add Grade</Button>
      </div>

      {loading ? <Spinner /> : (
        <Card>
          {filtered.length === 0 ? (
            <EmptyState icon={Icons.grades} title="No grades found"
              subtitle="Add grades to track student performance"
              action={<Button onClick={openAdd}><Icon d={Icons.plus} size={16} />Add Grade</Button>} />
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {["Student", "Subject", "Score", "Rubric", "Points", "Date", "Actions"].map(h => (
                        <th key={h} className="px-5 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(g => (
                      <tr key={g.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-4 font-semibold text-gray-800 text-sm">{g.studentName}</td>
                        <td className="px-5 py-4"><span className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-semibold">{g.subjectName}</span></td>
                        <td className="px-5 py-4 w-32"><ScoreBar score={g.score} /></td>
                        <td className="px-5 py-4"><RubricBadge score={g.score} /></td>
                        <td className="px-5 py-4 text-sm font-bold text-gray-700">{g.points}pts</td>
                        <td className="px-5 py-4 text-sm text-gray-500">{g.date}</td>
                        <td className="px-5 py-4">
                          <div className="flex gap-2">
                            <Button variant="ghost" onClick={() => openEdit(g)} className="p-2"><Icon d={Icons.edit} size={15} /></Button>
                            <Button variant="danger" onClick={() => setDeleteConfirm(g)} className="p-2"><Icon d={Icons.trash} size={15} /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="md:hidden divide-y divide-gray-100">
                {filtered.map(g => (
                  <div key={g.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{g.studentName}</p>
                        <p className="text-xs text-gray-500">{g.subjectName} · {g.date}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" onClick={() => openEdit(g)} className="p-1.5"><Icon d={Icons.edit} size={14} /></Button>
                        <Button variant="danger" onClick={() => setDeleteConfirm(g)} className="p-1.5"><Icon d={Icons.trash} size={14} /></Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <ScoreBar score={g.score} />
                      <RubricBadge score={g.score} />
                      <span className="text-xs font-bold text-gray-600">{g.points}pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      )}

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editGrade ? "Edit Grade" : "Add Grade"}>
        <div className="space-y-4">
          <FormField label="Student" error={errors.studentId}>
            <Select value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })}>
              <option value="">Select student...</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Subject" error={errors.subjectId}>
            <Select value={form.subjectId} onChange={e => setForm({ ...form, subjectId: e.target.value })}>
              <option value="">Select subject...</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Score (0–100)" error={errors.score}>
            <Input type="number" min="0" max="100" step="1" value={form.score}
              onChange={e => handleScoreChange(e.target.value)} placeholder="Enter score (0–100)" />
          </FormField>

          {/* Live Rubric Preview */}
          {scorePreview && (
            <div className="p-4 rounded-xl border-2" style={{ borderColor: scorePreview.color + "40", backgroundColor: scorePreview.color + "10" }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: scorePreview.color }}>Live Preview</p>
                  <p className="font-bold text-gray-800 mt-1">{scorePreview.full}</p>
                  <p className="text-sm text-gray-600">{scorePreview.comment}</p>
                </div>
                <span className="text-2xl font-black" style={{ color: scorePreview.color }}>{scorePreview.points}pts</span>
              </div>
            </div>
          )}

          <FormField label="Date">
            <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          </FormField>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1">{saving ? "Saving..." : editGrade ? "Update" : "Add Grade"}</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Grade">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
            <Icon d={Icons.trash} size={28} color="#ef4444" />
          </div>
          <p className="font-semibold text-gray-800">Delete this grade entry?</p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)} className="flex-1">Cancel</Button>
            <Button variant="danger" onClick={() => handleDelete(deleteConfirm.id)} className="flex-1">Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────
// REPORTS PAGE
// ─────────────────────────────────────────────
function ReportsPage({ onToast }) {
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [studentReport, setStudentReport] = useState(null);
  const [subjectReport, setSubjectReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [activeTab, setActiveTab] = useState("student");

  useEffect(() => {
    Promise.all([apiFetch("/students"), apiFetch("/subjects")])
      .then(([s, sub]) => { setStudents(s); setSubjects(sub); })
      .catch(() => onToast("Failed to load data", "error"));
  }, [onToast]);

  const loadStudentReport = async (id) => {
    if (!id) return;
    setLoadingReport(true);
    try {
      const r = await apiFetch(`/reports/student/${id}`);
      setStudentReport(r);
    } catch (e) { onToast(e.message, "error"); }
    finally { setLoadingReport(false); }
  };

  const loadSubjectReport = async (id) => {
    if (!id) return;
    setLoadingReport(true);
    try {
      const r = await apiFetch(`/reports/subject/${id}`);
      setSubjectReport(r);
    } catch (e) { onToast(e.message, "error"); }
    finally { setLoadingReport(false); }
  };

  return (
    <div className="space-y-5">
      {/* Tab Switcher */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {[{ id: "student", label: "Student Report", icon: Icons.students }, { id: "subject", label: "Subject Report", icon: Icons.book }].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === t.id ? "bg-white shadow-sm text-indigo-600" : "text-gray-500 hover:text-gray-700"}`}>
            <Icon d={t.icon} size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "student" && (
        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-48">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Select Student</label>
                <Select value={selectedStudent} onChange={e => { setSelectedStudent(e.target.value); setStudentReport(null); }}>
                  <option value="">Choose a student...</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </div>
              <Button onClick={() => loadStudentReport(selectedStudent)} disabled={!selectedStudent || loadingReport}>
                {loadingReport ? "Loading..." : "Generate Report"}
              </Button>
            </div>
          </Card>

          {loadingReport && <Spinner />}

          {studentReport && !loadingReport && (
            <div className="space-y-4">
              {/* Student Header */}
              <Card className="p-6">
                <div className="flex flex-wrap items-start gap-4 justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center text-xl font-black text-indigo-600">
                      {studentReport.student.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-gray-900">{studentReport.student.name}</h2>
                      <p className="text-sm text-gray-500">{studentReport.student.grade} · {studentReport.student.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Overall Average</p>
                    <p className="text-4xl font-black text-gray-900">{studentReport.averageScore}<span className="text-lg text-gray-400">%</span></p>
                    <RubricBadge score={Math.round(studentReport.averageScore)} />
                  </div>
                </div>
              </Card>

              {/* Grades Table */}
              <Card>
                <div className="p-5 border-b border-gray-100"><h3 className="font-bold text-gray-800">Grade Breakdown</h3></div>
                {studentReport.grades.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No grades recorded for this student</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-50">
                          {["Subject", "Score", "Rubric", "Points", "Comment", "Date"].map(h => (
                            <th key={h} className="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {studentReport.grades.map(g => (
                          <tr key={g.id} className="hover:bg-gray-50/50">
                            <td className="px-5 py-3 font-medium text-gray-800 text-sm">{g.subjectName}</td>
                            <td className="px-5 py-3 w-28"><ScoreBar score={g.score} /></td>
                            <td className="px-5 py-3"><RubricBadge score={g.score} /></td>
                            <td className="px-5 py-3 text-sm font-bold text-gray-700">{g.points}</td>
                            <td className="px-5 py-3 text-sm text-gray-500">{g.comment}</td>
                            <td className="px-5 py-3 text-sm text-gray-400">{g.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      )}

      {activeTab === "subject" && (
        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-48">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Select Subject</label>
                <Select value={selectedSubject} onChange={e => { setSelectedSubject(e.target.value); setSubjectReport(null); }}>
                  <option value="">Choose a subject...</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </div>
              <Button onClick={() => loadSubjectReport(selectedSubject)} disabled={!selectedSubject || loadingReport}>
                {loadingReport ? "Loading..." : "Generate Report"}
              </Button>
            </div>
          </Card>

          {loadingReport && <Spinner />}

          {subjectReport && !loadingReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { label: "Subject", value: subjectReport.subject.name },
                  { label: "Average Score", value: `${subjectReport.averageScore}%` },
                  { label: "Pass Rate (≥58)", value: `${subjectReport.passRate}%` },
                ].map(stat => (
                  <Card key={stat.label} className="p-4">
                    <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                    <p className="text-2xl font-black text-gray-900 mt-1">{stat.value}</p>
                  </Card>
                ))}
              </div>

              <Card>
                <div className="p-5 border-b border-gray-100"><h3 className="font-bold text-gray-800">Student Performance</h3></div>
                {subjectReport.grades.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No grades for this subject</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-50">
                          {["Student", "Score", "Rubric", "Points", "Date"].map(h => (
                            <th key={h} className="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {subjectReport.grades.sort((a, b) => b.score - a.score).map(g => (
                          <tr key={g.id} className="hover:bg-gray-50/50">
                            <td className="px-5 py-3 font-medium text-gray-800 text-sm">{g.studentName}</td>
                            <td className="px-5 py-3 w-28"><ScoreBar score={g.score} /></td>
                            <td className="px-5 py-3"><RubricBadge score={g.score} /></td>
                            <td className="px-5 py-3 text-sm font-bold text-gray-700">{g.points}</td>
                            <td className="px-5 py-3 text-sm text-gray-400">{g.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// APP SHELL
// ─────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: Icons.dashboard },
  { id: "students", label: "Students", icon: Icons.students },
  { id: "grading", label: "Grading", icon: Icons.grades },
  { id: "reports", label: "Reports", icon: Icons.reports },
];

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [toast, setToast] = useState({ msg: "", type: "info" });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const showToast = useCallback((msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "info" }), 3500);
  }, []);

  const navigate = (id) => { setPage(id); setMobileNavOpen(false); };

  const pageComponents = {
    dashboard: <DashboardPage />,
    students: <StudentsPage onToast={showToast} />,
    grading: <GradingPage onToast={showToast} />,
    reports: <ReportsPage onToast={showToast} />,
  };

  const pageTitles = { dashboard: "Dashboard", students: "Student Management", grading: "Grading System", reports: "Reports" };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        * { font-family: 'Plus Jakarta Sans', sans-serif; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
      `}</style>

      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-100 flex-col z-30">
        {/* Logo */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Icon d={Icons.award} size={20} color="white" />
            </div>
            <div>
              <p className="text-sm font-black text-gray-900 leading-tight">EduManage Pro</p>
              <p className="text-xs text-gray-400">Exam Management</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => navigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${page === item.id ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}>
              <Icon d={item.icon} size={18} color={page === item.id ? "white" : "currentColor"} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 mx-4 mb-4 bg-indigo-50 rounded-xl">
          <p className="text-xs font-bold text-indigo-700">Flask API</p>
          <p className="text-xs text-indigo-500 mt-0.5">Running on port 18080</p>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Icon d={Icons.award} size={16} color="white" />
          </div>
          <span className="font-black text-gray-900 text-sm">EduManage Pro</span>
        </div>
        <button onClick={() => setMobileNavOpen(true)} className="p-2 hover:bg-gray-100 rounded-lg">
          <Icon d={Icons.menu} size={20} />
        </button>
      </header>

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileNavOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-white flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
                  <Icon d={Icons.award} size={18} color="white" />
                </div>
                <div>
                  <p className="font-black text-gray-900 text-sm">EduManage Pro</p>
                  <p className="text-xs text-gray-400">Exam Management</p>
                </div>
              </div>
              <button onClick={() => setMobileNavOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <Icon d={Icons.close} size={18} />
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              {NAV_ITEMS.map(item => (
                <button key={item.id} onClick={() => navigate(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${page === item.id ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}>
                  <Icon d={item.icon} size={18} color={page === item.id ? "white" : "currentColor"} />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-30">
        {NAV_ITEMS.map(item => (
          <button key={item.id} onClick={() => navigate(item.id)}
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors ${page === item.id ? "text-indigo-600" : "text-gray-400"}`}>
            <Icon d={item.icon} size={20} />
            <span className="text-xs font-semibold">{item.label.split(" ")[0]}</span>
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 pb-20 lg:pb-0 min-h-screen">
        <div className="p-5 lg:p-8 max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl lg:text-3xl font-black text-gray-900">{pageTitles[page]}</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {page === "dashboard" && "Overview of your exam management system"}
              {page === "students" && "Manage student records and information"}
              {page === "grading" && "Enter and manage student grades"}
              {page === "reports" && "Generate and view performance reports"}
            </p>
          </div>

          {pageComponents[page]}
        </div>
      </main>

      <Toast msg={toast.msg} type={toast.type} />
    </div>
  );
}
