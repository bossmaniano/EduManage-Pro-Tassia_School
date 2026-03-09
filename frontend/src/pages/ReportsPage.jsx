import { useState, useEffect, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { apiFetch } from "../utils/api";
import { Icon, Icons, Card, Select, Button, Spinner, RubricBadge, ScoreBar } from "../components/ui";
import ProgressReportForm from "../components/ProgressReportForm";
import GradePerformanceReport from "../components/GradePerformanceReport";

export default function ReportsPage({ onToast }) {
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
  
  const printRef = useRef();

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
      const examParam = selectedExam ? `?examId=${selectedExam}` : "";
      const res = await apiFetch(`/api/reports/subject/${id}${examParam}`);
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
          { id: "subject", label: "Subject Report", icon: Icons.book }
        ].map(t => (
          <button key={t.id} onClick={() => { setActiveTab(t.id); setStudentReport(null); setSubjectReport(null); setClassReportData(null); }}
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
                  examInstance={examInstances[0]}
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
                    
                    // Find top performer
                    const studentAvgs = studentIds.map(sid => {
                      const sGrades = allGrades.filter(g => g.studentId === sid);
                      const sTotal = sGrades.reduce((s, g) => s + g.score, 0);
                      return { id: sid, avg: sGrades.length ? Math.round(sTotal / sGrades.length) : 0 };
                    }).sort((a, b) => b.avg - a.avg);
                    const topStudent = students.find(s => s.id === studentAvgs[0]?.id);
                    
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
              <div className="flex-1 min-w-48">
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
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Class Average</p>
                    <p className="text-4xl font-black text-gray-900">{subjectReport.averageScore}<span className="text-lg text-gray-400">%</span></p>
                    <RubricBadge score={Math.round(subjectReport.averageScore)} />
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
