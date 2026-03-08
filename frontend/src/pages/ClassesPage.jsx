import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../utils/api";
import { Icon, Icons, Card, Modal, FormField, Input, Button, EmptyState, Spinner } from "../components/ui";

export default function ClassesPage({ onToast }) {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editClass, setEditClass] = useState(null);
  const [form, setForm] = useState({ name: "", academicYear: "", subjects: [] });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [rosterClass, setRosterClass] = useState(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [assignedStudents, setAssignedStudents] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([apiFetch("/api/classes"), apiFetch("/api/subjects")])
      .then(async ([classesRes, subjectsRes]) => {
        if (classesRes?.ok) setClasses(await classesRes.json());
        if (subjectsRes?.ok) setSubjects(await subjectsRes.json());
      })
      .catch(() => onToast("Failed to load data", "error"))
      .finally(() => setLoading(false));
  }, [onToast]);

  const loadAllStudents = useCallback(async () => {
    try {
      const res = await apiFetch("/api/students");
      if (res?.ok) {
        return await res.json();
      }
    } catch (e) {
      onToast("Failed to load students", "error");
    }
    return [];
  }, [onToast]);

  const loadRoster = useCallback(async (classItem) => {
    setRosterLoading(true);
    setRosterClass(classItem);
    try {
      const [assignedRes, allStudentsRes] = await Promise.all([
        apiFetch(`/api/classes/${classItem.id}/students`),
        loadAllStudents()
      ]);

      let assigned = [];
      if (assignedRes?.ok) {
        assigned = await assignedRes.json();
      }

      // Available students are those not in the class
      const assignedIds = new Set(assigned.map(s => s.id));
      const available = allStudentsRes.filter(s => !assignedIds.has(s.id));

      setAssignedStudents(assigned);
      setAvailableStudents(available);
    } catch (e) {
      onToast("Failed to load roster", "error");
    } finally {
      setRosterLoading(false);
    }
  }, [loadAllStudents, onToast]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditClass(null);
    setForm({ name: "", academicYear: new Date().getFullYear().toString(), subjects: [] });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (cls) => {
    setEditClass(cls);
    setForm({ name: cls.name, academicYear: cls.academicYear, subjects: cls.subjects || [] });
    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Class name is required";
    if (!form.academicYear.trim()) e.academicYear = "Academic year is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editClass) {
        const res = await apiFetch(`/api/classes/${editClass.id}`, { method: "PUT", body: form });
        if (!res || !res.ok) { const d = await res?.json().catch(() => ({})); throw new Error(d.error || "Update failed"); }
        onToast("Class updated", "success");
      } else {
        const res = await apiFetch("/api/classes", { method: "POST", body: form });
        if (!res || !res.ok) { const d = await res?.json().catch(() => ({})); throw new Error(d.error || "Create failed"); }
        onToast("Class created", "success");
      }
      setModalOpen(false);
      load();
    } catch (e) { onToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      const res = await apiFetch(`/api/classes/${id}`, { method: "DELETE" });
      if (!res || !res.ok) throw new Error("Delete failed");
      onToast("Class deleted", "success");
      setDeleteConfirm(null);
      load();
    } catch (e) { onToast(e.message, "error"); }
  };

  const handleAddStudent = async (studentId) => {
    try {
      const res = await apiFetch(`/api/students/${studentId}/class`, { method: "PUT", body: { classId: rosterClass.id } });
      if (!res || !res.ok) throw new Error("Failed to assign student");
      onToast("Student added to class", "success");
      // Refresh roster
      loadRoster(rosterClass);
    } catch (e) { onToast(e.message, "error"); }
  };

  const handleRemoveStudent = async (studentId) => {
    try {
      const res = await apiFetch(`/api/students/${studentId}/class`, { method: "PUT", body: { classId: null } });
      if (!res || !res.ok) throw new Error("Failed to remove student");
      onToast("Student removed from class", "success");
      // Refresh roster
      loadRoster(rosterClass);
    } catch (e) { onToast(e.message, "error"); }
  };

  const filteredAvailableStudents = availableStudents.filter(s =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const academicYears = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear - 2; y <= currentYear + 2; y++) {
    academicYears.push(y.toString());
  }

  const toggleSubject = (subjectId) => {
    setForm(f => ({
      ...f,
      subjects: f.subjects.includes(subjectId)
        ? f.subjects.filter(s => s !== subjectId)
        : [...f.subjects, subjectId],
    }));
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={openAdd}><Icon d={Icons.plus} size={16} />Create New Class</Button>
      </div>

      {loading ? <Spinner /> : classes.length === 0 ? (
          <Card>
            <EmptyState icon={Icons.users} title="No classes yet"
              subtitle="Create your first class to organize students"
              action={<Button onClick={openAdd}><Icon d={Icons.plus} size={16} />Create New Class</Button>} />
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map(cls => (
              <Card key={cls.id} className="hover:shadow-md transition-shadow">
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center">
                      <Icon d={Icons.users} size={20} color="#6366f1" />
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" onClick={() => openEdit(cls)} className="p-2">
                        <Icon d={Icons.edit} size={15} />
                      </Button>
                      <Button variant="danger" onClick={() => setDeleteConfirm(cls)} className="p-2">
                        <Icon d={Icons.trash} size={15} />
                      </Button>
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-1">{cls.name}</h3>
                  <p className="text-sm text-gray-500 mb-4">Academic Year: {cls.academicYear}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {cls.studentCount || 0} student{cls.studentCount !== 1 ? 's' : ''}
                    </span>
                    <Button variant="secondary" onClick={() => loadRoster(cls)} className="text-xs">
                      Manage Roster
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editClass ? "Edit Class" : "Create New Class"}>
        <div className="space-y-4">
          <FormField label="Class Name" error={errors.name}>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Grade 10" />
          </FormField>
          <FormField label="Academic Year" error={errors.academicYear}>
            <select
              value={form.academicYear}
              onChange={e => setForm({ ...form, academicYear: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 transition-all"
            >
              <option value="">Select year...</option>
              {academicYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </FormField>
          <FormField label="Subjects">
            <div className="space-y-2 mt-1 max-h-48 overflow-y-auto">
              {subjects.map(s => (
                <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.subjects.includes(s.id)}
                    onChange={() => toggleSubject(s.id)}
                    className="w-4 h-4 rounded accent-indigo-600"
                  />
                  <span className="text-sm text-gray-700">{s.name}</span>
                </label>
              ))}
              {subjects.length === 0 && <p className="text-xs text-gray-400">No subjects available</p>}
            </div>
          </FormField>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1">{saving ? "Saving..." : editClass ? "Save Changes" : "Create"}</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Class">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
            <Icon d={Icons.trash} size={28} color="#ef4444" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">Delete "{deleteConfirm?.name}"?</p>
            <p className="text-sm text-gray-500 mt-1">Students will be unassigned from this class. This action cannot be undone.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)} className="flex-1">Cancel</Button>
            <Button variant="danger" onClick={() => handleDelete(deleteConfirm.id)} className="flex-1">Delete</Button>
          </div>
        </div>
      </Modal>

      {/* Roster Editor Modal */}
      <Modal open={!!rosterClass} onClose={() => setRosterClass(null)} title={`Manage Roster - ${rosterClass?.name}`} width="max-w-4xl">
        {rosterLoading ? (
          <div className="py-20"><Spinner /></div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Add or remove students from this class.</p>
            
            {/* Search for available students */}
            <div className="relative">
              <div className="absolute left-3 top-3"><Icon d={Icons.search} size={16} color="#9ca3af" /></div>
              <input
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                placeholder="Search available students..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Dual Pane */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[300px]">
              {/* Assigned Students */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-indigo-50 px-4 py-3 border-b border-indigo-100">
                  <h4 className="font-semibold text-indigo-900 flex items-center gap-2">
                    <Icon d={Icons.check} size={16} />
                    Assigned Students ({assignedStudents.length})
                  </h4>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {assignedStudents.length === 0 ? (
                    <div className="p-6 text-center text-sm text-gray-500">
                      No students assigned yet
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {assignedStudents.map(s => (
                        <div key={s.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                              {s.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-800">{s.name}</p>
                              <p className="text-xs text-gray-500">{s.grade}</p>
                            </div>
                          </div>
                          <Button variant="danger" onClick={() => handleRemoveStudent(s.id)} className="text-xs px-2 py-1">
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Available Students */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                    <Icon d={Icons.plus} size={16} />
                    Available Students ({filteredAvailableStudents.length})
                  </h4>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {filteredAvailableStudents.length === 0 ? (
                    <div className="p-6 text-center text-sm text-gray-500">
                      {studentSearch ? "No matching students found" : "No students available"}
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {filteredAvailableStudents.map(s => (
                        <div key={s.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                              {s.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-800">{s.name}</p>
                              <p className="text-xs text-gray-500">{s.grade}</p>
                            </div>
                          </div>
                          <Button onClick={() => handleAddStudent(s.id)} className="text-xs px-2 py-1">
                            Add
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setRosterClass(null)}>Done</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
