import { PrismaClient } from '@prisma/client';
import xlsx from 'xlsx';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const EXCEL_FILE_PATH = 'g:/Projects/Student evaluation system/Student-evaluation-system-/TEACHER ERP IDS.xlsx';

async function main() {
    console.log("Starting Teacher ERP Migration Protocol...");

    console.log('Fetching Computer Science course...');
    const cseCourse = await prisma.course.findFirst({
        where: {
            name: {
                contains: 'Computer Science'
            }
        }
    });

    if (!cseCourse) {
        console.error("CRITICAL: Computer Science course not found.");
        return;
    }
    console.log(`Course Mapped: ${cseCourse.name} (ID: ${cseCourse.id})`);

    console.log(`Reading Workbook: ${EXCEL_FILE_PATH}`);
    const workbook = xlsx.readFile(EXCEL_FILE_PATH);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Read headerless to adapt dynamically to string matches
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    let totalUpserted = 0;
    const defaultPasswordPlain = 'password123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultPasswordPlain, salt);

    // Skip the header row (index 0)
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;

        const employeeName = row[0]?.trim();
        const erpId = row[1]?.trim();

        if (!employeeName || !erpId) {
            continue;
        }

        // Format Email intuitively as <first_name>.<erp_id>@school.com
        const firstName = employeeName.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
        const targetEmail = `${firstName}.${erpId.toLowerCase()}@school.com`;

        try {
            await prisma.user.upsert({
                where: { roll_no: erpId },
                update: {
                    name: employeeName,
                    course_id: cseCourse.id,
                    email: targetEmail
                },
                create: {
                    name: employeeName,
                    roll_no: erpId,
                    email: targetEmail,
                    password: hashedPassword,
                    role: 'TEACHER',
                    course_id: cseCourse.id
                }
            });
            console.log(`Successfully mapped: ${employeeName} [${targetEmail}]`);
            totalUpserted++;
        } catch (err) {
            console.error(`Failed to map teacher: ${employeeName}`, err.message);
        }
    }

    console.log(`\n[TEACHER IMPORT COMPLETE]`);
    console.log(`Total Teachers Successfully Created/Updated: ${totalUpserted}`);
    console.log(`Global Authenticated Login Password: ${defaultPasswordPlain}`);
}

main()
    .catch(e => {
        console.error("Fatal exception during execution:");
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
