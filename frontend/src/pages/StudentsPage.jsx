import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../utils/api";
import { Icon, Icons, Card, Modal, FormField, Input, Select, Button, EmptyState, Spinner } from "../components/ui";
import ImportStudents from "../components/ImportStudents";

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
  const [importModalOpen, setImportModalOpen] = useState(false);
  
  // Bulk delete state
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(null);
  const [deleteInput, setDeleteInput] = useState("");

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

  // Bulk delete handlers
  const toggleSelectAll = () => {
    if (selectedStudents.length === filtered.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filtered.map(s => s.id));
    }
  };

  const toggleSelectStudent = (id) => {
    if (selectedStudents.includes(id)) {
      setSelectedStudents(selectedStudents.filter(sid => sid !== id));
    } else {
      setSelectedStudents([...selectedStudents, id]);
    }
  };

  const handleBulkDelete = async () => {
    try {
      const res = await apiFetch("/api/admin/students/bulk-delete", {
        method: "POST",
        body: { student_ids: selectedStudents }
      });
      if (!res || !res.ok) throw new Error("Bulk delete failed");
      onToast(`Successfully deleted ${selectedStudents.length} students`, "success");
      setSelectedStudents([]);
      setBulkDeleteConfirm(null);
      setDeleteInput("");
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
        <Button onClick={() => setImportModalOpen(true)}><Icon d={Icons.upload} size={16} />Import</Button>
      </div>

      {loading ? <Spinner /> : (
        <Card>
          {filtered.length === 0 ? (
            <EmptyState icon={Icons.students} title="No students found"
              subtitle={search ? "Try a different search term" : "Add your first student to get started"}
              action={!search && <Button onClick={openAdd}><Icon d={Icons.plus} size={16} />Add Student</Button>} />
          ) : (
            <>
              {/* Bulk Action Bar */}
              {selectedStudents.length > 0 && (
                <div className="p-4 bg-red-50 border-b border-red-100 flex items-center justify-between">
                  <span className="text-sm font-semibold text-red-700">
                    {selectedStudents.length} student{selectedStudents.length > 1 ? 's' : ''} selected
                  </span>
                  <Button variant="danger" onClick={() => setBulkDeleteConfirm(true)}>
                    <Icon d={Icons.trash} size={16} /> Delete Selected
                  </Button>
                </div>
              )}
              
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-4 py-4 text-left">
                        <input
                          type="checkbox"
                          checked={selectedStudents.length === filtered.length && filtered.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded accent-indigo-600"
                        />
                      </th>
                      {["Student", "Class", "Actions"].map(h => (
                        <th key={h} className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(s => (
                      <tr key={s.id} className={`hover:bg-gray-50/50 transition-colors ${selectedStudents.includes(s.id) ? 'bg-indigo-50/30' : ''}`}>
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(s.id)}
                            onChange={() => toggleSelectStudent(s.id)}
                            className="w-4 h-4 rounded accent-indigo-600"
                          />
                        </td>
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

      {/* Import Modal */}
      <Modal open={importModalOpen} onClose={() => setImportModalOpen(false)} title="Bulk Import Students">
        <ImportStudents 
          classes={classes} 
          onSuccess={(newStudents) => {
            setImportModalOpen(false);
            load();
            onToast(`Successfully imported ${newStudents.length} students`, "success");
          }}
        />
      </Modal>

      {/* Bulk Delete Confirmation Modal */}
      <Modal open={!!bulkDeleteConfirm} onClose={() => { setBulkDeleteConfirm(null); setDeleteInput(""); }} title="Delete Students">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
            <Icon d={Icons.trash} size={28} color="#ef4444" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">Are you sure you want to delete {selectedStudents.length} students?</p>
            <p className="text-sm text-gray-500 mt-1">This will also remove all their grades. This action cannot be undone.</p>
          </div>
          <div className="text-left p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-600 mb-2">
              Type <span className="font-bold text-red-600">DELETE</span> to confirm:
            </p>
            <input
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="Type DELETE here"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => { setBulkDeleteConfirm(null); setDeleteInput(""); }} className="flex-1">Cancel</Button>
            <Button 
              variant="danger" 
              onClick={handleBulkDelete} 
              disabled={deleteInput !== "DELETE"}
              className="flex-1"
            >
              Delete {selectedStudents.length} Student{selectedStudents.length > 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
