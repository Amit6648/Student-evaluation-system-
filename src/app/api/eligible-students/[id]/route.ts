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
      include: { subject: true }
    });

    if (!virtualClass) {
      return NextResponse.json({ error: "Classroom not found" }, { status: 404 });
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

    return NextResponse.json(eligibleStudents);
  } catch (error) {
    console.error("Fetch eligible students error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
