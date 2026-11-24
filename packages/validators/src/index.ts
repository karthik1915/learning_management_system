import { z } from "zod";

export const createCourseSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(120),
  slug: z
    .string()
    .min(3)
    .max(120)
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must contain lowercase letters, numbers, and hyphens",
    ),
  description: z.string().min(10, "Description must be at least 10 characters"),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
});

export const enrollCourseSchema = z.object({
  courseId: z.string().uuid(),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type EnrollCourseInput = z.infer<typeof enrollCourseSchema>;
