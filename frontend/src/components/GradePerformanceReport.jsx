import TassiaHeader from "./TassiaHeader";

export default function GradePerformanceReport({ 
  students, 
  grades, 
  subjects, 
  className, 
  examInstance 
}) {
  // Calculate student data with rankings
  const studentData = students.map(student => {
    const studentGrades = grades.filter(g => g.studentId === student.id);
    const scores = {};
    let total = 0;
    
    subjects.forEach(subject => {
      const grade = studentGrades.find(g => g.subjectId === subject.id);
      scores[subject.id] = grade?.score || 0;
      total += grade?.score || 0;
    });
    
    const avg = subjects.length > 0 ? Math.round(total / subjects.length) : 0;
    
    return {
      ...student,
      scores,
      total,
      avg
    };
  }).sort((a, b) => b.avg - a.avg); // Sort by average descending

  // Add rankings
  const rankedStudents = studentData.map((s, i) => ({ ...s, rank: i + 1 }));

  // Calculate summary stats
  const allAvgs = rankedStudents.map(s => s.avg);
  const averageScore = allAvgs.length > 0 
    ? Math.round(allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length) 
    : 0;
  const passCount = allAvgs.filter(a => a >= 40).length;
  const passRate = allAvgs.length > 0 
    ? Math.round((passCount / allAvgs.length) * 100) 
    : 0;
  const topPerformer = rankedStudents[0]?.name || '-';
  const lowestSubject = subjects.reduce((lowest, subject) => {
    const subjectGrades = grades.filter(g => g.subjectId === subject.id);
    const avg = subjectGrades.length > 0
      ? Math.round(subjectGrades.reduce((sum, g) => sum + g.score, 0) / subjectGrades.length)
      : 0;
    if (!lowest || avg < lowest.avg) {
      return { name: subject.name, avg };
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
        {className?.name || 'All Grades'} | {examInstance?.name || 'Term 1'} | 2026
      </p>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="border border-black p-3 text-center">
          <p className="text-xs font-semibold uppercase">Average Score</p>
          <p className="text-2xl font-bold">{averageScore}%</p>
        </div>
        <div className="border border-black p-3 text-center">
          <p className="text-xs font-semibold uppercase">Pass Rate</p>
          <p className="text-2xl font-bold">{passRate}%</p>
        </div>
        <div className="border border-black p-3 text-center">
          <p className="text-xs font-semibold uppercase">Top Performer</p>
          <p className="text-sm font-bold">{topPerformer}</p>
        </div>
        <div className="border border-black p-3 text-center">
          <p className="text-xs font-semibold uppercase">Lowest Subject</p>
          <p className="text-sm font-bold">{lowestSubject?.name || '-'}</p>
          <p className="text-xs text-gray-600">({lowestSubject?.avg || 0}%)</p>
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
            <th className="border border-black py-2 px-2 text-center font-bold w-16">Total</th>
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
                  {student.scores[subject.id]}
                </td>
              ))}
              <td className="border border-black py-1 px-2 text-center font-bold">{student.total}</td>
              <td className="border border-black py-1 px-2 text-center font-bold">{student.avg}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Print Footer */}
      <div className="text-center text-xs text-gray-500 mt-8 pt-4 border-t border-gray-300">
        <p>Generated by EduManage Pro | Tassia School</p>
      </div>
    </div>
  );
}
