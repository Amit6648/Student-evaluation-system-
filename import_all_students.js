import { PrismaClient } from '@prisma/client';
import xlsx from 'xlsx';

const prisma = new PrismaClient();
const EXCEL_FILE_PATH = 'g:/Projects/Student evaluation system/Student-evaluation-system-/Student details and uid.xlsx';

function parseSemesterAndSection(sheetName) {
    let semester = null;
    let section = null;

    const lowerName = sheetName.toLowerCase().trim();

    // Mapping logic
    if (lowerName.includes('2nd') || lowerName.includes('2')) semester = 2;
    else if (lowerName.includes('4th') || lowerName.includes('4')) semester = 4;
    else if (lowerName.includes('6th') || lowerName.includes('6')) semester = 6;
    else if (lowerName.includes('8th') || lowerName.includes('8')) semester = 8;
    
    if (lowerName === 'data science 2nd') {
        section = 'Data Science';
    } else if (lowerName === 'm.tech 2nd') {
        section = 'M.Tech';
    } else {
        // e.g. '2nd A' -> split by space -> 'A'
        const parts = sheetName.split(' ');
        if (parts.length > 1) {
            section = parts[parts.length - 1].trim(); // Get the last part, e.g., 'A' or 'B'
        }
    }

    return { semester, section };
}

async function main() {
    console.log("Starting Bulk CSV Migration Protocol...");

    console.log('Fetching Computer Science course...');
    const cseCourse = await prisma.course.findFirst({
        where: {
            name: {
                contains: 'Computer Science'
            }
        }
    });

    if (!cseCourse) {
        console.error("CRITICAL: Computer Science course not found. Please verify the `seed.js` or manual DB setup.");
        return;
    }
    console.log(`Course Mapped: ${cseCourse.name} (ID: ${cseCourse.id})`);

    console.log(`Reading Workbook: ${EXCEL_FILE_PATH}`);
    const workbook = xlsx.readFile(EXCEL_FILE_PATH);

    let totalUpserted = 0;
    let totalSkipped = 0;

    for (const sheetName of workbook.SheetNames) {
        const { semester, section } = parseSemesterAndSection(sheetName);
        console.log(`\nprocessing sheet: [${sheetName}] -> Sem: ${semester}, Sec: ${section}`);

        const sheet = workbook.Sheets[sheetName];
        // Read directly as a headerless array grid to handle shifting column positions predictably
        const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

        // Skip the header row (index 0)
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            // Validate the row payload
            if (!row || row.length === 0) continue;

            let rollNo = null;
            let studentName = null;

            // In our earlier evaluation we noticed: Number/String indices shift slightly. 
            // In usually all configurations: index 1 is UID/Roll. Index 2 or 3 is the Name.
            // Let's identify dynamically based on type.
            if (row[1] !== undefined && row[1] !== null && String(row[1]).trim() !== '') {
                rollNo = String(row[1]).trim();
            }

            // Name is usually the first long string after the UID, so index 2 or 3
            if (row[3] && typeof row[3] === 'string' && row[3].trim().length > 2) {
                studentName = row[3].trim();
            } else if (row[2] && typeof row[2] === 'string' && row[2].trim().length > 2) {
                studentName = row[2].trim();
            }
            
            if (!rollNo || !studentName || isNaN(parseInt(rollNo)) && !rollNo.match(/[A-Z0-9]+/i)) {
                totalSkipped++;
                continue;
            }

            try {
                // Upsert to avoid dropping prior configurations
                await prisma.user.upsert({
                    where: { roll_no: rollNo },
                    update: {
                        name: studentName,
                        current_semester: semester,
                        section: section,
                        course_id: cseCourse.id
                    },
                    create: {
                        name: studentName,
                        roll_no: rollNo,
                        role: 'STUDENT',
                        current_semester: semester,
                        section: section,
                        course_id: cseCourse.id,
                        email: `${rollNo.toLowerCase()}@school.com`
                    }
                });
                totalUpserted++;
            } catch (err) {
                console.error(`Failed to upsert student UID: ${rollNo}`, err.message);
                totalSkipped++;
            }
        }
    }

    console.log(`\n[IMPORT COMPLETE]`);
    console.log(`Total Records Successfully Created/Updated: ${totalUpserted}`);
    console.log(`Total Malformed Rows Skipped: ${totalSkipped}`);
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
