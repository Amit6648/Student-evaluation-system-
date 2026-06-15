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
    const teacher_id = searchParams.get('teacher_id');
    const course_id = searchParams.get('course_id');

    let whereClause: any = {};
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

    return NextResponse.json(classes);
  } catch (error) {
    console.error("Fetch virtual classes error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser || sessionUser.role !== 'ADMIN') {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }

    const { subject_id, teacher_id, academic_year, section, enrollments } = await req.json();

    const virtualClass = await prisma.virtualClass.create({
      data: {
        subject_id,
        teacher_id,
        academic_year,
        section,
        enrollments: {
          create: enrollments.map((e: any) => ({
            student_id: e.student_id,
            group_label: e.group_label
          }))
        }
      }
    });

    return NextResponse.json({ success: true, class: virtualClass });
  } catch (error) {
    console.error("Create virtual class error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
