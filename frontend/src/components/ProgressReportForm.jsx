import TassiaHeader from "./TassiaHeader";

// Rubric mapping function
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

// Generate remarks based on score
function getRemarks(score) {
  if (score >= 90) return "Exceptional performance";
  if (score >= 75) return "Very good performance";
  if (score >= 58) return "Good performance";
  if (score >= 41) return "Fair performance";
  if (score >= 31) return "Needs improvement";
  if (score >= 21) return "Below average";
  if (score >= 11) return "Well below average";
  if (score >= 1) return "Minimal performance";
  return "No performance recorded";
}

export default function ProgressReportForm({ student, grades, subjects, examInstance, classes = [] }) {
  // Get class name from classId
  const className = (() => {
    if (student?.class?.name) return student.class.name;
    if (student?.classId) {
      const cls = classes.find(c => c.id === student.classId);
      return cls?.name || '';
    }
    return student?.grade || '';
  })();

  // Get subjects assigned to student's class (exclude French - shown separately)
  const classSubjects = (() => {
    if (!student?.classId || !classes.length || !subjects?.length) return subjects?.filter(s => s.name !== 'French') || [];
    const cls = classes.find(c => c.id === student.classId);
    if (!cls?.subjects?.length) return subjects.filter(s => s.name !== 'French');
    // Filter to only show subjects assigned to this class, excluding French
    return subjects.filter(s => cls.subjects.includes(s.id) && s.name !== 'French');
  })();

  // Dynamic Subject Scanner: Extract unique subject IDs from grades
  const activeSubjectIds = [...new Set(grades?.map(g => g.subjectId) || [])];
  
  // Filter class subjects to only include those with active grades
  const activeSubjects = classSubjects.filter(s => activeSubjectIds.includes(s.id));

  // Get French grade separately - now just for display, not data bound
  const frenchSubject = subjects?.find(s => s.name === 'French');
  const frenchGrade = frenchSubject ? grades?.find(g => g.subjectId === frenchSubject.id) : null;
  const frenchScore = frenchGrade?.score || 0;
  const hasFrenchScore = frenchGrade && frenchGrade.score > 0;
  const { rubric: frenchRubric, points: frenchPoints } = hasFrenchScore ? getRubricAndPoints(frenchScore) : { rubric: '', points: 0 };

  // Calculate average based on active subjects (only subjects with grades)
  const totalScore = grades.reduce((sum, g) => sum + (g.score || 0), 0);
  const avgScore = activeSubjects.length > 0 ? Math.round(totalScore / activeSubjects.length) : 0;
  const totalPoints = grades.reduce((sum, g) => {
    const { points } = getRubricAndPoints(g.score || 0);
    return sum + points;
  }, 0);

  return (
    <div className="report-page" style={{ 
      width: '210mm', 
      height: '297mm', 
      padding: '15mm',
      boxSizing: 'border-box',
      pageBreakAfter: 'always',
      breakAfter: 'page'
    }}>
      <TassiaHeader />
      
      {/* Title */}
      <h2 className="text-xl font-bold text-center uppercase mb-6 border-b border-black pb-2">
        PROGRESS REPORT FORM
      </h2>

      {/* Student Details Table */}
      <table className="w-full mb-6 border-collapse">
        <tbody>
          <tr>
            <td className="py-1 pr-4 font-semibold w-32">Learner's Name:</td>
            <td className="py-1 border-b border-black w-48">{student?.name || ''}</td>
            <td className="py-1 px-4 font-semibold w-24">Class:</td>
            <td className="py-1 border-b border-black">{className}</td>
          </tr>
          <tr>
            <td className="py-1 pr-4 font-semibold">Term:</td>
            <td className="py-1 border-b border-black">{examInstance?.term || examInstance?.name || 'Term 1'}</td>
            <td className="py-1 px-4 font-semibold">Year:</td>
            <td className="py-1 border-b border-black">{examInstance?.year || '2026'}</td>
          </tr>
        </tbody>
      </table>

      {/* Assessment Type */}
      <div className="flex items-center gap-4 mb-2">
        <p className="font-semibold">Type of Assessment: <span className="font-normal">SUMMATIVE ASSESSMENT</span></p>
        <span className="font-semibold ml-8">Absent:</span>
        <span className="border-b border-black w-12 text-center"></span>
      </div>

      {/* Grades Table */}
      <table className="w-full mb-6 border-collapse border border-black">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black py-2 px-2 text-left font-bold">Subject</th>
            <th className="border border-black py-2 px-2 text-center font-bold">Score</th>
            <th className="border border-black py-2 px-2 text-center font-bold">Out of</th>
            <th className="border border-black py-2 px-2 text-center font-bold">Rubric</th>
            <th className="border border-black py-2 px-2 text-center font-bold">Points</th>
            <th className="border border-black py-2 px-2 text-left font-bold">Remarks</th>
          </tr>
        </thead>
        <tbody>
          {activeSubjects?.map(subject => {
            const grade = grades?.find(g => g.subjectId === subject.id);
            const score = grade?.score || 0;
            const { rubric, points } = getRubricAndPoints(score);
            
            return (
              <tr key={subject.id}>
                <td className="border border-black py-2 px-2">{subject.name}</td>
                <td className="border border-black py-2 px-2 text-center">{score}</td>
                <td className="border border-black py-2 px-2 text-center">100</td>
                <td className="border border-black py-2 px-2 text-center">{rubric}</td>
                <td className="border border-black py-2 px-2 text-center">{points}</td>
                <td className="border border-black py-2 px-2">{getRemarks(score)}</td>
              </tr>
            );
          })}
          {/* Total Row */}
          <tr className="bg-gray-100 font-bold">
            <td className="border border-black py-2 px-2" colSpan={1}>TOTAL</td>
            <td className="border border-black py-2 px-2 text-center">{totalScore}</td>
            <td className="border border-black py-2 px-2 text-center">100</td>
            <td className="border border-black py-2 px-2"></td>
            <td className="border border-black py-2 px-2 text-center">{totalPoints}</td>
            <td className="border border-black py-2 px-2"></td>
          </tr>
        </tbody>
      </table>

      {/* Standalone French Section - writable by hand */}
      <div className="mb-6 border border-black p-3 bg-gray-50">
        <div className="flex items-center gap-4">
          <span className="font-semibold w-20">French:</span>
          <span className="border-b border-black w-16 text-center"></span>
          <span className="font-semibold w-16 ml-4">Rubric:</span>
          <span className="border-b border-black w-20 text-center"></span>
          <span className="font-semibold w-16 ml-4">Points:</span>
          <span className="border-b border-black w-12 text-center"></span>
        </div>
      </div>

      {/* Teacher Remarks Section - Stacked vertically */}
      <div className="mt-8 space-y-6">
        <div>
          <p className="font-semibold mb-3">Class Teacher's Remarks:</p>
          <div className="space-y-4">
            <div className="border-b border-gray-300" style={{ lineHeight: '8mm' }}></div>
            <div className="border-b border-gray-300" style={{ lineHeight: '8mm' }}></div>
            <div className="border-b border-gray-300" style={{ lineHeight: '8mm' }}></div>
          </div>
        </div>
        <div>
          <p className="font-semibold mb-3">Head Teacher's Remarks:</p>
          <div className="space-y-4">
            <div className="border-b border-gray-300" style={{ lineHeight: '8mm' }}></div>
            <div className="border-b border-gray-300" style={{ lineHeight: '8mm' }}></div>
            <div className="border-b border-gray-300" style={{ lineHeight: '8mm' }}></div>
          </div>
        </div>
      </div>

      {/* Footer Section - Three-Column Horizontal Fee Layout */}
      <div className="mt-8 grid grid-cols-3 gap-4">
        <div>
          <p className="font-semibold mb-2">School Fee:</p>
          <div className="border-b border-black w-full"></div>
        </div>
        <div>
          <p className="font-semibold mb-2">Next Term Fee:</p>
          <div className="border-b border-black w-full"></div>
        </div>
        <div>
          <p className="font-semibold mb-2">Next Term Begins:</p>
          <div className="border-b border-black w-full"></div>
        </div>
      </div>

      {/* Professional Branding Footer */}
      <div className="mt-8 pt-4 border-t border-black">
        <p className="text-center text-sm font-semibold">Generated by Tassia School</p>
      </div>
    </div>
  );
}
