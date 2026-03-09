import { useState } from "react";
import { apiFetch } from "../utils/api";
import { Icon, Icons, Card, Spinner, RubricBadge, ScoreBar, Button } from "../components/ui";

export default function CorrectionsPage({ onToast }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  // Map gradeId -> { editing, newScore, saving }
  const [editMap, setEditMap] = useState({});

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setSearching(true);
    try {
      // Search students then get their grades
      const sRes = await apiFetch("/api/students");
      if (!sRes || !sRes.ok) throw new Error("Failed to load students");
      const allStudents = await sRes.json();

      const matched = allStudents.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id.toLowerCase().includes(searchTerm.toLowerCase())
      );

      if (matched.length === 0) {
        setSearchResults([]);
        return;
      }

      const gRes = await apiFetch("/api/grades");
      if (!gRes || !gRes.ok) throw new Error("Failed to load grades");
      const allGrades = await gRes.json();

      const results = matched.map(student => ({
        student,
        grades: allGrades.filter(g => g.studentId === student.id),
      }));

      setSearchResults(results);
    } catch (e) { onToast(e.message, "error"); }
    finally { setSearching(false); }
  };

  const handleUnlock = async (gradeId) => {
    setEditMap(prev => ({ ...prev, [gradeId]: { ...prev[gradeId], saving: true } }));
    try {
      const res = await apiFetch(`/api/admin/grades/${gradeId}/unlock`, { method: "POST" });
      if (!res || !res.ok) { const d = await res?.json().catch(() => ({})); throw new Error(d.error || "Unlock failed"); }
      onToast("Grade unlocked for editing", "success");
      setEditMap(prev => ({ ...prev, [gradeId]: { editing: true, newScore: "", saving: false } }));
    } catch (e) {
      onToast(e.message, "error");
      setEditMap(prev => ({ ...prev, [gradeId]: { ...prev[gradeId], saving: false } }));
    }
  };

  const handleSaveCorrection = async (gradeId, originalScore) => {
    const entry = editMap[gradeId] || {};
    const newScore = Number(entry.newScore);
    if (isNaN(newScore) || newScore < 0 || newScore > 100 || !Number.isInteger(newScore)) {
      onToast("Score must be a whole number 0–100", "error"); return;
    }
    setEditMap(prev => ({ ...prev, [gradeId]: { ...prev[gradeId], saving: true } }));
    try {
      const res = await apiFetch(`/api/admin/grades/${gradeId}`, { method: "PUT", body: { score: newScore } });
      if (!res || !res.ok) { const d = await res?.json().catch(() => ({})); throw new Error(d.error || "Save failed"); }
      onToast("Correction saved and grade re-locked", "success");
      setEditMap(prev => ({ ...prev, [gradeId]: { editing: false, newScore: "", saving: false } }));
      // Refresh search results
      handleSearch();
    } catch (e) {
      onToast(e.message, "error");
      setEditMap(prev => ({ ...prev, [gradeId]: { ...prev[gradeId], saving: false } }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
        <p className="text-sm font-semibold text-amber-700">🔧 Grade Corrections</p>
        <p className="text-sm text-amber-600 mt-1">
          Search for a student, unlock their locked grade, make the correction, then save. The grade will be automatically re-locked after saving.
        </p>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <div className="absolute left-3 top-3"><Icon d={Icons.search} size={16} color="#9ca3af" /></div>
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="Search by student name or ID..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <Button onClick={handleSearch} disabled={searching || !searchTerm.trim()}>
          {searching ? "Searching..." : "Search"}
        </Button>
      </div>

      {searching && <Spinner />}

      {searchResults !== null && !searching && (
        searchResults.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>No students found matching "{searchTerm}"</p>
          </div>
        ) : (
          <div className="space-y-6">
            {searchResults.map(({ student, grades }) => (
              <Card key={student.id}>
                {/* Student header */}
                <div className="p-5 border-b border-gray-100 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600">
                    {student.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{student.name}</p>
                    <p className="text-sm text-gray-400">{student.grade} · {student.email}</p>
                  </div>
                </div>

                {/* Grades table */}
                {grades.length === 0 ? (
                  <div className="p-6 text-center text-sm text-gray-400">No grades recorded for this student.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100">
                          {["Subject", "Score", "Rubric", "Exam", "Status", "Actions"].map(h => (
                            <th key={h} className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {grades.map(g => {
                          const entry = editMap[g.id] || {};
                          const isEditing = entry.editing;
                          const isSaving = entry.saving;
                          return (
                            <tr key={g.id} className="hover:bg-gray-50/50">
                              <td className="px-5 py-4">
                                <span className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-semibold">{g.subjectName}</span>
                              </td>
                              <td className="px-5 py-4 w-32">
                                {isEditing ? (
                                  <input
                                    type="number" min="0" max="100" step="1"
                                    value={entry.newScore}
                                    onChange={e => setEditMap(prev => ({ ...prev, [g.id]: { ...prev[g.id], newScore: e.target.value } }))}
                                    placeholder={String(g.score)}
                                    className="w-20 px-2 py-1 rounded-lg border-2 border-indigo-400 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    autoFocus
                                  />
                                ) : (
                                  <ScoreBar score={g.score} />
                                )}
                              </td>
                              <td className="px-5 py-4"><RubricBadge score={isEditing ? (Number(entry.newScore) || g.score) : g.score} /></td>
                              <td className="px-5 py-4 text-sm text-gray-500">{g.examInstanceName || g.examInstanceId || "—"}</td>
                              <td className="px-5 py-4">
                                {g.isLocked ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold">🔒 Locked</span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-semibold">🔓 Unlocked</span>
                                )}
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex gap-2">
                                  {isEditing ? (
                                    <>
                                      <Button
                                        variant="success"
                                        onClick={() => handleSaveCorrection(g.id, g.score)}
                                        disabled={isSaving || !entry.newScore}
                                        className="text-xs px-3 py-1.5"
                                      >
                                        {isSaving ? "Saving..." : "Save Correction"}
                                      </Button>
                                      <Button
                                        variant="secondary"
                                        onClick={() => setEditMap(prev => ({ ...prev, [g.id]: { editing: false } }))}
                                        disabled={isSaving}
                                        className="text-xs px-3 py-1.5"
                                      >
                                        Cancel
                                      </Button>
                                    </>
                                  ) : g.isLocked ? (
                                    <Button
                                      variant="warning"
                                      onClick={() => handleUnlock(g.id)}
                                      disabled={isSaving}
                                      className="text-xs px-3 py-1.5"
                                    >
                                      {isSaving ? "Unlocking..." : "🔓 Unlock"}
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="primary"
                                      onClick={() => setEditMap(prev => ({ ...prev, [g.id]: { editing: true, newScore: String(g.score), saving: false } }))}
                                      className="text-xs px-3 py-1.5"
                                    >
                                      Edit Score
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}
