const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');

const prisma = new PrismaClient();

const fileA = "B.Tech. CSE(CSE SEM-4 A 2024-25).xlsx";
const fileB = "B.Tech. CSE(CSE SEM-4 B 2024-25).xlsx";

function readExcelData(filePath, section) {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  // header: 2 means the second row in the file (1-indexed based logically, but in xlsx it might mean skip 1 row)
  // Actually, we saw the headers are on row 2 (index 1).
  // xlsx.utils.sheet_to_json with a specific range is better.
  const data = xlsx.utils.sheet_to_json(sheet, { range: 1 }); // skips first row
  
  const students = [];
  for (const row of data) {
    if (!row['Student Name'] || !row['Roll Number']) continue;
    
    students.push({
      name: row['Student Name'].trim(),
      roll_no: String(row['Roll Number']).trim(),
      role: 'STUDENT',
      current_semester: 4,
      section: section,
      email: row['Email'] ? String(row['Email']).trim() : null, // Not in schema directly, but just in case
    });
  }
  return students;
}

async function main() {
  console.log('Fetching CSE course...');
  const cseCourse = await prisma.course.findFirst({
    where: {
      name: {
        contains: 'Computer Science'
      }
    }
  });

  if (!cseCourse) {
    throw new Error("Computer Science course not found!");
  }

  console.log('Clearing old student data...');
  await prisma.evaluation.deleteMany({});
  await prisma.classEnrollment.deleteMany({});
  // Wait, if we delete all enrollments and evaluations, we are clearing all class data. That's likely what we want for a fresh start with new students.
  await prisma.user.deleteMany({
    where: {
      role: 'STUDENT'
    }
  });

  console.log('Reading Excel files...');
  const studentsA = readExcelData(fileA, 'A');
  const studentsB = readExcelData(fileB, 'B');
  
  const allStudents = [...studentsA, ...studentsB].map(s => ({
    name: s.name,
    roll_no: s.roll_no,
    role: s.role,
    course_id: cseCourse.id,
    current_semester: s.current_semester,
    section: s.section
  }));

  console.log(`Found ${studentsA.length} students in Section A.`);
  console.log(`Found ${studentsB.length} students in Section B.`);
  console.log(`Total students to insert: ${allStudents.length}`);

  // Need to handle duplicate roll numbers if any exist in the excel file itself
  const uniqueStudentsMap = new Map();
  for (const stu of allStudents) {
    if (!uniqueStudentsMap.has(stu.roll_no)) {
      uniqueStudentsMap.set(stu.roll_no, stu);
    } else {
      console.warn(`Duplicate roll number spotted in excel and skipped: ${stu.roll_no}`);
    }
  }

  const uniqueStudents = Array.from(uniqueStudentsMap.values());

  console.log('Batch inserting students...');
  const BATCH_SIZE = 500;
  for (let i = 0; i < uniqueStudents.length; i += BATCH_SIZE) {
    const batch = uniqueStudents.slice(i, i + BATCH_SIZE);
    await prisma.user.createMany({
      data: batch,
      skipDuplicates: true
    });
  }

  console.log('Database updated successfully with new students!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
