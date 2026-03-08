import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.evaluation.deleteMany({});
  await prisma.classEnrollment.deleteMany({});
  await prisma.virtualClass.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.subject.deleteMany({});
  await prisma.specialization.deleteMany({});
  await prisma.course.deleteMany({});
  await prisma.school.deleteMany({});

  console.log('Cleared old data. Seeding new hierarchical data...');

  // Create School
  const engSchool = await prisma.school.create({
    data: { name: 'School of Engineering' },
  });

  // Create Course
  const cseCourse = await prisma.course.create({
    data: {
      name: 'Computer Science & Engineering',
      school_id: engSchool.id,
    },
  });

  // Create Specialization
  const aiSpec = await prisma.specialization.create({
    data: { name: 'Artificial Intelligence & Machine Learning' },
  });

  // Create Subjects
  const subjDB = await prisma.subject.create({
    data: {
      name: 'Database Management Systems',
      course_id: cseCourse.id,
      semester_number: 5,
    },
  });

  const subjAI = await prisma.subject.create({
    data: {
      name: 'Introduction to AI',
      course_id: cseCourse.id,
      specialization_id: aiSpec.id,
      semester_number: 6,
    },
  });

  // Create Admin
  await prisma.user.create({
    data: {
      name: 'Admin User',
      role: 'ADMIN',
      home_school_id: engSchool.id,
    },
  });

  // Create Teachers
  const teacherJohn = await prisma.user.create({
    data: {
      name: 'Dr. John Smith',
      role: 'TEACHER',
      home_school_id: engSchool.id,
    },
  });

  const teacherSarah = await prisma.user.create({
    data: {
      name: 'Prof. Sarah Connor',
      role: 'TEACHER',
      home_school_id: engSchool.id,
    },
  });

  // Create Students
  const student1 = await prisma.user.create({
    data: { name: 'Aarav Patel', roll_no: 'CSE21001', role: 'STUDENT', home_school_id: engSchool.id },
  });
  const student2 = await prisma.user.create({
    data: { name: 'Emily Chen', roll_no: 'CSE21002', role: 'STUDENT', home_school_id: engSchool.id },
  });
  const student3 = await prisma.user.create({
    data: { name: 'Miguel Rodriguez', roll_no: 'CSE21003', role: 'STUDENT', home_school_id: engSchool.id },
  });
  const student4 = await prisma.user.create({
    data: { name: 'Priya Sharma', roll_no: 'CSE21004', role: 'STUDENT', home_school_id: engSchool.id },
  });

  // Create Virtual Class
  const classDB = await prisma.virtualClass.create({
    data: {
      subject_id: subjDB.id,
      teacher_id: teacherJohn.id,
      academic_year: '2023-2024',
    },
  });

  // Enroll Students in Virtual Class (Groups A & B)
  await prisma.classEnrollment.create({
    data: {
      virtual_class_id: classDB.id,
      student_id: student1.id,
      group_label: 'A',
    },
  });
  await prisma.classEnrollment.create({
    data: {
      virtual_class_id: classDB.id,
      student_id: student2.id,
      group_label: 'A',
    },
  });
  await prisma.classEnrollment.create({
    data: {
      virtual_class_id: classDB.id,
      student_id: student3.id,
      group_label: 'B',
    },
  });

  const enrollment4 = await prisma.classEnrollment.create({
    data: {
      virtual_class_id: classDB.id,
      student_id: student4.id,
      group_label: 'B',
    },
  });

  // Add an evaluation for Priya
  await prisma.evaluation.create({
    data: {
      enrollment_id: enrollment4.id,
      eval_name: 'Midterm 1',
      fundamental_knowledge: 8.5,
      core_skills: 7.0,
      communication_skills: 9.0,
      soft_skills: 8.0,
    },
  });

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
