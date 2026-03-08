import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../utils/api";
import { Icon, Icons, Card, Modal, FormField, Input, Select, Button, EmptyState, Spinner } from "../components/ui";

const ROLES = ["Admin", "Teacher"];

export default function UsersPage({ onToast }) {
  const [users, setUsers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [form, setForm] = useState({ username: "", password: "", role: "Teacher", assignedSubjects: [], assignedClasses: [] });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, sRes, cRes] = await Promise.all([apiFetch("/api/users"), apiFetch("/api/subjects"), apiFetch("/api/classes")]);
      if (uRes?.ok) setUsers(await uRes.json());
      if (sRes?.ok) setSubjects(await sRes.json());
      if (cRes?.ok) setClasses(await cRes.json());
    } catch { onToast("Failed to load users", "error"); }
    finally { setLoading(false); }
  }, [onToast]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditUser(null);
    setForm({ username: "", password: "", role: "Teacher", assignedSubjects: [], assignedClasses: [] });
    setErrors({}); setModalOpen(true);
  };

  const openEdit = (u) => {
    setEditUser(u);
    setForm({ username: u.username, password: "", role: u.role, assignedSubjects: u.assignedSubjects || [], assignedClasses: u.assignedClasses || [] });
    setErrors({}); setModalOpen(true);
  };

  const validate = () => {
    const e = {};
    if (!form.username.trim()) e.username = "Username is required";
    if (!editUser && !form.password.trim()) e.password = "Password is required";
    if (!form.role) e.role = "Role is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const toggleSubject = (subId) => {
    setForm(f => ({
      ...f,
      assignedSubjects: f.assignedSubjects.includes(subId)
        ? f.assignedSubjects.filter(s => s !== subId)
        : [...f.assignedSubjects, subId],
    }));
  };

  const toggleClass = (classId) => {
    setForm(f => ({
      ...f,
      assignedClasses: f.assignedClasses.includes(classId)
        ? f.assignedClasses.filter(c => c !== classId)
        : [...f.assignedClasses, classId],
    }));
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = { ...form };
      if (editUser && !payload.password) delete payload.password;
      if (editUser) {
        const res = await apiFetch(`/api/users/${editUser.id}`, { method: "PUT", body: payload });
        if (!res || !res.ok) { const d = await res?.json().catch(() => ({})); throw new Error(d.error || "Update failed"); }
        onToast("User updated", "success");
      } else {
        const res = await apiFetch("/api/users", { method: "POST", body: payload });
        if (!res || !res.ok) { const d = await res?.json().catch(() => ({})); throw new Error(d.error || "Create failed"); }
        onToast("User created", "success");
      }
      setModalOpen(false); load();
    } catch (e) { onToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      const res = await apiFetch(`/api/users/${id}`, { method: "DELETE" });
      if (!res || !res.ok) throw new Error("Delete failed");
      onToast("User deleted", "success");
      setDeleteConfirm(null); load();
    } catch (e) { onToast(e.message, "error"); }
  };

  const getRoleColor = (role) => role === "Admin" ? "bg-indigo-50 text-indigo-700" : "bg-emerald-50 text-emerald-700";

  const getSubjectNames = (ids) => {
    if (!ids || ids.length === 0) return "—";
    return ids.map(id => subjects.find(s => s.id === id)?.name || id).join(", ");
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={openAdd}><Icon d={Icons.plus} size={16} />Add User</Button>
      </div>

      {loading ? <Spinner /> : (
        <Card>
          {users.length === 0 ? (
            <EmptyState icon={Icons.users} title="No users found" subtitle="Add the first user"
              action={<Button onClick={openAdd}><Icon d={Icons.plus} size={16} />Add User</Button>} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["User", "Role", "Assigned Subjects", "Actions"].map(h => (
                      <th key={h} className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600">
                            {u.username.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-semibold text-gray-800">{u.username}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${getRoleColor(u.role)}`}>{u.role}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{getSubjectNames(u.assignedSubjects)}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Button variant="ghost" onClick={() => openEdit(u)} className="p-2"><Icon d={Icons.edit} size={15} /></Button>
                          <Button variant="danger" onClick={() => setDeleteConfirm(u)} className="p-2"><Icon d={Icons.trash} size={15} /></Button>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editUser ? "Edit User" : "Add New User"}>
        <div className="space-y-4">
          <FormField label="Username" error={errors.username}>
            <Input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="e.g. teacher_math" />
          </FormField>
          <FormField label={editUser ? "New Password (leave blank to keep)" : "Password"} error={errors.password}>
            <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={editUser ? "Leave blank to keep current" : "Enter password"} />
          </FormField>
          <FormField label="Role" error={errors.role}>
            <Select value={form.role} onChange={e => setForm({ ...form, role: e.target.value, assignedSubjects: [], assignedClasses: [] })}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </Select>
          </FormField>
          {form.role === "Teacher" && (
            <>
              <FormField label="Assigned Subjects">
                <div className="space-y-2 mt-1">
                  {subjects.map(s => (
                    <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.assignedSubjects.includes(s.id)}
                        onChange={() => toggleSubject(s.id)}
                        className="w-4 h-4 rounded accent-indigo-600"
                      />
                      <span className="text-sm text-gray-700">{s.name}</span>
                    </label>
                  ))}
                  {subjects.length === 0 && <p className="text-xs text-gray-400">No subjects available</p>}
                </div>
              </FormField>
              <FormField label="Assigned Classes">
                <div className="space-y-2 mt-1">
                  {classes.map(c => (
                    <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.assignedClasses.includes(c.id)}
                        onChange={() => toggleClass(c.id)}
                        className="w-4 h-4 rounded accent-indigo-600"
                      />
                      <span className="text-sm text-gray-700">{c.name}</span>
                    </label>
                  ))}
                  {classes.length === 0 && <p className="text-xs text-gray-400">No classes available</p>}
                </div>
              </FormField>
            </>
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1">{saving ? "Saving..." : editUser ? "Save Changes" : "Create User"}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete User">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
            <Icon d={Icons.trash} size={28} color="#ef4444" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">Delete user "{deleteConfirm?.username}"?</p>
            <p className="text-sm text-gray-500 mt-1">This action cannot be undone.</p>
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
