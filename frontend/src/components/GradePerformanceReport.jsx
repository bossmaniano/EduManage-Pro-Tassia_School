import TassiaHeader from "./TassiaHeader";

// Rubric mapping function for grade performance
function getRubricAndPoints(score) {
  if (score >= 90 && score <= 99) return { rubric: "EE 1", points: 8 };
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
  examInstance 
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
    
    const avg = subjectCount > 0 ? Math.round(totalScore / subjectCount) : 0;
    
    return {
      ...student,
      scores,
      points,
      totalScore,
      totalPoints,
      avg
    };
  }); // No sorting - students listed without ranking

  // Students listed without rankings
  const rankedStudents = studentData.map((s, i) => ({ ...s, roll: i + 1 }));

  // Calculate class average (mean of all student scores)
  const allScores = filteredGrades.filter(g => g.score > 0).map(g => g.score);
  const classAverage = allScores.length > 0 
    ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
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
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="border border-black p-3 text-center">
          <p className="text-xs font-semibold uppercase">Average Points</p>
          <p className="text-2xl font-bold">{averagePoints}</p>
        </div>
        <div className="border border-black p-3 text-center">
          <p className="text-xs font-semibold uppercase">Total Students</p>
          <p className="text-2xl font-bold">{totalStudents}</p>
        </div>
        <div className="border border-black p-3 text-center">
          <p className="text-xs font-semibold uppercase">Class Average</p>
          <p className="text-2xl font-bold">{classAverage}%</p>
        </div>
        <div className="border border-black p-3 text-center">
          <p className="text-xs font-semibold uppercase">Total Points</p>
          <p className="text-2xl font-bold">{rankedStudents.reduce((sum, s) => sum + s.totalPoints, 0)}</p>
        </div>
      </div>

      {/* Ranking Table */}
      <table className="w-full border-collapse border border-black text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black py-2 px-2 text-center font-bold w-12">Roll</th>
            <th className="border border-black py-2 px-2 text-left font-bold">Student Name</th>
            {gradeSubjectIds.map(subjectId => {
              const subject = subjects.find(s => s.id === subjectId);
              return (
                <th key={subjectId} className="border border-black py-2 px-2 text-center font-bold w-16">
                  {subject ? getSubjectCode(subject.name) : subjectId}
                </th>
              );
            })}
            <th className="border border-black py-2 px-2 text-center font-bold w-16">Total Pts</th>
            <th className="border border-black py-2 px-2 text-center font-bold w-16">Avg %</th>
          </tr>
        </thead>
        <tbody>
          {rankedStudents.map(student => (
            <tr key={student.id}>
              <td className="border border-black py-1 px-2 text-center font-bold">
                {student.roll}
              </td>
              <td className="border border-black py-1 px-2 font-medium">{student.name}</td>
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
                    className="border border-black py-1 px-2 text-center"
                    title={tooltipText}
                  >
                    {student.points[subjectId]}
                  </td>
                );
              })}
              <td className="border border-black py-1 px-2 text-center font-bold">{student.totalPoints}</td>
              <td className="border border-black py-1 px-2 text-center font-bold">{student.avg}%</td>
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
