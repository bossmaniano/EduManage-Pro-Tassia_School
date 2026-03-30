import { useState, useEffect, useCallback, useRef } from "react";
import { apiFetch } from "../utils/api";
import { useAuth } from "../contexts/AuthContext";
import { Icon, Icons, Card, Modal, FormField, Input, Select, Button, EmptyState, Spinner, RubricBadge, ScoreBar, evaluateScore } from "../components/ui";

// ── Admin Grade Management ──────────────────────────────────────────────────
function AdminGradesPage({ onToast }) {
  const [grades, setGrades] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [examInstances, setExamInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editGrade, setEditGrade] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [filterStudent, setFilterStudent] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [form, setForm] = useState({ studentId: "", subjectId: "", examInstanceId: "", score: "", date: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [scorePreview, setScorePreview] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [gRes, sRes, subRes, exRes, cRes] = await Promise.all([
        apiFetch("/api/grades"), apiFetch("/api/students"),
        apiFetch("/api/subjects"), apiFetch("/api/exam-instances"),
        apiFetch("/api/classes"),
      ]);
      if (gRes?.ok) setGrades(await gRes.json());
      if (sRes?.ok) setStudents(await sRes.json());
      if (subRes?.ok) setSubjects(await subRes.json());
      if (exRes?.ok) setExamInstances(await exRes.json());
      if (cRes?.ok) setClasses(await cRes.json());
    } catch { onToast("Failed to load data", "error"); }
    finally { setLoading(false); }
  }, [onToast]);

  useEffect(() => { load(); }, [load]);

  // Filter students by selected class
  const filteredStudents = filterClass 
    ? students.filter(s => s.classId === filterClass)
    : students;

  const filtered = grades.filter(g =>
    (!filterStudent || g.studentId === filterStudent) &&
    (!filterSubject || g.subjectId === filterSubject) &&
    (!filterClass || (students.find(s => s.id === g.studentId)?.classId === filterClass))
  );

  const openAdd = () => {
    setEditGrade(null);
    setForm({ studentId: "", subjectId: "", examInstanceId: "", score: "", date: new Date().toISOString().slice(0, 10) });
    setErrors({}); setScorePreview(null); setModalOpen(true);
  };

  const openEdit = (g) => {
    setEditGrade(g);
    setForm({ studentId: g.studentId, subjectId: g.subjectId, examInstanceId: g.examInstanceId || "", score: String(g.score), date: g.date });
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
        const res = await apiFetch(`/api/grades/${editGrade.id}`, { method: "PUT", body: payload });
        if (!res || !res.ok) { const d = await res?.json().catch(() => ({})); throw new Error(d.error || "Update failed"); }
        onToast("Grade updated", "success");
      } else {
        const res = await apiFetch("/api/grades", { method: "POST", body: payload });
        if (!res || !res.ok) { const d = await res?.json().catch(() => ({})); throw new Error(d.error || "Create failed"); }
        onToast("Grade added", "success");
      }
      setModalOpen(false); load();
    } catch (e) { onToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      const res = await apiFetch(`/api/grades/${id}`, { method: "DELETE" });
      if (!res || !res.ok) throw new Error("Delete failed");
      onToast("Grade deleted", "success");
      setDeleteConfirm(null); load();
    } catch (e) { onToast(e.message, "error"); }
  };

  const handleScoreChange = (val) => {
    // Prevent values greater than 100 from being typed
    const n = Number(val);
    if (!isNaN(n) && n > 100) {
      onToast("Invalid Mark: Maximum is 100.", "error");
      return; // Don't update state with invalid value
    }
    setForm(f => ({ ...f, score: val }));
    if (!isNaN(n) && n >= 0 && n <= 100) setScorePreview(evaluateScore(Math.round(n)));
    else setScorePreview(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3">
          <Select value={filterClass} onChange={e => { setFilterClass(e.target.value); setFilterStudent(""); }} className="w-44">
            <option value="">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select value={filterStudent} onChange={e => setFilterStudent(e.target.value)} className="w-44">
            <option value="">All Students</option>
            {filteredStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {["Student", "Subject", "Score", "Rubric", "Points", "Date", "Status", "Actions"].map(h => (
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
                          {g.isLocked ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold">🔒 Locked</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-semibold">🔓 Open</span>
                          )}
                        </td>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editGrade ? "Edit Grade" : "Add Grade"}>
        <div className="space-y-4">
          <FormField label="Student" error={errors.studentId}>
            <Select value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })}>
              <option value="">Select student...</option>
              {filteredStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Subject" error={errors.subjectId}>
            <Select value={form.subjectId} onChange={e => setForm({ ...form, subjectId: e.target.value })}>
              <option value="">Select subject...</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Exam Instance (optional)">
            <Select value={form.examInstanceId} onChange={e => setForm({ ...form, examInstanceId: e.target.value })}>
              <option value="">Select exam instance...</option>
              {examInstances.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Score (0–100)" error={errors.score}>
            <Input type="number" min="0" max="100" step="1" value={form.score}
              onChange={e => handleScoreChange(e.target.value)} placeholder="Enter score (0–100)" />
          </FormField>
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

// ── Teacher Grade Entry (with lock enforcement) ──────────────────────────────
function TeacherGradesPage({ onToast }) {
  const { user } = useAuth();
  const assignedSubjects = user?.assignedSubjects || [];
  const assignedClasses = user?.assignedClasses || [];

  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [examInstances, setExamInstances] = useState([]);
  const [grades, setGrades] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedExam, setSelectedExam] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [searchStudent, setSearchStudent] = useState("");

  // Filter students by selected class, or teacher's assigned classes, and search
  const filteredStudents = (filterClass
    ? students.filter(s => s.classId === filterClass)
    : (assignedClasses.length > 0
        ? students.filter(s => s.classId && assignedClasses.includes(s.classId))
        : students)
  ).filter(s => 
    !searchStudent || s.name.toLowerCase().includes(searchStudent.toLowerCase())
  );

  // Available classes for filter dropdown
  const availableClasses = assignedClasses.length > 0
    ? classes.filter(c => assignedClasses.includes(c.id))
    : classes;

  // Map: studentId -> { score, submitting, submitted, gradeId, isLocked, saving, saved }
  const [scoreMap, setScoreMap] = useState({});
  
  // Synchronous lock to prevent race conditions between onBlur and onKeyDown
  const isProcessing = useRef({});
  
  // Track last saved value per student to prevent duplicate saves of same value
  const lastSavedValue = useRef({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, subRes, exRes, gRes, cRes] = await Promise.all([
        apiFetch("/api/students"), apiFetch("/api/subjects"),
        apiFetch("/api/exam-instances"), apiFetch("/api/grades"),
        apiFetch("/api/classes"),
      ]);
      if (sRes?.ok) setStudents(await sRes.json());
      if (subRes?.ok) {
        const allSubs = await subRes.json();
        setSubjects(allSubs.filter(s => assignedSubjects.includes(s.id)));
      }
      if (exRes?.ok) setExamInstances(await exRes.json());
      if (gRes?.ok) setGrades(await gRes.json());
      if (cRes?.ok) setClasses(await cRes.json());
    } catch { onToast("Failed to load data", "error"); }
    finally { setLoading(false); }
  }, [onToast]);

  useEffect(() => { load(); }, [load]);

  // When exam+subject changes, populate scoreMap from existing grades
  useEffect(() => {
    if (!selectedExam || !selectedSubject) { 
      setScoreMap({}); 
      lastSavedValue.current = {};
      return; 
    }
    const map = {};
    const relevant = grades.filter(g => g.examInstanceId === selectedExam && g.subjectId === selectedSubject);
    relevant.forEach(g => {
      map[g.studentId] = { score: String(g.score), submitted: true, gradeId: g.id, isLocked: g.isLocked };
      // Initialize lastSavedValue for existing grades
      lastSavedValue.current[g.studentId] = String(g.score);
    });
    setScoreMap(map);
  }, [selectedExam, selectedSubject, grades]);

  const handleScoreChange = (studentId, val) => {
    // Prevent values greater than 100 from being typed
    const numVal = Number(val);
    if (!isNaN(numVal) && numVal > 100) {
      onToast("Invalid Mark: Maximum is 100.", "error");
      return; // Don't update state with invalid value
    }
    setScoreMap(prev => ({ ...prev, [studentId]: { ...prev[studentId], score: val, saved: false } }));
  };

  // Auto-save on blur (when teacher clicks out or presses Tab)
  // Also save on Enter key press
  const handleScoreBlur = useCallback(async (studentId) => {
    // Task 1: Synchronous useRef lock - prevents race conditions
    if (isProcessing.current[studentId]) return;
    isProcessing.current[studentId] = true;
    
    const entry = scoreMap[studentId];
    if (!entry) {
      isProcessing.current[studentId] = false;
      return;
    }
    
    // Skip if already saving or already submitted/locked
    if (entry.saving || entry.submitted || entry.isLocked) {
      isProcessing.current[studentId] = false;
      return;
    }
    
    // Task 2: Value equality check - prevent saving same value
    const currentValue = entry.score;
    if (lastSavedValue.current[studentId] === currentValue) {
      isProcessing.current[studentId] = false;
      return;
    }
    
    // Validate score
    const score = Number(currentValue);
    if (isNaN(score) || score < 0 || score > 100 || !Number.isInteger(score)) {
      isProcessing.current[studentId] = false;
      return;
    }
    
    // Set saving state immediately to prevent duplicate requests
    setScoreMap(prev => ({ ...prev, [studentId]: { ...prev[studentId], saving: true } }));
    
    try {
      const payload = { 
        studentId, 
        subjectId: selectedSubject, 
        examInstanceId: selectedExam, 
        score, 
        date: new Date().toISOString().slice(0, 10) 
      };
      const res = await apiFetch("/api/grades", { method: "POST", body: payload });
      if (!res || !res.ok) { 
        const d = await res?.json().catch(() => ({})); 
        throw new Error(d.error || "Auto-save failed"); 
      }
      const newGrade = await res.json();
      
      // Task 2: Update last saved value after successful save
      lastSavedValue.current[studentId] = currentValue;
      
      // Update with changedBy from backend (real-time audit info)
      setScoreMap(prev => ({ 
        ...prev, 
        [studentId]: { 
          score: String(score), 
          submitted: true, 
          gradeId: newGrade.id, 
          isLocked: true, 
          saving: false, 
          saved: true,
          changedBy: newGrade.changedBy || null,
          updatedAt: new Date().toISOString()
        } 
      }));
    } catch (e) {
      onToast(e.message, "error");
      setScoreMap(prev => ({ ...prev, [studentId]: { ...prev[studentId], saving: false } }));
    } finally {
      isProcessing.current[studentId] = false;
    }
  }, [scoreMap, onToast, selectedExam, selectedSubject]); // useCallback dependencies
  
  const handleSubmitGrade = async (studentId) => {
    const entry = scoreMap[studentId] || {};
    const score = Number(entry.score);
    if (isNaN(score) || score < 0 || score > 100 || !Number.isInteger(score)) {
      onToast("Score must be a whole number 0–100", "error"); return;
    }
    setScoreMap(prev => ({ ...prev, [studentId]: { ...prev[studentId], submitting: true } }));
    try {
      const payload = { studentId, subjectId: selectedSubject, examInstanceId: selectedExam, score, date: new Date().toISOString().slice(0, 10) };
      const res = await apiFetch("/api/grades", { method: "POST", body: payload });
      if (!res || !res.ok) { const d = await res?.json().catch(() => ({})); throw new Error(d.error || "Submit failed"); }
      const newGrade = await res.json();
      onToast("Grade submitted and locked", "success");
      setScoreMap(prev => ({ ...prev, [studentId]: { score: String(score), submitted: true, gradeId: newGrade.id, isLocked: true, submitting: false } }));
    } catch (e) {
      onToast(e.message, "error");
      setScoreMap(prev => ({ ...prev, [studentId]: { ...prev[studentId], submitting: false } }));
    }
  };

  const mySubjects = subjects;

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
        <p className="text-sm font-semibold text-indigo-700">📝 Grade Entry</p>
        <p className="text-sm text-indigo-600 mt-1">Select an exam and subject, then enter scores for each student. Once submitted, grades are <strong>locked</strong> and cannot be edited. Contact an administrator for corrections.</p>
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="space-y-1">
          <label className="block text-sm font-semibold text-gray-700">Exam Instance</label>
          <Select value={selectedExam} onChange={e => setSelectedExam(e.target.value)}>
            <option value="">-- Select Exam --</option>
            {examInstances.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
          </Select>
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-semibold text-gray-700">Your Subject</label>
          <Select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
            <option value="">-- Select Subject --</option>
            {mySubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-semibold text-gray-700">Filter by Class</label>
          <Select value={filterClass} onChange={e => setFilterClass(e.target.value)}>
            <option value="">{assignedClasses.length > 0 ? "-- My Classes --" : "-- All Classes --"}</option>
            {availableClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-semibold text-gray-700">Search Student</label>
          <Input 
            type="text" 
            placeholder="Search by name..." 
            value={searchStudent} 
            onChange={e => setSearchStudent(e.target.value)}
          />
        </div>
      </div>

      {loading ? <Spinner /> : selectedExam && selectedSubject ? (
        <Card>
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-bold text-gray-800">Student Score Entry</h3>
            <p className="text-xs text-gray-400 mt-0.5">Enter scores 0–100. Click Submit to lock the grade.</p>
          </div>
          {filteredStudents.length === 0 ? (
            <EmptyState icon={Icons.students} title="No students found" subtitle={filterClass ? "No students in selected class" : "Add students to the system first"} />
          ) : (
            <div className="divide-y divide-gray-50">
              {filteredStudents.map(student => {
                const entry = scoreMap[student.id] || {};
                const isLocked = entry.isLocked;
                const isSubmitted = entry.submitted;
                const preview = entry.score !== undefined && entry.score !== "" ? evaluateScore(Number(entry.score)) : null;

                return (
                  <div key={student.id} className="p-4 flex flex-wrap items-center gap-4">
                    {/* Student info */}
                    <div className="flex items-center gap-3 flex-1 min-w-48">
                      <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600 flex-shrink-0">
                        {student.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{student.name}</p>
                        <p className="text-xs text-gray-400">{student.grade}</p>
                      </div>
                    </div>

                    {/* Score input */}
                    <div className="flex items-center gap-3">
                      {isLocked || isSubmitted ? (
                        <div className="flex items-center gap-2">
                          <div className="px-4 py-3 bg-gray-100 rounded-xl text-base font-bold text-gray-700 w-24 text-center">
                            {entry.score}
                          </div>
                          {preview && <RubricBadge score={Number(entry.score)} />}
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-semibold">
                            🔒 Locked
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            type="number" min="0" max="100" step="1"
                            inputMode="decimal"
                            value={entry.score || ""}
                            onChange={e => handleScoreChange(student.id, e.target.value)}
                            onBlur={() => handleScoreBlur(student.id)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.target.blur(); // Only blur - onBlur will handle the save
                              }
                            }}
                            placeholder="0–100"
                            className="w-24 px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 text-center font-bold"
                          />
                          {entry.saving ? (
                            <span className="text-xs text-gray-400">Saving...</span>
                          ) : entry.saved ? (
                            <span 
                              className="text-green-600 text-xs font-semibold cursor-help" 
                              title={`Saved by ${entry.changedBy || 'Unknown'} at ${entry.updatedAt ? new Date(entry.updatedAt).toLocaleTimeString() : 'just now'}`}
                            >✓ Saved</span>
                          ) : preview ? (
                            <RubricBadge score={Number(entry.score)} />
                          ) : null}
                          <Button
                            onClick={() => handleSubmitGrade(student.id)}
                            disabled={entry.submitting || !entry.score}
                            className="text-xs px-3 py-2"
                          >
                            {entry.submitting ? "..." : "Submit"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {/* Locked warning banner */}
          <div className="p-4 bg-amber-50 border-t border-amber-100 rounded-b-2xl">
            <p className="text-xs text-amber-700 font-medium">
              ⚠️ Submitted grades are locked. If you need to make a correction, please contact the system administrator.
            </p>
          </div>
        </Card>
      ) : (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">👆 Select an exam instance and subject above to begin entering grades.</p>
        </div>
      )}
    </div>
  );
}

// ── Main export (role-gated) ─────────────────────────────────────────────────
export default function GradesPage({ onToast }) {
  const { isAdmin, isTeacher } = useAuth();

  if (isAdmin) return <AdminGradesPage onToast={onToast} />;
  if (isTeacher) return <TeacherGradesPage onToast={onToast} />;
  return null;
}
