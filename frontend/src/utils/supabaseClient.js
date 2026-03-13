// =============================================================================
// Supabase Client-Side Query Examples
// =============================================================================
// Add @supabase/supabase-js to your frontend package.json:
// npm install @supabase/supabase-js
// =============================================================================

import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://srtttdzdwchsqgzvmwlg.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key-here';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// =============================================================================
// EXAMPLE 1: Supabase JavaScript Client Query
// =============================================================================
// Fetch grades with related student and subject data using .select() with joins

export async function fetchGradesWithDetails() {
  const { data, error } = await supabase
    .from('grades')
    .select(`
      id,
      score,
      comment,
      date,
      is_locked,
      student:students!inner(
        id,
        name,
        class:classes!inner(name)
      ),
      subject:subjects!inner(
        id,
        name
      ),
      exam_instance:exam_instances!inner(name),
      submitted_by_user:users!inner(username)
    `)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching grades:', error);
    return [];
  }

  return data;
}

// Alternative simpler approach without nested joins:
export async function fetchGradesSimple() {
  const { data: grades, error } = await supabase
    .from('grades')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching grades:', error);
    return [];
  }

  // Fetch related data separately
  const studentIds = [...new Set(grades.map(g => g.student_id))];
  const subjectIds = [...new Set(grades.map(g => g.subject_id))];

  const [studentsRes, subjectsRes] = await Promise.all([
    supabase.from('students').select('*').in('id', studentIds),
    supabase.from('subjects').select('*').in('id', subjectIds)
  ]);

  const studentMap = new Map(studentsRes.data?.map(s => [s.id, s]) || []);
  const subjectMap = new Map(subjectsRes.data?.map(s => [s.id, s]) || []);

  // Enrich grades with related data
  return grades.map(grade => ({
    ...grade,
    student: studentMap.get(grade.student_id),
    subject: subjectMap.get(grade.subject_id)
  }));
}

// =============================================================================
// EXAMPLE 2: Raw SQL Join Query
// =============================================================================
// For more complex queries, you can use the Supabase PostgreSQL directly

export async function fetchGradesWithSQL() {
  // This uses a PostgreSQL function or direct query via RPC
  // Note: You may need to create a database function for this
  
  const { data, error } = await supabase.rpc('get_grades_with_details', {
    // Parameters if needed
  });
  
  if (error) {
    console.error('Error calling RPC:', error);
    return [];
  }
  
  return data;
}

// Alternative: Use postgrest-filter for complex queries
export async function fetchGradesByStudent(studentId) {
  const { data, error } = await supabase
    .from('grades')
    .select(`
      *,
      subject:subjects(name),
      exam_instance:exam_instances(name)
    `)
    .eq('student_id', studentId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching student grades:', error);
    return [];
  }

  return data;
}

// =============================================================================
// EXAMPLE 3: Dashboard Summary Query
// =============================================================================

export async function fetchDashboardSummary() {
  // Get total students
  const { count: totalStudents } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true });

  // Get total grades entered
  const { count: totalGrades } = await supabase
    .from('grades')
    .select('*', { count: 'exact', head: true });

  // Get average score
  const { data: avgData } = await supabase
    .from('grades')
    .select('score');

  const avgScore = avgData?.length 
    ? Math.round(avgData.reduce((sum, g) => sum + g.score, 0) / avgData.length * 10) / 10 
    : 0;

  // Get grade distribution
  const { data: allGrades } = await supabase
    .from('grades')
    .select('score');

  const distribution = { EE: 0, ME: 0, AE: 0, BE: 0 };
  
  allGrades?.forEach(grade => {
    const score = grade.score;
    if (score >= 90) distribution.EE++;
    else if (score >= 58) distribution.ME++;
    else if (score >= 31) distribution.AE++;
    else distribution.BE++;
  });

  // Get subject averages
  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, name');

  const subjectAverages = await Promise.all(
    subjects.map(async (subject) => {
      const { data: grades } = await supabase
        .from('grades')
        .select('score')
        .eq('subject_id', subject.id);

      const avg = grades?.length 
        ? Math.round(grades.reduce((sum, g) => sum + g.score, 0) / grades.length * 10) / 10 
        : 0;

      return {
        subject: subject.name,
        average: avg,
        count: grades?.length || 0
      };
    })
  );

  // Get top performers
  const { data: students } = await supabase
    .from('students')
    .select('id, name, class_id');

  const classIds = [...new Set(students?.map(s => s.class_id).filter(Boolean) || [])];
  const { data: classes } = await supabase
    .from('classes')
    .select('id, name')
    .in('id', classIds);

  const classMap = new Map(classes?.map(c => [c.id, c.name]) || []);

  const topPerformers = await Promise.all(
    (students || []).map(async (student) => {
      const { data: grades } = await supabase
        .from('grades')
        .select('score')
        .eq('student_id', student.id);

      if (!grades?.length) return null;

      const avg = Math.round(grades.reduce((sum, g) => sum + g.score, 0) / grades.length * 10) / 10;

      return {
        id: student.id,
        name: student.name,
        class: classMap.get(student.class_id) || '',
        average: avg
      };
    })
  );

  return {
    totalStudents: totalStudents || 0,
    totalGradesEntered: totalGrades || 0,
    averageScore: avgScore,
    gradeDistribution: distribution,
    subjectAverages,
    topPerformers: (topPerformers.filter(Boolean) || [])
      .sort((a, b) => b.average - a.average)
      .slice(0, 5)
  };
}

// =============================================================================
// EXAMPLE 4: Filter and Search Queries
// =============================================================================

// Filter grades by date range
export async function fetchGradesByDateRange(startDate, endDate) {
  const { data, error } = await supabase
    .from('grades')
    .select('*, student:students(name), subject:subjects(name)')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching grades by date:', error);
    return [];
  }

  return data;
}

// Search students by name
export async function searchStudents(query) {
  const { data, error } = await supabase
    .from('students')
    .select('*, class:classes(name)')
    .ilike('name', `%${query}%`)
    .order('name');

  if (error) {
    console.error('Error searching students:', error);
    return [];
  }

  return data;
}

// Get students by class
export async function fetchStudentsByClass(classId) {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('class_id', classId)
    .order('name');

  if (error) {
    console.error('Error fetching students by class:', error);
    return [];
  }

  return data;
}

// =============================================================================
// EXAMPLE 5: Real-time Subscriptions
// =============================================================================

// Subscribe to grade changes (for real-time updates)
export function subscribeToGrades(callback) {
  const subscription = supabase
    .channel('grades-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'grades'
    }, (payload) => {
      callback(payload);
    })
    .subscribe();

  return () => supabase.removeChannel(subscription);
}

export default supabase;