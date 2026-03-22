import prisma from '../config/db.js';

export const getUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            include: { course: true },
            orderBy: { name: 'asc' }
        });
        res.json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getEligibleStudents = async (req, res) => {
    try {
        const { class_id } = req.params;
        const virtualClass = await prisma.virtualClass.findUnique({
            where: { id: class_id },
            include: { subject: true }
        });

        if (!virtualClass) {
            return res.status(404).json({ error: "Classroom not found" });
        }

        const eligibleStudents = await prisma.user.findMany({
            where: {
                role: 'STUDENT',
                course_id: virtualClass.subject.course_id,
                current_semester: virtualClass.subject.semester_number,
                section: virtualClass.section
            },
            orderBy: { name: 'asc' }
        });

        res.json(eligibleStudents);
    } catch (error) {
        console.error("Error fetching eligible students:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
