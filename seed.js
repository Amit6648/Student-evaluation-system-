import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TEACHERS = [
  "Dr. Kanwaljeet Kaur", "Ms. Sukhjeet Kaur", "Er. Lakhwinder Singh", "Kamal",
  "Dr. Sandeep Singh", "Ms. Sonam Chhabra", "Ms. Gurjinder Kaur", "Rishamjot Kaur",
  "Pawandeep Kaur", "Dr. Manpreet Singh", "Ms. Richa", "Er. Kaveri Narang",
  "Dr. Jayoti Bansal", "Paramjeet Kaur", "Er. Sumeet Bharti", "Miss Sukhdeep Kaur",
  "Ms. Simran Arora", "Dr. Harjeet Singh", "Sonia", "Er. Charandeep Singh Bedi",
  "Nancy Mittal", "Dr. Gagandeep Singh", "Ms. Supriya", "Dr. Deepak Garg",
  "Dr. Parivinkal", "Dr. Amandeep Kaur", "Dr. Nitika"
];

const FIRST_NAMES = ["Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan", "Shaurya", "Atharva", "Kabir", "Rishi", "Darsh", "Rudra", "Dev", "Ananya", "Myra", "Aaradhya", "Diya", "Avni", "Prisha", "Pari", "Isha", "Riya", "Aadhya", "Meera", "Saanvi", "Aditi", "Kavya", "Tanya", "Neha", "Pooja", "Maya", "Rahul", "Karan", "Siddharth", "Vikram", "Rohan", "Mohit", "Ankit", "Manish", "Suresh", "Gaurav", "Amit", "Rakesh", "Vishal", "Sunil", "Prakash"];
const LAST_NAMES = ["Sharma", "Singh", "Patel", "Kumar", "Gupta", "Verma", "Reddy", "Yadav", "Ahluwalia", "Bansal", "Das", "Jain", "Kaur", "Kaur", "Garg", "Agarwal", "Mehta", "Chopra", "Chauhan", "Nair", "Iyer", "Rao", "Menon", "Bose", "Ghosh", "Datta", "Nandi", "Saha", "Mitra", "Mukherjee", "Chatterjee", "Banerjee", "Bhattacharya", "Chakraborty", "Sengupta", "Mishra", "Tiwari", "Pandey", "Shukla", "Agnihotri", "Dixit", "Goswami", "Dubey", "Dwivedi", "Chaturvedi"];

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log('Clearing old data...');
  await prisma.evaluation.deleteMany({});
  await prisma.classEnrollment.deleteMany({});
  await prisma.virtualClass.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.subject.deleteMany({});
  await prisma.specialization.deleteMany({});
  await prisma.course.deleteMany({});
  await prisma.school.deleteMany({});

  console.log('Creating Schools and Courses...');
  const engSchool = await prisma.school.create({ data: { name: 'School of Engineering' } });

  const coursesData = [
    { name: 'Computer Science & Engineering', prefix: 'CSE' },
    { name: 'Electronics & Communication Engineering', prefix: 'ECE' },
    { name: 'Mechanical Engineering', prefix: 'ME' },
    { name: 'Civil Engineering', prefix: 'CE' }
  ];

  const courses = [];
  for (const c of coursesData) {
    const course = await prisma.course.create({
      data: { name: c.name, school_id: engSchool.id },
    });
    courses.push({ ...course, prefix: c.prefix });

    // Create an Admin for each course
    await prisma.user.create({
      data: {
        name: `Admin ${c.prefix}`,
        role: 'ADMIN',
        course_id: course.id,
      }
    });
  }

  // Generic Main Admin
  await prisma.user.create({
    data: {
      name: `Main System Admin`,
      role: 'ADMIN',
      course_id: courses[0].id,
    }
  });

  console.log('Creating Teachers...');
  // Distribute teachers randomly among courses
  for (const tName of TEACHERS) {
    await prisma.user.create({
      data: {
        name: tName,
        role: 'TEACHER',
        course_id: getRandomItem(courses).id
      }
    });
  }

  // Common teacher for guaranteed scenarios
  const teacherJohn = await prisma.user.create({
    data: { name: 'Dr. John Smith', role: 'TEACHER', course_id: courses[0].id },
  });

  console.log('Creating Subjects...');
  const subjects = [];
  for (const course of courses) {
    for (let sem = 1; sem <= 8; sem++) {
      for (let subjNum = 1; subjNum <= 4; subjNum++) {
        const subject = await prisma.subject.create({
          data: {
            name: `${course.prefix} Semester ${sem} Subject ${subjNum}`,
            course_id: course.id,
            semester_number: sem,
          }
        });
        subjects.push(subject);
      }
    }
  }

  console.log('Generating 2000 Students...');

  // Create varying config for section counts per semester
  const SECTIONS = ['A', 'B', 'C', 'D'];
  const courseSemConfig = {};
  for (const course of courses) {
    courseSemConfig[course.id] = {};
    for (let sem = 1; sem <= 8; sem++) {
      // 2, 3, or 4 sections for this specific course+semester
      courseSemConfig[course.id][sem] = SECTIONS.slice(0, getRandomInt(2, 4));
    }
  }

  const studentsToCreate = [];
  let rollCounter = 1;
  for (let i = 0; i < 2000; i++) {
    const course = getRandomItem(courses);
    const sem = getRandomInt(1, 8);

    // Pick from the allowed sections for this specific semester
    const allowedSections = courseSemConfig[course.id][sem];
    const section = getRandomItem(allowedSections);

    const rNo = String(rollCounter).padStart(4, '0');
    rollCounter++;

    studentsToCreate.push({
      name: `${getRandomItem(FIRST_NAMES)} ${getRandomItem(LAST_NAMES)}`,
      roll_no: `${course.prefix}24${rNo}`,
      role: 'STUDENT',
      course_id: course.id,
      current_semester: sem,
      section: section
    });
  }

  // Insert students in batches to avoid Prisma payload issues
  console.log('Batch inserting students...');
  const BATCH_SIZE = 500;
  for (let i = 0; i < studentsToCreate.length; i += BATCH_SIZE) {
    const batch = studentsToCreate.slice(i, i + BATCH_SIZE);
    await prisma.user.createMany({
      data: batch
    });
  }

  console.log('Creating Sample Virtual Class for Testing...');
  const cseCourse = courses.find(c => c.prefix === 'CSE');
  const cseSem5Subjects = subjects.filter(s => s.course_id === cseCourse.id && s.semester_number === 5);

  if (cseSem5Subjects.length > 0) {
    const classDB = await prisma.virtualClass.create({
      data: {
        subject_id: cseSem5Subjects[0].id,
        teacher_id: teacherJohn.id,
        academic_year: '2023-2024',
        section: 'A',
      },
    });

    // Find some students to enroll
    const sem5StudentsSecA = await prisma.user.findMany({
      where: {
        course_id: cseCourse.id,
        current_semester: 5,
        section: 'A',
        role: 'STUDENT'
      },
      take: 10
    });

    console.log(`Enrolling ${sem5StudentsSecA.length} students into the sample class.`);

    const enrollmentsData = sem5StudentsSecA.map((st, idx) => ({
      virtual_class_id: classDB.id,
      student_id: st.id,
      group_label: idx % 2 === 0 ? 'A' : 'B'
    }));

    await prisma.classEnrollment.createMany({
      data: enrollmentsData
    });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
