import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { evaluationSchema } from '@/lib/validations';

export async function POST(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }

    const body = await req.json();
    const validation = evaluationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ 
        error: "Validation failed", 
        details: validation.error.issues.map(e => e.message) 
      }, { status: 400 });
    }

    const { 
      enrollment_id, 
      eval_name, 
      fundamental_knowledge, 
      core_skills, 
      communication_skills, 
      soft_skills, 
      evaluation_date,
      remarks 
    } = validation.data;

    // Check enrollment and verify teacher scoping if role is TEACHER
    const enrollment = await prisma.classEnrollment.findUnique({
      where: { id: enrollment_id },
      include: { virtual_class: true }
    });

    if (!enrollment) {
      return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
    }

    if (sessionUser.role === 'TEACHER' && enrollment.virtual_class.teacher_id !== sessionUser.id) {
      return NextResponse.json({ error: "Forbidden: You are not assigned to this classroom" }, { status: 403 });
    }

    const dateObj = new Date(evaluation_date);
    dateObj.setHours(0, 0, 0, 0);

    const savedEvaluation = await prisma.evaluation.upsert({
      where: {
        enrollment_id_evaluation_date: {
          enrollment_id,
          evaluation_date: dateObj
        }
      },
      update: {
        eval_name,
        fundamental_knowledge,
        core_skills,
        communication_skills,
        soft_skills,
        remarks: remarks || null
      },
      create: {
        enrollment_id,
        evaluation_date: dateObj,
        eval_name,
        fundamental_knowledge,
        core_skills,
        communication_skills,
        soft_skills,
        remarks: remarks || null
      }
    });

    return NextResponse.json({ success: true, evaluation: savedEvaluation });
  } catch (error) {
    console.error("Add evaluation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
