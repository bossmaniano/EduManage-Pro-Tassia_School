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

  // Get subjects assigned to student's class
  const classSubjects = (() => {
    if (!student?.classId || !classes.length || !subjects?.length) return subjects || [];
    const cls = classes.find(c => c.id === student.classId);
    if (!cls?.subjects?.length) return subjects;
    // Filter to only show subjects assigned to this class
    return subjects.filter(s => cls.subjects.includes(s.id));
  })();

  // Calculate total points based on class subjects
  const totalPoints = grades.reduce((sum, g) => {
    const { points } = getRubricAndPoints(g.score || 0);
    return sum + points;
  }, 0);
  
  // Calculate average based on class subjects
  const totalScore = grades.reduce((sum, g) => sum + (g.score || 0), 0);
  const avgScore = classSubjects.length > 0 ? Math.round(totalScore / classSubjects.length) : 0;

  return (
    <div className="bg-white p-8 max-w-[210mm] mx-auto" style={{ minHeight: '297mm' }}>
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
            <td className="py-1 border-b border-black">{examInstance?.name || 'Term 1'}</td>
            <td className="py-1 px-4 font-semibold">Year:</td>
            <td className="py-1 border-b border-black">2026</td>
          </tr>
        </tbody>
      </table>

      {/* Assessment Type */}
      <p className="mb-2 font-semibold">Type of Assessment: <span className="font-normal">SUMMATIVE ASSESSMENT</span></p>

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
          {classSubjects?.map(subject => {
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
            <td className="border border-black py-2 px-2" colSpan={2}>TOTAL POINTS</td>
            <td className="border border-black py-2 px-2 text-center">{totalPoints}</td>
            <td className="border border-black py-2 px-2" colSpan={2}>TOTAL MARKS: {totalScore}</td>
            <td className="border border-black py-2 px-2"></td>
          </tr>
        </tbody>
      </table>

      {/* Footer Section */}
      <div className="grid grid-cols-2 gap-8 mt-8">
        <div>
          <p className="font-semibold mb-1">Class Teacher's Remarks:</p>
          <div className="border border-black h-16 mb-2"></div>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-xs text-gray-600">Signature:</p>
              <div className="border-b border-black w-32 h-8"></div>
            </div>
            <div>
              <p className="text-xs text-gray-600">Date:</p>
              <div className="border-b border-black w-24 h-8"></div>
            </div>
          </div>
        </div>
        <div>
          <p className="font-semibold mb-1">Head Teacher's Remarks:</p>
          <div className="border border-black h-16 mb-2"></div>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-xs text-gray-600">Signature:</p>
              <div className="border-b border-black w-32 h-8"></div>
            </div>
            <div>
              <p className="text-xs text-gray-600">Date:</p>
              <div className="border-b border-black w-24 h-8"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mt-4">
        <div>
          <p className="font-semibold mb-1">School Fee Arrears:</p>
          <div className="border border-black h-8"></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-semibold mb-1">Next Term Fee:</p>
            <div className="border border-black h-8"></div>
          </div>
          <div>
            <p className="font-semibold mb-1">Next Term Begins:</p>
            <div className="border border-black h-8"></div>
          </div>
        </div>
      </div>

      {/* Stamp Box */}
      <div className="mt-8 flex justify-end">
        <div className="border border-black w-40 h-24 flex items-center justify-center">
          <span className="text-gray-400 font-semibold">STAMP</span>
        </div>
      </div>

      {/* Print Footer */}
      <div className="text-center text-xs text-gray-500 mt-8 pt-4 border-t border-gray-300">
        <p>generated by Tassia school</p>
      </div>
    </div>
  );
}
