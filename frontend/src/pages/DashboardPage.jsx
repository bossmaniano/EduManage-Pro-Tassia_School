import { useState, useEffect } from "react";
import { apiFetch } from "../utils/api";
import { useAuth } from "../contexts/AuthContext";
import { Icon, Icons, Card, Spinner, RubricBadge, ScoreBar, evaluateScore } from "../components/ui";

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    Promise.all([
      apiFetch("/api/dashboard/summary"),
      apiFetch("/api/subjects")
    ])
      .then(async ([dashRes, subRes]) => {
        if (dashRes?.ok) setData(await dashRes.json());
        if (subRes?.ok) setSubjects(await subRes.json());
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!data) return <div className="text-center text-gray-500 py-20">Could not connect to backend. Make sure Flask is running on port 18080.</div>;

  // For teachers, show only their assigned subjects in subject averages
  const displaySubjects = user?.role === "Teacher" && user?.assignedSubjects?.length > 0
    ? (data.subjectAverages || []).filter(sa => {
        const subject = subjects.find(sub => sub.name === sa.subject);
        return subject && user.assignedSubjects.includes(subject.id);
      })
    : data.subjectAverages || [];

  const stats = [
    { label: "Total Students", value: data.totalStudents, icon: Icons.students, color: "bg-indigo-500", bg: "bg-indigo-50", iconColor: "#6366f1" },
    { label: "Total Subjects", value: data.totalSubjects, icon: Icons.book, color: "bg-purple-500", bg: "bg-purple-50", iconColor: "#a855f7" },
    { label: "Grades Entered", value: data.totalGradesEntered, icon: Icons.grades, color: "bg-emerald-500", bg: "bg-emerald-50", iconColor: "#10b981" },
    { label: "Average Score", value: `${data.averageScore}%`, icon: Icons.award, color: "bg-amber-500", bg: "bg-amber-50", iconColor: "#f59e0b" },
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
                <Icon d={s.icon} size={22} color={s.iconColor} />
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
          <h3 className="font-bold text-gray-800 mb-5 text-lg">
            {user?.role === "Teacher" ? "My Subjects" : "Subject Averages"}
          </h3>
          <div className="space-y-3">
            {displaySubjects.map((s) => (
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
                  <p className="text-xs text-gray-400">{s.class}</p>
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
