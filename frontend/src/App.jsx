import { useState, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Icon, Icons, Toast, Spinner } from "./components/ui";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import StudentsPage from "./pages/StudentsPage";
import SubjectsPage from "./pages/SubjectsPage";
import GradesPage from "./pages/GradesPage";
import ReportsPage from "./pages/ReportsPage";
import UsersPage from "./pages/UsersPage";
import ExamInstancesPage from "./pages/ExamInstancesPage";
import CorrectionsPage from "./pages/CorrectionsPage";
import ClassesPage from "./pages/ClassesPage";

// ── Toast hook helper ───────────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState({ msg: "", type: "info" });
  const showToast = useCallback((msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "info" }), 3500);
  }, []);
  return [toast, showToast];
}

// ── AdminOnly guard ─────────────────────────────────────────────────────────
function AdminOnly({ children }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

// ── ProtectedLayout ─────────────────────────────────────────────────────────
function ProtectedLayout() {
  const { user, loading, logout, isAdmin, isTeacher } = useAuth();
  const [toast, showToast] = useToast();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Build nav items based on role
  const adminNav = [
    { path: "/", label: "Dashboard", icon: Icons.dashboard, end: true },
    { path: "/students", label: "Students", icon: Icons.students },
    { path: "/subjects", label: "Subjects", icon: Icons.book },
    { path: "/grades", label: "Grades", icon: Icons.grades },
    { path: "/users", label: "Users", icon: Icons.users },
    { path: "/classes", label: "Classes", icon: Icons.users },
    { path: "/exam-instances", label: "Exam Instances", icon: Icons.clipboard },
    { path: "/corrections", label: "Corrections", icon: Icons.edit },
    { path: "/reports", label: "Reports", icon: Icons.reports },
  ];

  const teacherNav = [
    { path: "/", label: "Dashboard", icon: Icons.dashboard, end: true },
    { path: "/grades", label: "My Grades", icon: Icons.grades },
    { path: "/reports", label: "Reports", icon: Icons.reports },
  ];

  const navItems = isAdmin ? adminNav : teacherNav;

  const navLinkClass = ({ isActive }) =>
    `w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`;

  const mobileNavLinkClass = ({ isActive }) =>
    `w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50"}`;

  const roleBadge = isAdmin
    ? "bg-indigo-100 text-indigo-700"
    : "bg-emerald-100 text-emerald-700";

  // Clone Outlet with toast prop injected via context pattern
  // We use a wrapper approach: each page route gets onToast via element prop
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        * { font-family: 'Plus Jakarta Sans', sans-serif; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
      `}</style>

      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-100 flex-col z-30">
        {/* Logo */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Icon d={Icons.award} size={20} color="white" />
            </div>
            <div>
              <p className="text-sm font-black text-gray-900 leading-tight">EduManage Pro</p>
              <p className="text-xs text-gray-400">Exam Management</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <NavLink key={item.path} to={item.path} end={item.end} className={navLinkClass}>
              {({ isActive }) => (
                <>
                  <Icon d={item.icon} size={18} color={isActive ? "white" : "currentColor"} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User info + logout */}
        <div className="p-4 border-t border-gray-100 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600">
              {user.username.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-800 truncate">{user.username}</p>
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${roleBadge}`}>{user.role}</span>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
          >
            <Icon d={Icons.logout} size={16} color="#dc2626" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Icon d={Icons.award} size={16} color="white" />
          </div>
          <span className="font-black text-gray-900 text-sm">EduManage Pro</span>
        </div>
        <button onClick={() => setMobileNavOpen(true)} className="p-2 hover:bg-gray-100 rounded-lg">
          <Icon d={Icons.menu} size={20} />
        </button>
      </header>

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileNavOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-white flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
                  <Icon d={Icons.award} size={18} color="white" />
                </div>
                <div>
                  <p className="font-black text-gray-900 text-sm">EduManage Pro</p>
                  <p className="text-xs text-gray-400">Exam Management</p>
                </div>
              </div>
              <button onClick={() => setMobileNavOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <Icon d={Icons.close} size={18} />
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {navItems.map(item => (
                <NavLink key={item.path} to={item.path} end={item.end}
                  className={mobileNavLinkClass}
                  onClick={() => setMobileNavOpen(false)}>
                  {({ isActive }) => (
                    <>
                      <Icon d={item.icon} size={18} color={isActive ? "white" : "currentColor"} />
                      {item.label}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
            <div className="p-4 border-t border-gray-100">
              <div className="flex items-center gap-3 px-2 mb-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600">
                  {user.username.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">{user.username}</p>
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${roleBadge}`}>{user.role}</span>
                </div>
              </div>
              <button onClick={logout}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors">
                <Icon d={Icons.logout} size={16} color="#dc2626" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 pb-20 lg:pb-0 min-h-screen">
        <div className="p-5 lg:p-8 max-w-6xl mx-auto">
          <Outlet context={{ onToast: showToast }} />
        </div>
      </main>

      <Toast msg={toast.msg} type={toast.type} />
    </div>
  );
}

// ── Page wrappers that consume toast from Outlet context ─────────────────────
import { useOutletContext } from "react-router-dom";

function DashboardWrapper() {
  return <DashboardPage />;
}
function StudentsWrapper() {
  const { onToast } = useOutletContext();
  return <StudentsPage onToast={onToast} />;
}
function SubjectsWrapper() {
  const { onToast } = useOutletContext();
  return <SubjectsPage onToast={onToast} />;
}
function GradesWrapper() {
  const { onToast } = useOutletContext();
  return <GradesPage onToast={onToast} />;
}
function ReportsWrapper() {
  const { onToast } = useOutletContext();
  return <ReportsPage onToast={onToast} />;
}
function UsersWrapper() {
  const { onToast } = useOutletContext();
  return <UsersPage onToast={onToast} />;
}
function ExamInstancesWrapper() {
  const { onToast } = useOutletContext();
  return <ExamInstancesPage onToast={onToast} />;
}
function CorrectionsWrapper() {
  const { onToast } = useOutletContext();
  return <CorrectionsPage onToast={onToast} />;
}
function ClassesWrapper() {
  const { onToast } = useOutletContext();
  return <ClassesPage onToast={onToast} />;
}

// ── Page titles bar above content ────────────────────────────────────────────
function PageWithTitle({ title, subtitle, children }) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-black text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// Wrapping each page with a title
function DashboardRoute() {
  return <PageWithTitle title="Dashboard" subtitle="Overview of your exam management system"><DashboardWrapper /></PageWithTitle>;
}
function StudentsRoute() {
  return <PageWithTitle title="Student Management" subtitle="Manage student records and information"><StudentsWrapper /></PageWithTitle>;
}
function SubjectsRoute() {
  return <PageWithTitle title="Subjects" subtitle="Manage subjects offered at the school"><SubjectsWrapper /></PageWithTitle>;
}
function GradesRoute() {
  const { isAdmin, isTeacher } = useAuth();
  const subtitle = isTeacher ? "Enter grades for your assigned subjects" : "View and manage all grade records";
  return <PageWithTitle title="Grades" subtitle={subtitle}><GradesWrapper /></PageWithTitle>;
}
function ReportsRoute() {
  return <PageWithTitle title="Reports" subtitle="Generate and view performance reports"><ReportsWrapper /></PageWithTitle>;
}
function UsersRoute() {
  return (
    <AdminOnly>
      <PageWithTitle title="User Management" subtitle="Manage admin and teacher accounts">
        <UsersWrapper />
      </PageWithTitle>
    </AdminOnly>
  );
}
function ExamInstancesRoute() {
  return (
    <AdminOnly>
      <PageWithTitle title="Exam Instances" subtitle="Create and manage exam instances">
        <ExamInstancesWrapper />
      </PageWithTitle>
    </AdminOnly>
  );
}
function CorrectionsRoute() {
  return (
    <AdminOnly>
      <PageWithTitle title="Grade Corrections" subtitle="Unlock and correct locked grades">
        <CorrectionsWrapper />
      </PageWithTitle>
    </AdminOnly>
  );
}
function ClassesRoute() {
  return (
    <AdminOnly>
      <PageWithTitle title="Class Management" subtitle="Manage classes and student rosters">
        <ClassesWrapper />
      </PageWithTitle>
    </AdminOnly>
  );
}

// ── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPageRoute />} />
          <Route path="/*" element={<ProtectedLayout />}>
            <Route index element={<DashboardRoute />} />
            <Route path="students" element={<StudentsRoute />} />
            <Route path="subjects" element={<SubjectsRoute />} />
            <Route path="grades" element={<GradesRoute />} />
            <Route path="reports" element={<ReportsRoute />} />
            <Route path="users" element={<UsersRoute />} />
            <Route path="exam-instances" element={<ExamInstancesRoute />} />
            <Route path="corrections" element={<CorrectionsRoute />} />
            <Route path="classes" element={<ClassesRoute />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

// Redirect to home if already logged in
function LoginPageRoute() {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
  if (user) return <Navigate to="/" replace />;
  return <LoginPage />;
}

// Re-export evaluateScore for backwards compatibility
export { evaluateScore } from "./components/ui";
