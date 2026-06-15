import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }

    const { enrollment_id, eval_name, fundamental_knowledge, core_skills, communication_skills, soft_skills, evaluation_date } = await req.json();

    if (!evaluation_date) {
      return NextResponse.json({ error: "Missing evaluation_date" }, { status: 400 });
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Add evaluation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
