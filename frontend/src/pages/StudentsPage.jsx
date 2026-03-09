import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../utils/api";
import { Icon, Icons, Card, Modal, FormField, Input, Select, Button, EmptyState, Spinner } from "../components/ui";

export default function StudentsPage({ onToast }) {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  const [form, setForm] = useState({ name: "", classId: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiFetch("/api/students"),
      apiFetch("/api/classes")
    ])
      .then(async ([sRes, cRes]) => {
        if (sRes?.ok) setStudents(await sRes.json());
        if (cRes?.ok) setClasses(await cRes.json());
      })
      .catch(() => onToast("Failed to load data", "error"))
      .finally(() => setLoading(false));
  }, [onToast]);

  useEffect(() => { load(); }, [load]);

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.className && s.className.toLowerCase().includes(search.toLowerCase()))
  );

  const openAdd = () => { setEditStudent(null); setForm({ name: "", classId: "" }); setErrors({}); setModalOpen(true); };
  const openEdit = (s) => { setEditStudent(s); setForm({ name: s.name, classId: s.classId || "" }); setErrors({}); setModalOpen(true); };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.classId) e.classId = "Class is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editStudent) {
        const res = await apiFetch(`/api/students/${editStudent.id}`, { method: "PUT", body: form });
        if (!res || !res.ok) throw new Error("Update failed");
        onToast("Student updated successfully", "success");
      } else {
        const res = await apiFetch("/api/students", { method: "POST", body: form });
        if (!res || !res.ok) throw new Error("Create failed");
        onToast("Student added successfully", "success");
      }
      setModalOpen(false);
      load();
    } catch (e) { onToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      const res = await apiFetch(`/api/students/${id}`, { method: "DELETE" });
      if (!res || !res.ok) throw new Error("Delete failed");
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
          <div className="absolute left-3 top-3"><Icon d={Icons.search} size={16} color="#9ca3af" /></div>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search students..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
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
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {["Student", "Class", "Actions"].map(h => (
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
                        <td className="px-6 py-4"><span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold">{s.class?.name || s.className || 'Unassigned'}</span></td>
                        <td className="px-6 py-4 text-sm text-gray-500">{s.class?.academicYear || ''}</td>
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
              <div className="md:hidden divide-y divide-gray-100">
                {filtered.map(s => (
                  <div key={s.id} className="p-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600 flex-shrink-0">
                        {s.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{s.name}</p>
                        <p className="text-xs text-gray-500">{s.class?.name || s.className || 'Unassigned'}</p>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editStudent ? "Edit Student" : "Add New Student"}>
        <div className="space-y-4">
          <FormField label="Full Name" error={errors.name}>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Alice Johnson" />
          </FormField>
          <FormField label="Class" error={errors.classId}>
            <Select value={form.classId} onChange={e => setForm({ ...form, classId: e.target.value })}>
              <option value="">Select class...</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.academicYear})</option>)}
            </Select>
          </FormField>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1">{saving ? "Saving..." : editStudent ? "Save Changes" : "Add Student"}</Button>
          </div>
        </div>
      </Modal>

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
