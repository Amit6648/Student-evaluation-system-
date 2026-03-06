import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './lib/db.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Fetch classrooms
app.get('/api/classrooms', (req, res) => {
    try {
        const classrooms = db.prepare(`
            SELECT 
              c.*,
              COUNT(e.id) as student_count
            FROM Classroom c
            LEFT JOIN Enrollment e ON c.class_id = e.class_id
            GROUP BY c.class_id
        `).all();
        res.json(classrooms);
    } catch (error) {
        console.error("Error fetching classrooms:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Create classroom
app.post('/api/classrooms', (req, res) => {
    try {
        const { dept_info, class_name, semester } = req.body;

        const teacherId = 't-user-1';
        const existingTeacher = db.prepare('SELECT * FROM Teacher WHERE teacher_id = ?').get(teacherId);
        if (!existingTeacher) {
            db.prepare('INSERT INTO Teacher (teacher_id, name, email) VALUES (?, ?, ?)')
                .run(teacherId, 'Admin Teacher', 'admin@yepp.co.uk');
        }

        const id = Math.random().toString(36).substring(2, 10);

        db.prepare(`
            INSERT INTO Classroom (class_id, dept_info, class_name, semester, teacher_id)
            VALUES (?, ?, ?, ?, ?)
        `).run(id, dept_info, class_name, semester, teacherId);

        res.json({ success: true, class_id: id });
    } catch (error) {
        console.error("Error creating classroom:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Fetch classroom details
app.get('/api/classrooms/:id', (req, res) => {
    try {
        const { id } = req.params;
        const classroom = db.prepare('SELECT * FROM Classroom WHERE class_id = ?').get(id);

        if (!classroom) {
            return res.status(404).json({ error: "Classroom not found" });
        }

        const studentsRaw = db.prepare(`
            SELECT 
              s.student_id, s.name, s.roll_no, s.department, s.semester, s.section,
              e.id as enrollment_id
            FROM Student s
            JOIN Enrollment e ON s.student_id = e.student_id
            WHERE e.class_id = ?
            ORDER BY s.roll_no ASC
        `).all(id);

        const evaluations = db.prepare(`
            SELECT 
              ev.eval_id, ev.enrollment_id, ev.eval_name, 
              ev.fundamental_knowledge, ev.core_skills, ev.communication_skills, ev.soft_skills
            FROM Evaluation ev
            JOIN Enrollment e ON ev.enrollment_id = e.id
            WHERE e.class_id = ?
            ORDER BY ev.created_at ASC
        `).all(id);

        const students = studentsRaw.map(s => {
            const studentEvals = evaluations.filter(ev => ev.enrollment_id === s.enrollment_id);
            const totalMarks = studentEvals.reduce((sum, ev) => {
                const evalTotal = (ev.fundamental_knowledge || 0) + (ev.core_skills || 0) + (ev.communication_skills || 0) + (ev.soft_skills || 0);
                return sum + evalTotal;
            }, 0);
            const average = studentEvals.length > 0 ? (totalMarks / studentEvals.length).toFixed(1) : null;
            return { ...s, evaluations: studentEvals, averageMarks: average ? parseFloat(average) : null };
        });

        res.json({ classroom, students });
    } catch (error) {
        console.error("Error fetching classroom details:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Fetch all students
app.get('/api/students', (req, res) => {
    try {
        const students = db.prepare('SELECT * FROM Student ORDER BY roll_no ASC').all();
        res.json(students);
    } catch (error) {
        console.error("Error fetching all students:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Enroll a student
app.post('/api/enrollments', (req, res) => {
    try {
        const { class_id, student_id } = req.body;
        if (!student_id || !class_id) {
            return res.status(400).json({ error: "Missing class_id or student_id" });
        }

        const enrollmentId = 'e-' + Math.random().toString(36).substring(2, 10);
        const existing = db.prepare('SELECT id FROM Enrollment WHERE student_id = ? AND class_id = ?').get(student_id, class_id);

        if (!existing) {
            db.prepare('INSERT INTO Enrollment (id, student_id, class_id) VALUES (?, ?, ?)').run(enrollmentId, student_id, class_id);
        }

        res.json({ success: true });
    } catch (error) {
        console.error("Error enrolling student:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Remove a student
app.delete('/api/enrollments/:id', (req, res) => {
    try {
        const { id } = req.params;
        db.prepare('DELETE FROM Enrollment WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (error) {
        console.error("Error removing student:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Add evaluation
app.post('/api/evaluations', (req, res) => {
    try {
        const { enrollment_id, eval_name, fundamental_knowledge, core_skills, communication_skills, soft_skills } = req.body;
        const evalId = 'ev-' + Math.random().toString(36).substring(2, 10);

        db.prepare(`
            INSERT INTO Evaluation (
                eval_id, enrollment_id, eval_name, 
                fundamental_knowledge, core_skills, communication_skills, soft_skills
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            evalId, enrollment_id, eval_name,
            parseFloat(fundamental_knowledge), parseFloat(core_skills), parseFloat(communication_skills), parseFloat(soft_skills)
        );
        res.json({ success: true });
    } catch (error) {
        console.error("Error adding evaluation:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
