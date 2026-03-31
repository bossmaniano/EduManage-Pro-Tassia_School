import { useState, useEffect } from "react";
import { apiFetch } from "../utils/api";
import { Card, Button, Spinner } from "../components/ui";
import { 
  TrendingUp, TrendingDown, Minus, BarChart3, 
  Users, CheckCircle
} from "lucide-react";

export default function CBCAnalysisPage({ onToast }) {
  const [examInstances, setExamInstances] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedExam, setSelectedExam] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [examRes, classRes] = await Promise.all([
        apiFetch("/api/exam-instances"),
        apiFetch("/api/classes")
      ]);
      
      if (examRes.ok) {
        const examData = await examRes.json();
        setExamInstances(examData);
        if (examData.length > 0) {
          setSelectedExam(examData[0].id);
        }
      }
      
      if (classRes.ok) {
        const classData = await classRes.json();
        setClasses(classData);
      }
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    if (!selectedExam) return;
    
    setAnalyzing(true);
    try {
      const body = { examInstanceId: selectedExam };
      if (selectedClass) {
        body.classId = selectedClass;
      }
      
      const res = await apiFetch("/api/analysis/cbc", {
        method: "POST",
        body: body
      });
      
      if (res.ok) {
        const data = await res.json();
        setAnalysis(data);
        onToast("Analysis complete", "success");
      } else {
        const err = await res.json();
        onToast(err.error || "Analysis failed", "error");
      }
    } catch (err) {
      onToast("Error running analysis: " + err.message, "error");
    } finally {
      setAnalyzing(false);
    }
  };

  const getCompetencyColor = (competency) => {
    const colors = {
      'EE1': 'bg-green-600',
      'EE2': 'bg-green-400',
      'ME1': 'bg-blue-500',
      'ME2': 'bg-blue-300',
      'AE1': 'bg-yellow-500',
      'AE2': 'bg-yellow-400',
      'BE1': 'bg-orange-500',
      'BE2': 'bg-red-500'
    };
    return colors[competency] || 'bg-gray-500';
  };

  const getTrendIcon = (value) => {
    if (value > 0) return <TrendingUp className="w-5 h-5 text-green-600" />;
    if (value < 0) return <TrendingDown className="w-5 h-5 text-red-600" />;
    return <Minus className="w-5 h-5 text-gray-400" />;
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Spinner /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center no-print">
        <h1 className="text-2xl font-bold">CBC Analysis</h1>
      </div>

      {/* Exam and Class Selection */}
      <Card className="no-print">
        <div className="flex gap-4 items-end flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Exam
            </label>
            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              {examInstances.map(exam => (
                <option key={exam.id} value={exam.id}>
                  {exam.name} - {exam.term} {exam.year}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Class (Optional - for specific class analysis)
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Classes (Overall Analysis)</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
          
          <Button 
            onClick={runAnalysis} 
            disabled={analyzing || !selectedExam}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {analyzing ? "Analyzing..." : "Run Analysis"}
          </Button>
        </div>
      </Card>

      {/* Analysis Results */}
      {analysis && (
        <>
          {/* Print Header - only visible when printing */}
          <div className="hidden print:block mb-4">
            <h1 className="text-xl font-bold">CBC Analysis Report</h1>
            <p className="text-sm">
              Exam: {examInstances.find(e => e.id === selectedExam)?.name || selectedExam}
              {selectedClass && ` | Class: ${classes.find(c => c.id === selectedClass)?.name || selectedClass}`}
            </p>
            <p className="text-sm">Generated: {new Date().toLocaleDateString()}</p>
          </div>

          {/* Print Button */}
          <div className="no-print mb-4 flex justify-end">
            <Button 
              onClick={() => window.print()} 
              className="bg-gray-600 hover:bg-gray-700"
            >
              Print Report
            </Button>
          </div>

          {/* Overall Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="text-center">
              <BarChart3 className="w-8 h-8 mx-auto text-indigo-600 mb-2" />
              <p className="text-3xl font-bold text-indigo-600">
                {analysis.overall?.class_smp?.toFixed(2) || "0.00"}
              </p>
              <p className="text-sm text-gray-600">{selectedClass ? "Class Average" : "School Average"}</p>
            </Card>
            
            <Card className="text-center">
              <Users className="w-8 h-8 mx-auto text-blue-600 mb-2" />
              <p className="text-3xl font-bold text-blue-600">
                {analysis.overall?.total_students || 0}
              </p>
              <p className="text-sm text-gray-600">
                {selectedClass ? "Students in Class" : "Total Students"}
              </p>
            </Card>
            
            <Card className="text-center">
              <CheckCircle className="w-8 h-8 mx-auto text-green-600 mb-2" />
              <p className="text-3xl font-bold text-green-600">
                {analysis.overall?.pass_rate?.toFixed(1) || "0"}%
              </p>
              <p className="text-sm text-gray-600">Pass Rate</p>
            </Card>
          </div>

          {/* Subject Analysis */}
          <Card>
            <h2 className="text-lg font-bold mb-4">Subject Analysis</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 text-left">Subject</th>
                    <th className="px-4 py-2 text-center">SMP</th>
                    <th className="px-4 py-2 text-center">Students</th>
                    <th className="px-4 py-2 text-center">Avg Score</th>
                    <th className="px-4 py-2 text-center">EE1</th>
                    <th className="px-4 py-2 text-center">EE2</th>
                    <th className="px-4 py-2 text-center">ME1</th>
                    <th className="px-4 py-2 text-center">ME2</th>
                    <th className="px-4 py-2 text-center">AE1</th>
                    <th className="px-4 py-2 text-center">AE2</th>
                    <th className="px-4 py-2 text-center">BE1</th>
                    <th className="px-4 py-2 text-center">BE2</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(analysis.subject_analysis || {}).map(([subjectName, data]) => (
                    <tr key={subjectName} className="border-t">
                      <td className="px-4 py-2 font-medium">{subjectName}</td>
                      <td className="px-4 py-2 text-center font-bold">{data.smp?.toFixed(2) || "0.00"}</td>
                      <td className="px-4 py-2 text-center">{data.total_students}</td>
                      <td className="px-4 py-2 text-center font-bold">
                        {data.average_score?.toFixed(1) || "0"}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`${getCompetencyColor('EE1')} text-white px-2 py-1 rounded text-sm`}>
                          {data.competencies?.EE1 || 0}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`${getCompetencyColor('EE2')} text-white px-2 py-1 rounded text-sm`}>
                          {data.competencies?.EE2 || 0}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`${getCompetencyColor('ME1')} text-white px-2 py-1 rounded text-sm`}>
                          {data.competencies?.ME1 || 0}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`${getCompetencyColor('ME2')} text-white px-2 py-1 rounded text-sm`}>
                          {data.competencies?.ME2 || 0}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`${getCompetencyColor('AE1')} text-white px-2 py-1 rounded text-sm`}>
                          {data.competencies?.AE1 || 0}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`${getCompetencyColor('AE2')} text-white px-2 py-1 rounded text-sm`}>
                          {data.competencies?.AE2 || 0}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`${getCompetencyColor('BE1')} text-white px-2 py-1 rounded text-sm`}>
                          {data.competencies?.BE1 || 0}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`${getCompetencyColor('BE2')} text-white px-2 py-1 rounded text-sm`}>
                          {data.competencies?.BE2 || 0}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Stream Analysis (if available) */}
          {analysis.stream_analysis && Object.keys(analysis.stream_analysis).length > 0 && (
            <Card>
              <h2 className="text-lg font-bold mb-4">Stream Analysis</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-2 text-left">Stream</th>
                      <th className="px-4 py-2 text-center">SMP</th>
                      <th className="px-4 py-2 text-center">Students</th>
                      <th className="px-4 py-2 text-center">Avg Score</th>
                      <th className="px-4 py-2 text-center">Value Add</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(analysis.stream_analysis).map(([streamName, data]) => (
                      <tr key={streamName} className="border-t">
                        <td className="px-4 py-2 font-medium">{streamName || "Unassigned"}</td>
                        <td className="px-4 py-2 text-center font-bold">{data.smp?.toFixed(2) || "0.00"}</td>
                        <td className="px-4 py-2 text-center">{data.total_students}</td>
                        <td className="px-4 py-2 text-center font-bold">{data.average_score?.toFixed(1) || "0"}</td>
                        <td className="px-4 py-2 text-center">
                          {data.value_add !== undefined ? (
                            <span className={data.value_add >= 0 ? "text-green-600" : "text-red-600"}>
                              {data.value_add >= 0 ? "+" : ""}{data.value_add.toFixed(2)}
                            </span>
                          ) : "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {!analysis && !analyzing && (
        <Card className="text-center py-12">
          <BarChart3 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Select an exam and click "Run Analysis" to generate CBC report</p>
        </Card>
      )}
    </div>
  );
}
