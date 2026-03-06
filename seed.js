import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dbPath = path.resolve("./dev.db");

// Optional: clear out existing data and schema for a fresh seed
try {
  const db = new Database(dbPath, { verbose: console.log });
  db.exec(`
    DROP TABLE IF EXISTS Evaluation;
    DROP TABLE IF EXISTS Enrollment;
    DROP TABLE IF EXISTS Student;
    DROP TABLE IF EXISTS Classroom;
    DROP TABLE IF EXISTS Teacher;
  `);
  console.log("Dropped existing tables to recreate schema.");
} catch (e) {
  console.log("Error dropping tables, proceeding to initialization.", e);
}

const db = new Database(dbPath, { verbose: console.log });

// 1. Initialize Schema
console.log("Initializing Schema...");
db.exec(`
  CREATE TABLE IF NOT EXISTS Teacher (
    teacher_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS Classroom (
    class_id TEXT PRIMARY KEY,
    dept_info TEXT NOT NULL,
    class_name TEXT NOT NULL,
    semester TEXT,
    academic_year TEXT,
    teacher_id TEXT,
    FOREIGN KEY (teacher_id) REFERENCES Teacher(teacher_id)
  );

  CREATE TABLE IF NOT EXISTS Student (
    student_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    roll_no TEXT UNIQUE NOT NULL,
    department TEXT,
    semester TEXT,
    section TEXT
  );

  CREATE TABLE IF NOT EXISTS Enrollment (
    id TEXT PRIMARY KEY,
    student_id TEXT,
    class_id TEXT,
    FOREIGN KEY (student_id) REFERENCES Student(student_id),
    FOREIGN KEY (class_id) REFERENCES Classroom(class_id),
    UNIQUE (student_id, class_id)
  );

  CREATE TABLE IF NOT EXISTS Evaluation (
    eval_id TEXT PRIMARY KEY,
    enrollment_id TEXT,
    eval_name TEXT NOT NULL,
    fundamental_knowledge REAL NOT NULL,
    core_skills REAL NOT NULL,
    communication_skills REAL NOT NULL,
    soft_skills REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (enrollment_id) REFERENCES Enrollment(id)
  );
`);

// 2. Define Seed Data
const teacherId = "t-admin-1";
const classroomId = "c-ds-2026";

const students = [
  { roll_no: "CS26-101", name: "Aarav Patel", dept: "Computer Science", sem: "4", sec: "A" },
  { roll_no: "CS26-102", name: "Aditi Sharma", dept: "Computer Science", sem: "4", sec: "A" },
  { roll_no: "CS26-103", name: "Vihaan Singh", dept: "Computer Science", sem: "4", sec: "A" },
  { roll_no: "CS26-104", name: "Diya Reddy", dept: "Computer Science", sem: "4", sec: "A" },
  { roll_no: "CS26-105", name: "Rohan Gupta", dept: "Computer Science", sem: "4", sec: "B" },
  { roll_no: "CS26-106", name: "Ananya Desai", dept: "Computer Science", sem: "4", sec: "B" },
  { roll_no: "IT26-201", name: "Arjun Verma", dept: "Information Technology", sem: "4", sec: "A" },
  { roll_no: "IT26-202", name: "Ishaan Mehta", dept: "Information Technology", sem: "4", sec: "A" },
  { roll_no: "IT26-203", name: "Kiara Kumar", dept: "Information Technology", sem: "4", sec: "A" },
  { roll_no: "IT26-204", name: "Aryan Kapoor", dept: "Information Technology", sem: "4", sec: "B" },
  { roll_no: "EC26-301", name: "Kavya Menon", dept: "Electronics", sem: "4", sec: "A" },
  { roll_no: "EC26-302", name: "Vivaan Iyer", dept: "Electronics", sem: "4", sec: "A" },
  { roll_no: "CS26-107", name: "Meera Joshi", dept: "Computer Science", sem: "4", sec: "A" },
  { roll_no: "CS26-108", name: "Devansh Nambiar", dept: "Computer Science", sem: "4", sec: "A" },
  { roll_no: "CS26-109", name: "Neha Agarwal", dept: "Computer Science", sem: "4", sec: "B" },
  { roll_no: "CS26-110", name: "Ayaan Roy", dept: "Computer Science", sem: "4", sec: "B" },
  { roll_no: "IT26-205", name: "Sneha Pillai", dept: "Information Technology", sem: "4", sec: "A" },
  { roll_no: "IT26-206", name: "Kabir Nair", dept: "Information Technology", sem: "4", sec: "A" },
  { roll_no: "EC26-303", name: "Riya Shenoy", dept: "Electronics", sem: "4", sec: "A" },
  { roll_no: "EC26-304", name: "Shaurya Banerjee", dept: "Electronics", sem: "4", sec: "A" }
];

// 3. Insert Data
console.log("Seeding core tables...");

const insertTeacher = db.prepare('INSERT INTO Teacher (teacher_id, name, email) VALUES (?, ?, ?)');
insertTeacher.run(teacherId, "Prof. Admin", "admin@flipclassroom.edu");

const insertClass = db.prepare('INSERT INTO Classroom (class_id, dept_info, class_name, semester, teacher_id) VALUES (?, ?, ?, ?, ?)');
insertClass.run(classroomId, "Computer Science", "Data Structures", "Spring 2026", teacherId);

const insertStudent = db.prepare('INSERT INTO Student (student_id, name, roll_no, department, semester, section) VALUES (?, ?, ?, ?, ?, ?)');

const enrolledStudentIds = []; // To add to the class

console.log(`Inserting ${students.length} students...`);
students.forEach((s, idx) => {
  const sId = `s-00${idx}`;
  insertStudent.run(sId, s.name, s.roll_no, s.dept, s.sem, s.sec);

  // Enroll some CS students into the Data Structures class by default
  if (s.dept === "Computer Science" && s.sec === "A") {
    enrolledStudentIds.push(sId);
  }
});

const insertEnrollment = db.prepare('INSERT INTO Enrollment (id, student_id, class_id) VALUES (?, ?, ?)');

console.log(`Enrolling default students into Data Structures class...`);
enrolledStudentIds.forEach((sId, idx) => {
  const eId = `e-ds-${idx}`;
  insertEnrollment.run(eId, sId, classroomId);

  // Just giving the first enrolled student an evaluation for testing
  if (idx === 0) {
    db.prepare(`
            INSERT INTO Evaluation (
                eval_id, enrollment_id, eval_name, 
                fundamental_knowledge, core_skills, communication_skills, soft_skills
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run('ev-001', eId, 'Presentation 1', 9, 8.5, 9, 8.5);
  }
});

console.log("Database seeded successfully!");
