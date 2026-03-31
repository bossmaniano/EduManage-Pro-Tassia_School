import TassiaHeader from "./TassiaHeader";

// Rubric mapping function for grade performance
function getRubricAndPoints(score) {
  if (score >= 90 && score <= 100) return { rubric: "EE 1", points: 8 };
  if (score >= 75 && score <= 89) return { rubric: "EE 2", points: 7 };
  if (score >= 58 && score <= 74) return { rubric: "ME 1", points: 6 };
  if (score >= 41 && score <= 57) return { rubric: "ME 2", points: 5 };
  if (score >= 31 && score <= 40) return { rubric: "AE 1", points: 4 };
  if (score >= 21 && score <= 30) return { rubric: "AE 2", points: 3 };
  if (score >= 11 && score <= 20) return { rubric: "BE 1", points: 2 };
  if (score >= 1 && score <= 10) return { rubric: "BE 2", points: 1 };
  if (score === 0) return { rubric: "BE 2", points: 0 };
  return { rubric: "-", points: 0 };
}

export default function GradePerformanceReport({ 
  students, 
  grades, 
  subjects, 
  className, 
  examInstance,
  reportMode = "points"
}) {
  // Get class subjects (subjects that this class is doing)
  const classSubjectIds = className?.subjects || [];
  
  // Filter grades to only include subjects that this class is doing
  const filteredGrades = classSubjectIds.length > 0 
    ? grades.filter(g => classSubjectIds.includes(g.subjectId))
    : grades;
  
  // Get unique subject IDs from filtered grades (only subjects this class is doing)
  const gradeSubjectIds = [...new Set(filteredGrades.map(g => g.subjectId))];
  
  // Calculate student data WITHOUT rankings (just list students)
  const studentData = students.map(student => {
    const studentGrades = filteredGrades.filter(g => g.studentId === student.id);
    const scores = {};
    const points = {};
    let totalScore = 0;
    let totalPoints = 0;
    let subjectCount = 0;
    
    // Only iterate over subjects that have grades
    gradeSubjectIds.forEach(subjectId => {
      const grade = studentGrades.find(g => g.subjectId === subjectId);
      const score = grade?.score || 0;
      const { points: pts } = getRubricAndPoints(score);
      scores[subjectId] = score;
      points[subjectId] = pts;
      if (score > 0) {
        totalScore += score;
        totalPoints += pts;
        subjectCount++;
      }
    });
    
    // Calculate average based on report mode
    const avg = subjectCount > 0 
      ? (reportMode === "score" 
          ? Math.round(totalScore / subjectCount) 
          : Math.round(totalPoints / subjectCount))
      : 0;
    
    return {
      ...student,
      scores,
      points,
      totalScore,
      totalPoints,
      avg
    };
  }); // No sorting - students listed without ranking

  // Students ranked by performance (highest to lowest)
  const rankedStudents = [...studentData]
    .sort((a, b) => b.avg - a.avg)
    .map((s, i) => ({ ...s, roll: i + 1 }));

  // Determine display labels based on report mode
  const isScoreMode = reportMode === "score";
  const avgLabel = isScoreMode ? "Avg Score" : "Avg";
  const summaryLabel1 = isScoreMode ? "Average Score" : "Average Points";

  // Calculate class average (mean of all individual student scores)
  const allScores = filteredGrades.filter(g => g.score > 0).map(g => g.score);
  const classAverage = allScores.length > 0 
    ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
    : 0;
  
  // Calculate average of student averages (for Average Score display)
  const studentAverages = rankedStudents.filter(s => s.totalPoints > 0).map(s => s.avg);
  const averageScore = studentAverages.length > 0 
    ? Math.round(studentAverages.reduce((a, b) => a + b, 0) / studentAverages.length)
    : 0;
  
  const allTotalPoints = rankedStudents.map(s => s.totalPoints);
  const averagePoints = allTotalPoints.length > 0 
    ? Math.round(allTotalPoints.reduce((a, b) => a + b, 0) / allTotalPoints.length) 
    : 0;
  
  // Total students who sat for the exam (students with at least one grade)
  const totalStudents = rankedStudents.filter(s => s.totalPoints > 0).length;

  // Get short subject codes
  const getSubjectCode = (name) => {
    const codes = {
      'Mathematics': 'Mat',
      'English': 'Eng',
      'Science': 'Sci',
      'History': 'His',
      'Art': 'Art'
    };
    return codes[name] || name.substring(0, 3).toUpperCase();
  };

  return (
    <div className="bg-white p-8 max-w-[210mm] mx-auto" style={{ minHeight: '297mm' }}>
      <TassiaHeader />
      
      {/* Title */}
      <h2 className="text-xl font-bold text-center uppercase mb-2 border-b border-black pb-2">
        GRADE PERFORMANCE REPORT
      </h2>
      
      <p className="text-center text-sm mb-6">
        {className?.name || 'All Grades'} | {examInstance?.name || 'Term 1'} | {examInstance?.year || '2026'}
      </p>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="border-2 border-black p-4 text-center bg-gray-50">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">{summaryLabel1}</p>
          <p className="text-3xl font-extrabold">{isScoreMode ? averageScore : averagePoints}</p>
        </div>
        <div className="border-2 border-black p-4 text-center bg-gray-50">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">Total Students</p>
          <p className="text-3xl font-extrabold">{totalStudents}</p>
        </div>
        <div className="border-2 border-black p-4 text-center bg-gray-50">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">Class Average</p>
          <p className="text-3xl font-extrabold">{classAverage}%</p>
        </div>
      </div>

      {/* Ranking Table */}
      <table className="w-full border-collapse border-2 border-black text-sm">
        <thead>
          <tr className="bg-black text-white">
            <th className="border border-black py-3 px-2 text-center font-bold w-14">Roll</th>
            <th className="border border-black py-3 px-3 text-left font-bold">Student Name</th>
            {gradeSubjectIds.map(subjectId => {
              const subject = subjects.find(s => s.id === subjectId);
              return (
                <th key={subjectId} className="border border-black py-3 px-2 text-center font-bold w-16">
                  {subject ? getSubjectCode(subject.name) : subjectId}
                </th>
              );
            })}
            <th className="border border-black py-3 px-2 text-center font-bold w-16">{avgLabel}</th>
            <th className="border border-black py-3 px-2 text-center font-bold w-20">Total Score</th>
          </tr>
        </thead>
        <tbody>
          {rankedStudents.map((student, index) => (
            <tr key={student.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="border border-black py-2 px-2 text-center font-bold">
                {student.roll}
              </td>
              <td className="border border-black py-2 px-3 font-medium">{student.name}</td>
              {gradeSubjectIds.map(subjectId => {
                // Find the specific grade for this student/subject to get audit info
                const grade = grades.find(g => g.studentId === student.id && g.subjectId === subjectId);
                const hasGrade = grade && grade.score > 0;
                const tooltipText = hasGrade && grade.updatedBy 
                  ? `Last updated by ${grade.updatedBy} on ${grade.updatedAt ? new Date(grade.updatedAt).toLocaleDateString() : 'N/A'} at ${grade.updatedAt ? new Date(grade.updatedAt).toLocaleTimeString() : ''}`
                  : '';
                return (
                  <td 
                    key={subjectId} 
                    className="border border-black py-2 px-2 text-center"
                    title={tooltipText}
                  >
                    {isScoreMode ? student.scores[subjectId] : student.points[subjectId]}
                  </td>
                );
              })}
              <td className="border border-black py-2 px-2 text-center font-bold">{student.avg}</td>
              <td className="border border-black py-2 px-2 text-center font-bold">{isScoreMode ? student.totalScore : student.totalPoints}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Signature Section */}
      <div className="mt-8 pt-4 border-t border-gray-300">
        <p className="font-semibold">
          Class Teacher: ____________________
          <span className="ml-8">Sign: ____________________</span>
        </p>
      </div>

      {/* Print Footer */}
      <div className="text-center text-xs text-gray-500 mt-8 pt-4 border-t border-gray-300">
        <p>Generated by EduManage Pro | Tassia School</p>
      </div>
    </div>
  );
}
