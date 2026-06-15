import { PrismaClient } from '@prisma/client';
import xlsx from 'xlsx';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Reading Excel files...');
    
    // Read TEACHERS
    const teacherWorkbook = xlsx.readFile('./TEACHER ERP IDS.xlsx');
    const teacherSheetName = teacherWorkbook.SheetNames[0];
    const teachersData = xlsx.utils.sheet_to_json(teacherWorkbook.Sheets[teacherSheetName]);
    
    // Read STUDENTS
    const studentWorkbook = xlsx.readFile('./Student details and uid.xlsx');
    const studentSheetName = studentWorkbook.SheetNames[0];
    const studentsData = xlsx.utils.sheet_to_json(studentWorkbook.Sheets[studentSheetName]);

    const defaultPassword = await bcrypt.hash('password123', 10);

    console.log(`Found ${teachersData.length} teachers and ${studentsData.length} students.`);

    console.log('Inserting Teachers...');
    for (const row of teachersData) {
        const erpId = row['ERP ID'];
        const name = row['Employee name '];
        
        if (!erpId || !name) continue;

        try {
            await prisma.user.upsert({
                where: { id: erpId },
                update: {},
                create: {
                    id: String(erpId).trim(), // Using ERP ID as Primary Key
                    name: String(name).trim(),
                    role: 'TEACHER',
                    email: String(erpId).trim(), // Using ERP ID as login email
                    password: defaultPassword,
                    roll_no: String(erpId).trim() // Just in case, it's also set
                }
            });
        } catch (e) {
            console.error(`Error inserting teacher ${name} (${erpId}):`, e);
        }
    }

    console.log('Inserting Students...');
    
    // Find a course for the students, assuming CSE
    const course = await prisma.course.findFirst();

    for (const row of studentsData) {
        const uid = row['UID'];
        const name = row['Name of Candidate'];
        const uniRollNo = row['uni roll no'];
        
        if (!uid || !name) continue;

        try {
            await prisma.user.upsert({
                where: { roll_no: String(uid).trim() },
                update: {},
                create: {
                    name: String(name).trim(),
                    role: 'STUDENT',
                    roll_no: String(uid).trim(),
                    // Optionally store uniRollNo if possible, but schema doesn't have it natively. Let's just use UID as roll_no.
                    password: defaultPassword,
                    email: `${uid}@student.com`,
                    course_id: course ? course.id : null,
                    current_semester: 1, // Defaulting as not provided in excel
                    section: 'A'
                }
            });
        } catch (e) {
            console.error(`Error inserting student ${name} (${uid}):`, e);
        }
    }

    console.log('Finished inserting data.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
