import Database from 'better-sqlite3';

const db = new Database('dev.db', { verbose: console.log });

// Initialize database schema
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
    marks REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (enrollment_id) REFERENCES Enrollment(id)
  );
`);

export default db;
