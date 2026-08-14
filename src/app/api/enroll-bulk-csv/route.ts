import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { bulkStudentImportSchema } from '@/lib/validations';

export async function POST(req: Request) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }

    const body = await req.json();
    const validation = bulkStudentImportSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ 
        error: "Validation failed", 
        details: validation.error.issues.map(e => e.message) 
      }, { status: 400 });
    }

    const { virtual_class_id, students } = validation.data;

    // Fetch virtual class details
    const virtualClass = await prisma.virtualClass.findUnique({
      where: { id: virtual_class_id },
      include: {
        subject: {
          include: { course: true }
        }
      }
    });

    if (!virtualClass) {
      return NextResponse.json({ error: "Classroom not found" }, { status: 404 });
    }

    if (sessionUser.role === 'TEACHER' && virtualClass.teacher_id !== sessionUser.id) {
      return NextResponse.json({ error: "Forbidden: Not assigned to this classroom" }, { status: 403 });
    }

    const courseId = virtualClass.subject.course_id;
    let createdCount = 0;
    let enrolledCount = 0;

    // Process all students atomically
    await prisma.$transaction(async (tx) => {
      for (const studentData of students) {
        // Find existing student by roll_no or email
        let student = await tx.user.findFirst({
          where: {
            OR: [
              { roll_no: studentData.roll_no },
              ...(studentData.email ? [{ email: studentData.email }] : [])
            ]
          }
        });

        // Create student if not already present
        if (!student) {
          student = await tx.user.create({
            data: {
              name: studentData.name.trim(),
              roll_no: studentData.roll_no.trim(),
              email: studentData.email?.trim() || null,
              section: studentData.section?.trim() || virtualClass.section || null,
              role: 'STUDENT',
              course_id: courseId,
              current_semester: virtualClass.subject.semester_number || 1
            }
          });
          createdCount++;
        }

        // Upsert enrollment in this virtual class
        const existingEnrollment = await tx.classEnrollment.findUnique({
          where: {
            virtual_class_id_student_id: {
              virtual_class_id,
              student_id: student.id
            }
          }
        });

        if (!existingEnrollment) {
          await tx.classEnrollment.create({
            data: {
              virtual_class_id,
              student_id: student.id,
              group_label: studentData.group_label
            }
          });
          enrolledCount++;
        } else if (existingEnrollment.group_label !== studentData.group_label) {
          // Update group if modified
          await tx.classEnrollment.update({
            where: { id: existingEnrollment.id },
            data: { group_label: studentData.group_label }
          });
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${students.length} students (${createdCount} new accounts created, ${enrolledCount} new enrollments added)`
    });
  } catch (error: any) {
    console.error("Bulk student import error:", error);
    return NextResponse.json({ error: error.message || "Failed to process bulk student import" }, { status: 500 });
  }
}
