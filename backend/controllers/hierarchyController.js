import prisma from '../config/db.js';

export const getHierarchy = async (req, res) => {
    try {
        const schools = await prisma.school.findMany({
            include: {
                courses: {
                    include: {
                        subjects: true
                    }
                }
            }
        });
        res.json({ schools });
    } catch (error) {
        console.error("Error fetching hierarchy:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getSections = async (req, res) => {
    try {
        const { course_id, semester_number } = req.query;
        if (!course_id || !semester_number) {
            return res.status(400).json({ error: "Missing parameters" });
        }

        const distinctSections = await prisma.user.findMany({
            where: {
                role: 'STUDENT',
                course_id: course_id,
                current_semester: parseInt(semester_number)
            },
            select: { section: true },
            distinct: ['section'],
            orderBy: { section: 'asc' }
        });

        const sections = distinctSections
            .map(s => s.section)
            .filter(s => s !== null);

        res.json(sections);
    } catch (error) {
        console.error("Error fetching sections:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
