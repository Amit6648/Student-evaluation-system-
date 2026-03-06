import db from "@/lib/db";
import ClassroomClient from "./ClassroomClient";
import { getAllStudents } from "@/app/actions";
import { notFound } from "next/navigation";

export default async function ClassroomPage({ params }) {
  const { id } = await params;

  // Fetch classroom details
  const classroom = db.prepare('SELECT * FROM Classroom WHERE class_id = ?').get(id);

  if (!classroom) {
    notFound();
  }

  // Fetch all enrolled students and their marks
  // Fetch all enrolled students
  const studentsRaw = db.prepare(`
    SELECT 
      s.student_id, s.name, s.roll_no, s.department, s.semester, s.section,
      e.id as enrollment_id
    FROM Student s
    JOIN Enrollment e ON s.student_id = e.student_id
    WHERE e.class_id = ?
    ORDER BY s.roll_no ASC
  `).all(id);

  // Fetch all evaluations for this class
  const evaluations = db.prepare(`
    SELECT 
      ev.eval_id, ev.enrollment_id, ev.eval_name, 
      ev.fundamental_knowledge, ev.core_skills, ev.communication_skills, ev.soft_skills
    FROM Evaluation ev
    JOIN Enrollment e ON ev.enrollment_id = e.id
    WHERE e.class_id = ?
    ORDER BY ev.created_at ASC
  `).all(id);

  // Attach evaluations to students
  const students = studentsRaw.map(s => {
    const studentEvals = evaluations.filter(ev => ev.enrollment_id === s.enrollment_id);
    const totalMarks = studentEvals.reduce((sum, ev) => {
      const evalTotal = (ev.fundamental_knowledge || 0) + (ev.core_skills || 0) + (ev.communication_skills || 0) + (ev.soft_skills || 0);
      return sum + evalTotal;
    }, 0);
    const average = studentEvals.length > 0 ? (totalMarks / studentEvals.length).toFixed(1) : null;
    return { ...s, evaluations: studentEvals, averageMarks: average ? parseFloat(average) : null };
  });

  // Fetch master list of students for the enrollment modal
  const allStudents = await getAllStudents();

  // Calculate class stats
  let totalStudents = students.length;
  let totalClassScore = 0;
  let maxScore = 0;
  let studentsWithScore = 0;

  students.forEach(s => {
    if (s.averageMarks !== null) {
      totalClassScore += s.averageMarks;
      maxScore = Math.max(maxScore, s.averageMarks);
      studentsWithScore++;
    }
  });

  const classAvg = studentsWithScore > 0 ? (totalClassScore / studentsWithScore).toFixed(1) : '--';
  const topScore = studentsWithScore > 0 ? maxScore.toFixed(1) : '--';
  const stats = { totalStudents, classAvg, topScore };

  return (
    <div className="min-h-screen p-8 max-w-7xl mx-auto">
      <ClassroomClient classroom={classroom} students={students} allStudents={allStudents} stats={stats} />
    </div>
  );
}
