import { z } from 'zod';

export const evaluationSchema = z.object({
  enrollment_id: z.string().min(1, "Enrollment ID is required"),
  eval_name: z.string().default("Daily Evaluation"),
  fundamental_knowledge: z.coerce.number().min(0, "Score cannot be negative").max(10, "Score max is 10"),
  core_skills: z.coerce.number().min(0, "Score cannot be negative").max(10, "Score max is 10"),
  communication_skills: z.coerce.number().min(0, "Score cannot be negative").max(10, "Score max is 10"),
  soft_skills: z.coerce.number().min(0, "Score cannot be negative").max(10, "Score max is 10"),
  evaluation_date: z.string().min(1, "Evaluation date is required"),
  remarks: z.string().optional().nullable()
});

export const createVirtualClassSchema = z.object({
  subject_id: z.string().min(1, "Subject is required"),
  teacher_id: z.string().min(1, "Teacher is required"),
  academic_year: z.string().default("2026-2027"),
  section: z.string().optional().nullable(),
  enrollments: z.array(
    z.object({
      student_id: z.string(),
      group_label: z.enum(['A', 'B']).default('A')
    })
  ).optional().default([])
});

export const bulkStudentImportSchema = z.object({
  virtual_class_id: z.string().min(1, "Virtual Class ID is required"),
  students: z.array(
    z.object({
      name: z.string().min(1, "Student name is required"),
      roll_no: z.string().min(1, "Roll number is required"),
      email: z.string().email().optional().nullable(),
      section: z.string().optional().nullable(),
      group_label: z.enum(['A', 'B']).default('A')
    })
  ).min(1, "At least one student record is required")
});
