import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    }

    const schools = await prisma.school.findMany({
      include: {
        courses: {
          include: {
            subjects: true
          }
        }
      }
    });

    return NextResponse.json({ schools });
  } catch (error) {
    console.error("Hierarchy error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
