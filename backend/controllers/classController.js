import prisma from '../config/db.js';

export const createVirtualClass = async (req, res) => {
    try {
        const { subject_id, teacher_id, academic_year, section, enrollments } = req.body;

        const virtualClass = await prisma.virtualClass.create({
            data: {
                subject_id,
                teacher_id,
                academic_year,
                section,
                enrollments: {
                    create: enrollments.map(e => ({
                        student_id: e.student_id,
                        group_label: e.group_label
                    }))
                }
            }
        });

        res.json({ success: true, class: virtualClass });
    } catch (error) {
        console.error("Error creating virtual class:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getVirtualClasses = async (req, res) => {
    try {
        const { teacher_id, course_id } = req.query;
        let whereClause = {};

        if (teacher_id) {
            whereClause.teacher_id = teacher_id;
        }

        if (course_id) {
            whereClause.subject = {
                course_id: course_id
            };
        }

        const classes = await prisma.virtualClass.findMany({
            where: whereClause,
            include: {
                subject: {
                    include: {
                        course: {
                            include: { school: true }
                        }
                    }
                },
                teacher: true,
                _count: {
                    select: { enrollments: true }
                }
            }
        });
        res.json(classes);
    } catch (error) {
        console.error("Error fetching virtual classes:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getVirtualClassById = async (req, res) => {
    try {
        const { id } = req.params;
        const virtualClass = await prisma.virtualClass.findUnique({
            where: { id },
            include: {
                subject: {
                    include: {
                        course: {
                            include: { school: true }
                        }
                    }
                },
                teacher: true,
                enrollments: {
                    include: {
                        student: true,
                        evaluations: {
                            orderBy: { evaluation_date: 'asc' }
                        }
                    }
                }
            }
        });

        if (!virtualClass) {
            return res.status(404).json({ error: "Classroom not found" });
        }

        const enrichedEnrollments = virtualClass.enrollments.map(enrollment => {
            const studentEvals = enrollment.evaluations;
            const totalMarks = studentEvals.reduce((sum, ev) => sum + (ev.fundamental_knowledge || 0) + (ev.core_skills || 0) + (ev.communication_skills || 0) + (ev.soft_skills || 0), 0);
            const average = studentEvals.length > 0 ? (totalMarks / studentEvals.length).toFixed(1) : null;
            return {
                ...enrollment,
                averageMarks: average ? parseFloat(average) : null
            };
        });

        res.json({
            virtualClass: {
                ...virtualClass,
                enrollments: enrichedEnrollments
            }
        });
    } catch (error) {
        console.error("Error fetching classroom details:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const deleteVirtualClass = async (req, res) => {
    try {
        const { id } = req.params;

        const enrollments = await prisma.classEnrollment.findMany({
            where: { virtual_class_id: id }
        });

        const enrollmentIds = enrollments.map(e => e.id);

        if (enrollmentIds.length > 0) {
            await prisma.evaluation.deleteMany({
                where: { enrollment_id: { in: enrollmentIds } }
            });
        }

        await prisma.classEnrollment.deleteMany({
            where: { virtual_class_id: id }
        });

        await prisma.virtualClass.delete({
            where: { id }
        });

        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting classroom:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
