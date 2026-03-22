import prisma from '../config/db.js';

export const addEvaluation = async (req, res) => {
    try {
        const { enrollment_id, eval_name, fundamental_knowledge, core_skills, communication_skills, soft_skills, evaluation_date } = req.body;

        if (!evaluation_date) {
            return res.status(400).json({ error: "Missing evaluation_date" });
        }

        const dateObj = new Date(evaluation_date);

        await prisma.evaluation.upsert({
            where: {
                enrollment_id_evaluation_date: {
                    enrollment_id,
                    evaluation_date: dateObj
                }
            },
            update: {
                eval_name,
                fundamental_knowledge: parseFloat(fundamental_knowledge),
                core_skills: parseFloat(core_skills),
                communication_skills: parseFloat(communication_skills),
                soft_skills: parseFloat(soft_skills)
            },
            create: {
                enrollment_id,
                evaluation_date: dateObj,
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
};
