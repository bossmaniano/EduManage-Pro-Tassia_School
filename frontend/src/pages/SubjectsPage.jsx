import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../utils/api";
import { Icon, Icons, Card, Modal, FormField, Input, Button, EmptyState, Spinner } from "../components/ui";

export default function SubjectsPage({ onToast }) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editSubject, setEditSubject] = useState(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch("/api/subjects")
      .then(async (res) => { if (res && res.ok) setSubjects(await res.json()); })
      .catch(() => onToast("Failed to load subjects", "error"))
      .finally(() => setLoading(false));
  }, [onToast]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditSubject(null); setForm({ name: "", description: "" }); setErrors({}); setModalOpen(true); };
  const openEdit = (s) => { setEditSubject(s); setForm({ name: s.name, description: s.description || "" }); setErrors({}); setModalOpen(true); };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Subject name is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editSubject) {
        const res = await apiFetch(`/api/subjects/${editSubject.id}`, { method: "PUT", body: form });
        if (!res || !res.ok) throw new Error("Update failed");
        onToast("Subject updated", "success");
      } else {
        const res = await apiFetch("/api/subjects", { method: "POST", body: form });
        if (!res || !res.ok) throw new Error("Create failed");
        onToast("Subject added", "success");
      }
      setModalOpen(false);
      load();
    } catch (e) { onToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      const res = await apiFetch(`/api/subjects/${id}`, { method: "DELETE" });
      if (!res || !res.ok) throw new Error("Delete failed");
      onToast("Subject deleted", "success");
      setDeleteConfirm(null);
      load();
    } catch (e) { onToast(e.message, "error"); }
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={openAdd}><Icon d={Icons.plus} size={16} />Add Subject</Button>
      </div>

      {loading ? <Spinner /> : (
        <Card>
          {subjects.length === 0 ? (
            <EmptyState icon={Icons.book} title="No subjects found"
              subtitle="Add your first subject to get started"
              action={<Button onClick={openAdd}><Icon d={Icons.plus} size={16} />Add Subject</Button>} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Subject Name", "Description", "Actions"].map(h => (
                      <th key={h} className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {subjects.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center">
                            <Icon d={Icons.book} size={16} color="#a855f7" />
                          </div>
                          <span className="font-semibold text-gray-800">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{s.description || "—"}</td>
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
          )}
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editSubject ? "Edit Subject" : "Add New Subject"}>
        <div className="space-y-4">
          <FormField label="Subject Name" error={errors.name}>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mathematics" />
          </FormField>
          <FormField label="Description (optional)">
            <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description" />
          </FormField>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1">{saving ? "Saving..." : editSubject ? "Save Changes" : "Add Subject"}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Subject">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
            <Icon d={Icons.trash} size={28} color="#ef4444" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">Delete {deleteConfirm?.name}?</p>
            <p className="text-sm text-gray-500 mt-1">This cannot be undone.</p>
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
