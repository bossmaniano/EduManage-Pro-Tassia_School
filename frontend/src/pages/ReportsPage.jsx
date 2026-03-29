import { useState, useEffect, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { apiFetch } from "../utils/api";
import { useAuth } from "../contexts/AuthContext";
import { Icon, Icons, Card, Select, Button, Spinner, RubricBadge, ScoreBar } from "../components/ui";
import TassiaHeader from "../components/TassiaHeader";
import ProgressReportForm from "../components/ProgressReportForm";
import GradePerformanceReport from "../components/GradePerformanceReport";

export default function ReportsPage({ onToast }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [examInstances, setExamInstances] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedExam, setSelectedExam] = useState("");
  const [studentReport, setStudentReport] = useState(null);
  const [subjectReport, setSubjectReport] = useState(null);
  const [classReportData, setClassReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [activeTab, setActiveTab] = useState("student");
  const [massPrintReports, setMassPrintReports] = useState([]);
  const [massPrintLoading, setMassPrintLoading] = useState(false);
  
  const printRef = useRef();
  const subjectPrintRef = useRef();

  useEffect(() => {
    Promise.all([
      apiFetch("/api/students"),
      apiFetch("/api/subjects"),
      apiFetch("/api/classes"),
      apiFetch("/api/exam-instances")
    ])
      .then(async ([sRes, subRes, cRes, eRes]) => {
        if (sRes?.ok) setStudents(await sRes.json());
        if (subRes?.ok) setSubjects(await subRes.json());
        if (cRes?.ok) setClasses(await cRes.json());
        if (eRes?.ok) setExamInstances(await eRes.json());
      })
      .catch(() => onToast("Failed to load data", "error"));
  }, [onToast]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Tassia School Report",
  });

  const handleSubjectPrint = useReactToPrint({
    contentRef: subjectPrintRef,
    documentTitle: "Tassia School Subject Report",
  });

  const loadStudentReport = async (id) => {
    if (!id) return;
    setLoadingReport(true);
    try {
      const examParam = selectedExam ? `?examId=${selectedExam}` : "";
      const res = await apiFetch(`/api/reports/student/${id}${examParam}`);
      if (!res || !res.ok) throw new Error("Failed to load report");
      setStudentReport(await res.json());
    } catch (e) { onToast(e.message, "error"); }
    finally { setLoadingReport(false); }
  };

  const loadSubjectReport = async (id) => {
    if (!id) return;
    setLoadingReport(true);
    try {
      let params = [];
      if (selectedExam) params.push(`examId=${selectedExam}`);
      if (selectedClass) params.push(`classId=${selectedClass}`);
      const queryString = params.length > 0 ? `?${params.join("&")}` : "";
      const res = await apiFetch(`/api/reports/subject/${id}${queryString}`);
      if (!res || !res.ok) throw new Error("Failed to load report");
      setSubjectReport(await res.json());
    } catch (e) { onToast(e.message, "error"); }
    finally { setLoadingReport(false); }
  };

  const loadClassReport = async () => {
    if (!selectedClass || !selectedExam) return;
    setLoadingReport(true);
    try {
      const [studentsRes, gradesRes] = await Promise.all([
        apiFetch(`/api/classes/${selectedClass}/students`),
        apiFetch("/api/grades")
      ]);
      
      if (!studentsRes?.ok || !gradesRes?.ok) throw new Error("Failed to load class data");
      
      const classStudents = await studentsRes.json();
      const allGrades = await gradesRes.json();
      const selectedExamInstance = examInstances.find(e => e.id === selectedExam);
      const selectedClassData = classes.find(c => c.id === selectedClass);
      
      // Filter grades by exam instance
      const examGrades = allGrades.filter(g => g.examInstanceId === selectedExam);
      
      setClassReportData({
        students: classStudents,
        grades: examGrades,
        class: selectedClassData,
        examInstance: selectedExamInstance
      });
    } catch (e) { 
      onToast(e.message, "error"); 
    }
    finally { setLoadingReport(false); }
  };

  const loadMassPrintReports = async () => {
    if (!selectedClass || !selectedExam) return;
    setMassPrintLoading(true);
    try {
      const [studentsRes, gradesRes] = await Promise.all([
        apiFetch(`/api/classes/${selectedClass}/students`),
        apiFetch("/api/grades")
      ]);
      
      if (!studentsRes?.ok || !gradesRes?.ok) throw new Error("Failed to load data");
      
      const classStudents = await studentsRes.json();
      const allGrades = await gradesRes.json();
      const selectedExamInstance = examInstances.find(e => e.id === selectedExam);
      const selectedClassData = classes.find(c => c.id === selectedClass);
      
      // Filter grades by exam instance
      const examGrades = allGrades.filter(g => g.examInstanceId === selectedExam);
      
      // Get class subjects for optional filtering - use all subjects if class has no subjects defined
      const classSubjectIds = selectedClassData?.subjects || [];
      const useClassSubjectsFilter = classSubjectIds.length > 0;
      
      // Load report for each student
      const reports = [];
      for (const student of classStudents) {
        const studentGrades = examGrades.filter(g => g.studentId === student.id).map(g => ({
          ...g,
          subjectName: subjects.find(s => s.id === g.subjectId)?.name || "Unknown"
        }));
        
        // Only filter by class subjects if class has subjects defined
        const filteredStudentGrades = useClassSubjectsFilter 
          ? studentGrades.filter(g => classSubjectIds.includes(g.subjectId))
          : studentGrades;
        
        const totalScore = filteredStudentGrades.reduce((sum, g) => sum + (g.score || 0), 0);
        const avgScore = filteredStudentGrades.length > 0 ? Math.round(totalScore / filteredStudentGrades.length) : 0;
        
        reports.push({
          student,
          grades: filteredStudentGrades,
          averageScore: avgScore,
          class: selectedClassData,
          examInstance: selectedExamInstance
        });
      }
      
      setMassPrintReports(reports);
    } catch (e) { 
      onToast(e.message, "error"); 
    }
    finally { setMassPrintLoading(false); }
  };

  const PrintButton = () => (
    <Button onClick={handlePrint} className="flex items-center gap-2">
      <Icon d={Icons.printer} size={16} />
      Print / PDF
    </Button>
  );

  return (
    <div className="space-y-5">
      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {[
          { id: "student", label: "Student Report", icon: Icons.students },
          { id: "class", label: "Class Report", icon: Icons.users },
          { id: "subject", label: "Subject Report", icon: Icons.book },
          ...(isAdmin ? [{ id: "massprint", label: "Mass Print", icon: Icons.printer }] : [])
        ].map(t => (
          <button key={t.id} onClick={() => { setActiveTab(t.id); setStudentReport(null); setSubjectReport(null); setClassReportData(null); setMassPrintReports([]); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === t.id ? "bg-white shadow-sm text-indigo-600" : "text-gray-500 hover:text-gray-700"}`}>
            <Icon d={t.icon} size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ===================== STUDENT REPORT ===================== */}
      {activeTab === "student" && (
        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-48">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Select Student</label>
                <Select value={selectedStudent} onChange={e => { setSelectedStudent(e.target.value); setStudentReport(null); }}>
                  <option value="">Choose a student...</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </div>
              <div className="min-w-40">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Filter by Exam</label>
                <Select value={selectedExam} onChange={e => { setSelectedExam(e.target.value); setStudentReport(null); }}>
                  <option value="">All Exams</option>
                  {examInstances.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </Select>
              </div>
              <Button onClick={() => loadStudentReport(selectedStudent)} disabled={!selectedStudent || loadingReport}>
                {loadingReport ? "Loading..." : "Generate Report"}
              </Button>
            </div>
          </Card>

          {loadingReport && <Spinner />}

          {studentReport && !loadingReport && (
            <div className="space-y-4">
              {/* Screen View */}
              <Card className="p-6 print:hidden">
                <div className="flex flex-wrap items-start gap-4 justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center text-xl font-black text-indigo-600">
                      {studentReport.student.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-gray-900">{studentReport.student.name}</h2>
                      <p className="text-sm text-gray-500">{studentReport.student.grade} · {studentReport.student.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Overall Average</p>
                    <p className="text-4xl font-black text-gray-900">{studentReport.averageScore}<span className="text-lg text-gray-400">%</span></p>
                    <RubricBadge score={Math.round(studentReport.averageScore)} />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <PrintButton />
                </div>
              </Card>

              {/* Printable View */}
              <div ref={printRef} className="hidden print:block">
                <ProgressReportForm 
                  student={studentReport.student}
                  grades={studentReport.grades}
                  subjects={subjects}
                  examInstance={studentReport.examInstance || examInstances.find(e => e.id === selectedExam) || examInstances[0]}
                  classes={classes}
                />
              </div>

              {/* Screen Table */}
              <Card>
                <div className="p-5 border-b border-gray-100"><h3 className="font-bold text-gray-800">Grade Breakdown</h3></div>
                {studentReport.grades.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No grades recorded for this student</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-50">
                          {["Subject", "Score", "Rubric", "Points", "Comment", "Date"].map(h => (
                            <th key={h} className="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {studentReport.grades.map(g => (
                          <tr key={g.id} className="hover:bg-gray-50/50">
                            <td className="px-5 py-3 font-medium text-gray-800 text-sm">{g.subjectName}</td>
                            <td className="px-5 py-3 w-28"><ScoreBar score={g.score} /></td>
                            <td className="px-5 py-3"><RubricBadge score={g.score} /></td>
                            <td className="px-5 py-3 text-sm font-bold text-gray-700">{g.points}</td>
                            <td className="px-5 py-3 text-sm text-gray-500">{g.comment}</td>
                            <td className="px-5 py-3 text-sm text-gray-400">{g.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ===================== CLASS REPORT ===================== */}
      {activeTab === "class" && (
        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-40">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Select Class</label>
                <Select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setClassReportData(null); }}>
                  <option value="">Choose a class...</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.academicYear})</option>)}
                </Select>
              </div>
              <div className="flex-1 min-w-40">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Exam Instance</label>
                <Select value={selectedExam} onChange={e => { setSelectedExam(e.target.value); setClassReportData(null); }}>
                  <option value="">Choose exam...</option>
                  {examInstances.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </Select>
              </div>
              <Button onClick={loadClassReport} disabled={!selectedClass || !selectedExam || loadingReport}>
                {loadingReport ? "Loading..." : "Generate Report"}
              </Button>
            </div>
          </Card>

          {loadingReport && <Spinner />}

          {classReportData && !loadingReport && (
            <div className="space-y-4">
              {/* Screen View - Summary Cards */}
              <Card className="p-6 print:hidden">
                <div className="flex flex-wrap items-start justify-between">
                  <div>
                    <h2 className="text-xl font-black text-gray-900">{classReportData.class?.name}</h2>
                    <p className="text-sm text-gray-500">{classReportData.examInstance?.name}</p>
                  </div>
                  <PrintButton />
                </div>
                
                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-4 mt-6">
                  {(() => {
                    const allGrades = classReportData.grades;
                    const studentIds = [...new Set(allGrades.map(g => g.studentId))];
                    const totalScore = allGrades.reduce((s, g) => s + g.score, 0);
                    const avg = allGrades.length ? Math.round(totalScore / allGrades.length) : 0;
                    const passCount = allGrades.filter(g => g.score >= 40).length;
                    const passRate = allGrades.length ? Math.round((passCount / allGrades.length) * 100) : 0;
                    
                    // Find top performer (class-specific)
                    const studentAvgs = studentIds.map(sid => {
                      const sGrades = allGrades.filter(g => g.studentId === sid);
                      const sTotal = sGrades.reduce((s, g) => s + g.score, 0);
                      return { id: sid, avg: sGrades.length ? Math.round(sTotal / sGrades.length) : 0 };
                    }).sort((a, b) => b.avg - a.avg);
                    const topStudent = classReportData.students.find(s => s.id === studentAvgs[0]?.id);
                    
                    return (
                      <>
                        <div className="bg-gray-50 rounded-xl p-4 text-center">
                          <p className="text-xs text-gray-500 uppercase">Average</p>
                          <p className="text-2xl font-black text-indigo-600">{avg}%</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4 text-center">
                          <p className="text-xs text-gray-500 uppercase">Pass Rate</p>
                          <p className="text-2xl font-black text-emerald-600">{passRate}%</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4 text-center">
                          <p className="text-xs text-gray-500 uppercase">Students</p>
                          <p className="text-2xl font-black text-gray-900">{studentIds.length}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4 text-center">
                          <p className="text-xs text-gray-500 uppercase">Top Performer</p>
                          <p className="text-sm font-bold text-gray-900 truncate">{topStudent?.name || '-'}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </Card>

              {/* Printable View */}
              <div ref={printRef} className="hidden print:block">
                <GradePerformanceReport 
                  students={classReportData.students}
                  grades={classReportData.grades}
                  subjects={subjects}
                  className={classReportData.class}
                  examInstance={classReportData.examInstance}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== SUBJECT REPORT ===================== */}
      {activeTab === "subject" && (
        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-40">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Select Class</label>
                <Select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSubjectReport(null); }}>
                  <option value="">All Classes</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </div>
              <div className="flex-1 min-w-40">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Select Subject</label>
                <Select value={selectedSubject} onChange={e => { setSelectedSubject(e.target.value); setSubjectReport(null); }}>
                  <option value="">Choose a subject...</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </div>
              <div className="min-w-40">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Filter by Exam</label>
                <Select value={selectedExam} onChange={e => { setSelectedExam(e.target.value); setSubjectReport(null); }}>
                  <option value="">All Exams</option>
                  {examInstances.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </Select>
              </div>
              <Button onClick={() => loadSubjectReport(selectedSubject)} disabled={!selectedSubject || loadingReport}>
                {loadingReport ? "Loading..." : "Generate Report"}
              </Button>
            </div>
          </Card>

          {loadingReport && <Spinner />}

          {subjectReport && !loadingReport && (
            <div className="space-y-4">
              <Card className="p-6">
                <div className="flex flex-wrap items-start gap-4 justify-between">
                  <div>
                    <h2 className="text-xl font-black text-gray-900">{subjectReport.subject.name}</h2>
                    <p className="text-sm text-gray-500">{subjectReport.studentCount} students</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Class Average</p>
                      <p className="text-4xl font-black text-gray-900">{subjectReport.averageScore}<span className="text-lg text-gray-400">%</span></p>
                      <RubricBadge score={Math.round(subjectReport.averageScore)} />
                    </div>
                    <Button onClick={handleSubjectPrint} className="ml-4">
                      <Icon d={Icons.printer} size={16} className="mr-2" />
                      Print
                    </Button>
                  </div>
                </div>
              </Card>
              <Card>
                <div className="p-5 border-b border-gray-100"><h3 className="font-bold text-gray-800">Student Performance</h3></div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-50">
                        {["Student", "Score", "Rubric", "Points", "Comment"].map(h => (
                          <th key={h} className="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {subjectReport.grades.map(g => (
                        <tr key={g.id} className="hover:bg-gray-50/50">
                          <td className="px-5 py-3 font-medium text-gray-800 text-sm">{g.studentName}</td>
                          <td className="px-5 py-3 w-28"><ScoreBar score={g.score} /></td>
                          <td className="px-5 py-3"><RubricBadge score={g.score} /></td>
                          <td className="px-5 py-3 text-sm font-bold text-gray-700">{g.points}</td>
                          <td className="px-5 py-3 text-sm text-gray-500">{g.comment}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* Printable Subject Report */}
          {subjectReport && !loadingReport && (
            <div ref={subjectPrintRef} className="hidden print:block">
              <div className="bg-white p-8 max-w-[210mm] mx-auto" style={{ minHeight: '297mm' }}>
                <TassiaHeader />
                <h2 className="text-xl font-bold text-center uppercase mb-2 border-b border-black pb-2">
                  SUBJECT PERFORMANCE REPORT
                </h2>
                <p className="text-center text-sm mb-6">
                  {subjectReport.subject.name} | {selectedExam ? examInstances.find(e => e.id === selectedExam)?.name : 'All Exams'}
                </p>
                
                <div className="mb-6">
                  <div className="flex justify-between items-center border border-black p-4">
                    <div>
                      <p className="text-sm text-gray-500">Total Students</p>
                      <p className="text-2xl font-bold">{subjectReport.studentCount}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Class Average</p>
                      <p className="text-2xl font-bold">{subjectReport.averageScore}%</p>
                    </div>
                  </div>
                </div>

                <table className="w-full border-collapse border border-black text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black py-2 px-2 text-left font-bold">Student</th>
                      <th className="border border-black py-2 px-2 text-center font-bold">Score</th>
                      <th className="border border-black py-2 px-2 text-center font-bold">Rubric</th>
                      <th className="border border-black py-2 px-2 text-center font-bold">Points</th>
                      <th className="border border-black py-2 px-2 text-left font-bold">Comment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectReport.grades.map(g => (
                      <tr key={g.id}>
                        <td className="border border-black py-2 px-2 font-medium">{g.studentName}</td>
                        <td className="border border-black py-2 px-2 text-center">{g.score}</td>
                        <td className="border border-black py-2 px-2 text-center">{g.rubric}</td>
                        <td className="border border-black py-2 px-2 text-center font-bold">{g.points}</td>
                        <td className="border border-black py-2 px-2 text-sm">{g.comment}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="text-center text-xs text-gray-500 mt-8 pt-4 border-t border-gray-300">
                  <p>Generated by EduManage Pro | Tassia School</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== MASS PRINT (ADMIN ONLY) ===================== */}
      {activeTab === "massprint" && isAdmin && (
        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-48">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Select Class</label>
                <Select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setMassPrintReports([]); }}>
                  <option value="">Choose a class...</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.academicYear})</option>)}
                </Select>
              </div>
              <div className="min-w-40">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Exam Instance</label>
                <Select value={selectedExam} onChange={e => { setSelectedExam(e.target.value); setMassPrintReports([]); }}>
                  <option value="">Choose exam...</option>
                  {examInstances.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </Select>
              </div>
              <Button onClick={loadMassPrintReports} disabled={!selectedClass || !selectedExam || massPrintLoading}>
                {massPrintLoading ? "Loading..." : "Load Reports"}
              </Button>
            </div>
          </Card>

          {massPrintLoading && <Spinner />}

          {massPrintReports.length > 0 && !massPrintLoading && (
            <div className="space-y-4">
              <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between">
                  <div>
                    <h2 className="text-xl font-black text-gray-900">Mass Print - Student Reports</h2>
                    <p className="text-sm text-gray-500">{massPrintReports.length} reports ready to print</p>
                  </div>
                  <Button onClick={handlePrint} className="flex items-center gap-2">
                    <Icon d={Icons.printer} size={16} />
                    Print All
                  </Button>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {massPrintReports.map((r, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-2 text-sm">
                      <p className="font-semibold">{r.student.name}</p>
                      <p className="text-gray-500 text-xs">{r.averageScore}% avg</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Printable Reports */}
              <div ref={printRef} className="hidden print:block space-y-8">
                {massPrintReports.map((report, index) => (
                  <div key={index} className="page-break-after">
                    <ProgressReportForm 
                      student={report.student}
                      grades={report.grades}
                      subjects={subjects}
                      examInstance={examInstances.find(e => e.id === selectedExam)}
                      classes={classes}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
