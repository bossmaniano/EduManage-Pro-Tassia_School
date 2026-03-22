import { useState, useEffect } from "react";
import { apiFetch } from "../utils/api";
import { Icon, Icons, Card, Spinner } from "../components/ui";

export default function AuditLogsPage({ onToast }) {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/audit-logs");
      if (res?.ok) {
        const data = await res.json();
        setAuditLogs(data);
      } else {
        onToast("Failed to load audit logs", "error");
      }
    } catch (e) {
      onToast("Failed to load audit logs: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Format timestamp as "X minutes ago" for easy reading
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return "Just now";
    if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
    if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;
    if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
    
    // Fall back to full date for older entries
    return date.toLocaleDateString();
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track recent grade changes - Last 50 updates
          </p>
        </div>
        <button
          onClick={loadAuditLogs}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          <Icon d={Icons.refresh} size={16} />
          Refresh
        </button>
      </div>

      {auditLogs.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon d={Icons.clipboard} size={28} color="#9ca3af" />
            </div>
            <p className="text-gray-500 font-medium">No audit logs found</p>
            <p className="text-sm text-gray-400 mt-1">
              Grade changes will appear here once teachers start updating marks
            </p>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Student Name
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-5 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                    New Mark
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Teacher Name
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {auditLogs.map((log, index) => (
                  <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4 font-semibold text-gray-800 text-sm">
                      {log.studentName}
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-semibold">
                        {log.subject}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-10 h-7 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-bold">
                        {log.newMark}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-indigo-600">
                            {log.teacherName?.charAt(0).toUpperCase() || "?"}
                          </span>
                        </div>
                        {log.teacherName}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">
                      <span className="font-medium text-gray-700">{formatTimeAgo(log.timestamp)}</span>
                      <span className="block text-xs text-gray-400">{formatDate(log.timestamp)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
