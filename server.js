import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Hierarchy Data for Admin Wizard
app.get('/api/hierarchy', async (req, res) => {
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
        const specializations = await prisma.specialization.findMany();

        res.json({ schools, specializations });
    } catch (error) {
        console.error("Error fetching hierarchy:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Users
app.get('/api/users', async (req, res) => {
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
});

// Get Sections for a given Course and Semester
app.get('/api/sections', async (req, res) => {
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

        // Filter out null sections
        const sections = distinctSections
            .map(s => s.section)
            .filter(s => s !== null);

        res.json(sections);
    } catch (error) {
        console.error("Error fetching sections:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Create Virtual Class (Admin)
app.post('/api/virtual-classes', async (req, res) => {
    try {
        const { subject_id, teacher_id, academic_year, section, enrollments } = req.body;
        // enrollments: [{ student_id, group_label }]

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
});

// Fetch Virtual Classes (filtered by teacher_id or course_id optionally)
app.get('/api/virtual-classes', async (req, res) => {
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
});

// Fetch Virtual Class Details
app.get('/api/virtual-classes/:id', async (req, res) => {
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

        // Compute averages for students
        const enrichedEnrollments = virtualClass.enrollments.map(enrollment => {
            const studentEvals = enrollment.evaluations;
            const totalMarks = studentEvals.reduce((sum, ev) => {
                const evalTotal = (ev.fundamental_knowledge || 0) +
                    (ev.core_skills || 0) +
                    (ev.communication_skills || 0) +
                    (ev.soft_skills || 0);
                return sum + evalTotal;
            }, 0);
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
});

// Delete Virtual Class entirely
app.delete('/api/virtual-classes/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Find all enrollments to delete their evaluations first
        const enrollments = await prisma.classEnrollment.findMany({
            where: { virtual_class_id: id }
        });

        const enrollmentIds = enrollments.map(e => e.id);

        if (enrollmentIds.length > 0) {
            await prisma.evaluation.deleteMany({
                where: { enrollment_id: { in: enrollmentIds } }
            });
        }

        // Delete enrollments
        await prisma.classEnrollment.deleteMany({
            where: { virtual_class_id: id }
        });

        // Delete virtual class
        await prisma.virtualClass.delete({
            where: { id }
        });

        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting classroom:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Enroll a student into an existing class
app.post('/api/enrollments', async (req, res) => {
    try {
        const { virtual_class_id, student_id, group_label } = req.body;
        if (!student_id || !virtual_class_id || !group_label) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const enrollment = await prisma.classEnrollment.upsert({
            where: {
                virtual_class_id_student_id: {
                    virtual_class_id,
                    student_id
                }
            },
            update: {
                group_label
            },
            create: {
                virtual_class_id,
                student_id,
                group_label
            }
        });

        res.json({ success: true, enrollment });
    } catch (error) {
        console.error("Error enrolling student:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Remove a student
app.delete('/api/enrollments/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Delete all dependent evaluations first to avoid foreign key constraint errors
        await prisma.evaluation.deleteMany({
            where: { enrollment_id: id }
        });

        // Then delete the enrollment itself
        await prisma.classEnrollment.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        console.error("Error removing student:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Fetch eligible students for a specific virtual class
app.get('/api/eligible-students/:class_id', async (req, res) => {
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
});

// Batch enroll students
app.post('/api/enroll-multiple', async (req, res) => {
    try {
        const { virtual_class_id, group_label, student_ids } = req.body;

        if (!virtual_class_id || !group_label || !Array.isArray(student_ids)) {
            return res.status(400).json({ error: "Missing or invalid required fields" });
        }

        // Upsert all students in the batch
        const upsertPromises = student_ids.map(student_id =>
            prisma.classEnrollment.upsert({
                where: {
                    virtual_class_id_student_id: {
                        virtual_class_id,
                        student_id
                    }
                },
                update: { group_label },
                create: {
                    virtual_class_id,
                    student_id,
                    group_label
                }
            })
        );

        await Promise.all(upsertPromises);

        res.json({ success: true, count: student_ids.length });
    } catch (error) {
        console.error("Error batch enrolling students:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Add evaluation
app.post('/api/evaluations', async (req, res) => {
    try {
        const { enrollment_id, eval_name, fundamental_knowledge, core_skills, communication_skills, soft_skills } = req.body;

        await prisma.evaluation.create({
            data: {
                enrollment_id,
                eval_name,
                fundamental_knowledge: parseFloat(fundamental_knowledge),
                core_skills: parseFloat(core_skills),
                communication_skills: parseFloat(communication_skills),
                soft_skills: parseFloat(soft_skills)
            }
        });

        res.json({ success: true });
    } catch (error) {
        console.error("Error adding evaluation:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
