import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getRandomScore() {
    // Return something between 3.0 and 10.0 in 0.5 increments
    const base = Math.floor(Math.random() * 15) + 6; // 6 to 20
    return base / 2; // 3.0 to 10.0
}

async function main() {
    console.log("Locating Dr. John Smith's classes...");
    const john = await prisma.user.findFirst({
        where: { email: 'john@school.com' }
    });

    if (!john) {
        console.log("Could not find John!");
        return;
    }

    const classes = await prisma.virtualClass.findMany({
        where: { teacher_id: john.id },
        include: { enrollments: true }
    });

    console.log(`Found ${classes.length} classes for John.`);

    let evalCount = 0;
    const today = new Date();
    today.setHours(12, 0, 0, 0); // Noon UTC equivalent to prevent TZ shifting

    for (const vc of classes) {
        for (const enr of vc.enrollments) {
            // Generate 15 valid days of evaluations for each student, skipping weekends
            let daysGenerated = 0;
            let currentDayOffset = 0; // 0 = today, 1 = yesterday, etc.

            while (daysGenerated < 15) {
                const evalDate = new Date(today);
                evalDate.setDate(today.getDate() - currentDayOffset);
                currentDayOffset++;

                // Skip weekends
                if (evalDate.getDay() === 0 || evalDate.getDay() === 6) {
                    continue;
                }

                try {
                    // Try to catch existing so we don't throw constraint violations
                    const existing = await prisma.evaluation.findFirst({
                        where: {
                            enrollment_id: enr.id,
                            evaluation_date: evalDate
                        }
                    });

                    if (!existing) {
                        await prisma.evaluation.create({
                            data: {
                                enrollment_id: enr.id,
                                eval_name: `Daily Evaluation - ${evalDate.toLocaleDateString()}`,
                                fundamental_knowledge: getRandomScore(),
                                core_skills: getRandomScore(),
                                communication_skills: getRandomScore(),
                                soft_skills: getRandomScore(),
                                evaluation_date: evalDate,
                                remarks: "Auto-generated dummy data for testing."
                            }
                        });
                        evalCount++;
                    }
                } catch (e) {
                    console.error("Failed to insert eval:", e);
                }
                
                daysGenerated++;
            }
        }
    }

    console.log(`Successfully generated ${evalCount} new dummy evaluations.`);
}

main()
    .catch(e => {
        console.error("Error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
