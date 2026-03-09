import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../utils/api";
import { Icon, Icons, Card, Modal, FormField, Input, Button, EmptyState, Spinner } from "../components/ui";

export default function ExamInstancesPage({ onToast }) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editExam, setEditExam] = useState(null);
  const [form, setForm] = useState({ name: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch("/api/exam-instances")
      .then(async (res) => { if (res?.ok) setExams(await res.json()); })
      .catch(() => onToast("Failed to load exam instances", "error"))
      .finally(() => setLoading(false));
  }, [onToast]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditExam(null); setForm({ name: "" }); setErrors({}); setModalOpen(true); };
  const openEdit = (ex) => { setEditExam(ex); setForm({ name: ex.name }); setErrors({}); setModalOpen(true); };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Exam name is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editExam) {
        const res = await apiFetch(`/api/exam-instances/${editExam.id}`, { method: "PUT", body: form });
        if (!res || !res.ok) { const d = await res?.json().catch(() => ({})); throw new Error(d.error || "Update failed"); }
        onToast("Exam instance updated", "success");
      } else {
        const res = await apiFetch("/api/exam-instances", { method: "POST", body: form });
        if (!res || !res.ok) { const d = await res?.json().catch(() => ({})); throw new Error(d.error || "Create failed"); }
        onToast("Exam instance created", "success");
      }
      setModalOpen(false); load();
    } catch (e) { onToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      const res = await apiFetch(`/api/exam-instances/${id}`, { method: "DELETE" });
      if (!res || !res.ok) throw new Error("Delete failed");
      onToast("Exam instance deleted", "success");
      setDeleteConfirm(null); load();
    } catch (e) { onToast(e.message, "error"); }
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={openAdd}><Icon d={Icons.plus} size={16} />New Exam Instance</Button>
      </div>

      {loading ? <Spinner /> : (
        <Card>
          {exams.length === 0 ? (
            <EmptyState icon={Icons.clipboard} title="No exam instances" subtitle="Create your first exam instance"
              action={<Button onClick={openAdd}><Icon d={Icons.plus} size={16} />New Exam Instance</Button>} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Exam Name", "ID", "Actions"].map(h => (
                      <th key={h} className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {exams.map(ex => (
                    <tr key={ex.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                            <Icon d={Icons.clipboard} size={16} color="#d97706" />
                          </div>
                          <span className="font-semibold text-gray-800">{ex.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400 font-mono">{ex.id}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Button variant="ghost" onClick={() => openEdit(ex)} className="p-2"><Icon d={Icons.edit} size={15} /></Button>
                          <Button variant="danger" onClick={() => setDeleteConfirm(ex)} className="p-2"><Icon d={Icons.trash} size={15} /></Button>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editExam ? "Edit Exam Instance" : "New Exam Instance"}>
        <div className="space-y-4">
          <FormField label="Exam Name" error={errors.name}>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Term 1 2024 Exam" />
          </FormField>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1">{saving ? "Saving..." : editExam ? "Save Changes" : "Create"}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Exam Instance">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
            <Icon d={Icons.trash} size={28} color="#ef4444" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">Delete "{deleteConfirm?.name}"?</p>
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
