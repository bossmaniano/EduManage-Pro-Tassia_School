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
  // Get all subject IDs from the subjects prop
  const subjectIds = subjects.map(s => s.id);
  
  // Use all grades - don't filter by subject list since class subjects may not match database
  const filteredGrades = grades;
  
  // Get unique subject IDs from grades that exist
  const gradeSubjectIds = [...new Set(filteredGrades.map(g => g.subjectId))];
  
  // Calculate student data with rankings
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
  }).sort((a, b) => b.totalPoints - a.totalPoints); // Sort by total points descending

  // Add rankings
  const rankedStudents = studentData.map((s, i) => ({ ...s, rank: i + 1 }));

  // Calculate summary stats based on points
  const allTotalPoints = rankedStudents.map(s => s.totalPoints);
  const averagePoints = allTotalPoints.length > 0 
    ? Math.round(allTotalPoints.reduce((a, b) => a + b, 0) / allTotalPoints.length) 
    : 0;
  
  // Total students who sat for the exam (students with at least one grade)
  const totalStudents = rankedStudents.filter(s => s.totalPoints > 0).length;
  
  // Find highest performing subject (highest average points)
  const highestSubject = subjects.reduce((highest, subject) => {
    const subjectGrades = filteredGrades.filter(g => g.subjectId === subject.id && g.score > 0);
    const avgPoints = subjectGrades.length > 0
      ? Math.round(subjectGrades.reduce((sum, g) => sum + getRubricAndPoints(g.score).points, 0) / subjectGrades.length)
      : 0;
    if (!highest || avgPoints > highest.avgPoints) {
      return { name: subject.name, avgPoints };
    }
    return highest;
  }, null);
  
  const lowestSubject = subjects.reduce((lowest, subject) => {
    const subjectGrades = filteredGrades.filter(g => g.subjectId === subject.id);
    const avgPoints = subjectGrades.length > 0
      ? Math.round(subjectGrades.reduce((sum, g) => sum + getRubricAndPoints(g.score).points, 0) / subjectGrades.length)
      : 0;
    if (!lowest || avgPoints < lowest.avgPoints) {
      return { name: subject.name, avgPoints };
    }
    return lowest;
  }, null);

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
          <p className="text-xs font-semibold uppercase">Highest Subject</p>
          <p className="text-sm font-bold">{highestSubject?.name || '-'} ({highestSubject?.avgPoints || 0} pts)</p>
        </div>
        <div className="border border-black p-3 text-center">
          <p className="text-xs font-semibold uppercase">Lowest Subject</p>
          <p className="text-sm font-bold">{lowestSubject?.name || '-'}</p>
          <p className="text-xs text-gray-600">({lowestSubject?.avgPoints || 0} pts)</p>
        </div>
      </div>

      {/* Ranking Table */}
      <table className="w-full border-collapse border border-black text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black py-2 px-2 text-center font-bold w-12">Rank</th>
            <th className="border border-black py-2 px-2 text-left font-bold">Student Name</th>
            {subjects.map(subject => (
              <th key={subject.id} className="border border-black py-2 px-2 text-center font-bold w-16">
                {getSubjectCode(subject.name)}
              </th>
            ))}
            <th className="border border-black py-2 px-2 text-center font-bold w-16">Total Pts</th>
            <th className="border border-black py-2 px-2 text-center font-bold w-16">Avg %</th>
          </tr>
        </thead>
        <tbody>
          {rankedStudents.map(student => (
            <tr key={student.id} className={student.rank <= 3 ? 'bg-yellow-50' : ''}>
              <td className="border border-black py-1 px-2 text-center font-bold">
                {student.rank <= 3 ? (
                  <span className="text-yellow-600">★{student.rank}</span>
                ) : (
                  student.rank
                )}
              </td>
              <td className="border border-black py-1 px-2 font-medium">{student.name}</td>
              {subjects.map(subject => (
                <td key={subject.id} className="border border-black py-1 px-2 text-center">
                  {student.points[subject.id]}
                </td>
              ))}
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
