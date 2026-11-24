export type UserRole = "student" | "instructor" | "admin";

export type CourseStatus = "draft" | "published" | "archived";

export interface CourseSummary {
  id: string;
  title: string;
  slug: string;
  description: string;
  instructorId: string;
  status: CourseStatus;
  lessonCount: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
