import db from "@/lib/db";
import DashboardClient from "./DashboardClient";

export default async function Home() {
  // Fetch classrooms from db
  const classrooms = db.prepare(`
    SELECT 
      c.*,
      COUNT(e.id) as student_count
    FROM Classroom c
    LEFT JOIN Enrollment e ON c.class_id = e.class_id
    GROUP BY c.class_id
  `).all();

  return (
    <div className="min-h-screen p-8 max-w-7xl mx-auto">
      <DashboardClient initialClassrooms={classrooms} />
    </div>
  );
}
