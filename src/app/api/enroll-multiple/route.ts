import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser || sessionUser.role !== 'ADMIN') {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }

    const { virtual_class_id, group_label, student_ids } = await req.json();

    if (!virtual_class_id || !group_label || !Array.isArray(student_ids)) {
      return NextResponse.json({ error: "Missing or invalid required fields" }, { status: 400 });
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

    return NextResponse.json({ success: true, count: student_ids.length });
  } catch (error) {
    console.error("Batch enroll error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
