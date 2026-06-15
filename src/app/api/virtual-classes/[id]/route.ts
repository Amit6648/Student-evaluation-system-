import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }

    const { id } = await params;

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
      return NextResponse.json({ error: "Classroom not found" }, { status: 404 });
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

    return NextResponse.json({
      virtualClass: {
        ...virtualClass,
        enrollments: enrichedEnrollments
      }
    });
  } catch (error) {
    console.error("Fetch virtual class detail error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser || sessionUser.role !== 'ADMIN') {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }

    const { id } = await params;

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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete virtual class error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
