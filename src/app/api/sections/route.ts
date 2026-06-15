import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const course_id = searchParams.get('course_id');
    const semester_number = searchParams.get('semester_number');

    if (!course_id || !semester_number) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
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
      .filter((s): s is string => s !== null);

    return NextResponse.json(sections);
  } catch (error) {
    console.error("Fetch sections error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
