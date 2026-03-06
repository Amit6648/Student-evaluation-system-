"use server";

import db from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createClassroom(formData) {
    const dept_info = formData.get("dept");
    const class_name = formData.get("name");
    const semester = formData.get("semester");

    // We'll use a mocked teacher for now
    const teacherId = 't-user-1';

    // Ensure teacher exists
    const existingTeacher = db.prepare('SELECT * FROM Teacher WHERE teacher_id = ?').get(teacherId);
    if (!existingTeacher) {
        db.prepare('INSERT INTO Teacher (teacher_id, name, email) VALUES (?, ?, ?)').run(teacherId, 'Admin Teacher', 'admin@yepp.co.uk');
    }

    const id = Math.random().toString(36).substring(2, 10);

    db.prepare(`
    INSERT INTO Classroom (class_id, dept_info, class_name, semester, teacher_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, dept_info, class_name, semester, teacherId);

    revalidatePath("/");
    return { success: true };
}

export async function enrollStudent(classId, formData) {
    const studentId = formData.get("student_id");
    if (!studentId) return { error: "No student selected" };

    const enrollmentId = 'e-' + Math.random().toString(36).substring(2, 10);

    // Check enrollment
    const existing = db.prepare('SELECT id FROM Enrollment WHERE student_id = ? AND class_id = ?').get(studentId, classId);

    if (!existing) {
        db.prepare('INSERT INTO Enrollment (id, student_id, class_id) VALUES (?, ?, ?)').run(enrollmentId, studentId, classId);
    }

    revalidatePath("/class/[id]", "page");
    return { success: true };
}

export async function addEvaluation(enrollmentId, evalName, fundamental, core, communication, soft) {
    const evalId = 'ev-' + Math.random().toString(36).substring(2, 10);
    db.prepare(`
        INSERT INTO Evaluation (
            eval_id, enrollment_id, eval_name, 
            fundamental_knowledge, core_skills, communication_skills, soft_skills
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
        evalId, enrollmentId, evalName,
        parseFloat(fundamental), parseFloat(core), parseFloat(communication), parseFloat(soft)
    );
    revalidatePath("/class/[id]", "page");
    return { success: true };
}

export async function removeStudent(enrollmentId) {
    db.prepare('DELETE FROM Enrollment WHERE id = ?').run(enrollmentId);
    revalidatePath("/class/[id]", "page");
    return { success: true };
}

export async function getAllStudents() {
    return db.prepare('SELECT * FROM Student ORDER BY roll_no ASC').all();
}
