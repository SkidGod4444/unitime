import { z } from "zod";

export const profileSchema = z.object({
  name: z.string().min(1, "Full name is required"),
  admissionId: z.string().min(1, "Admission number is required"),
  enrollmentId: z.string().optional(),
  whatsappNumber: z
    .string()
    .min(1, "WhatsApp number is required")
    .regex(
      /^\+?[0-9\s\-()]{7,15}$/,
      "Enter a valid phone number with country code",
    ),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  department: z.string().min(1, "Department is required"),
  course: z.string().min(1, "Course is required"),
  semister: z.string().min(1, "Semester is required"),
  section: z.string().min(1, "Section is required"),
  yearOfAdmission: z
    .string()
    .min(1, "Year of admission is required")
    .regex(/^\d{4}$/, "Enter a valid 4-digit year"),
});

export type ProfileFormData = z.infer<typeof profileSchema>;
export type ProfileFormErrors = Partial<Record<keyof ProfileFormData, string>>;
