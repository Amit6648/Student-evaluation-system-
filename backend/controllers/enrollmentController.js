import prisma from '../config/db.js';

export const enrollStudent = async (req, res) => {
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
            update: { group_label },
            create: { virtual_class_id, student_id, group_label }
        });

        res.json({ success: true, enrollment });
    } catch (error) {
        console.error("Error enrolling student:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const removeStudent = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.evaluation.deleteMany({ where: { enrollment_id: id } });
        await prisma.classEnrollment.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        console.error("Error removing student:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const batchEnroll = async (req, res) => {
    try {
        const { virtual_class_id, group_label, student_ids } = req.body;

        if (!virtual_class_id || !group_label || !Array.isArray(student_ids)) {
            return res.status(400).json({ error: "Missing or invalid required fields" });
        }

        const upsertPromises = student_ids.map(student_id =>
            prisma.classEnrollment.upsert({
                where: {
                    virtual_class_id_student_id: { virtual_class_id, student_id }
                },
                update: { group_label },
                create: { virtual_class_id, student_id, group_label }
            })
        );

        await Promise.all(upsertPromises);
        res.json({ success: true, count: student_ids.length });
    } catch (error) {
        console.error("Error batch enrolling students:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
