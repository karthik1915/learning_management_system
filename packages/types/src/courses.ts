export type CourseStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface CourseInstructorSummary {
  membershipId: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  isPrimary: boolean;
  canEdit: boolean;
}

export interface CourseListItem {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  level: string | null;
  status: CourseStatus;
  isSequentialUnlock: boolean;
  estimatedMinutes: number | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lessonCount: number;
  enrolledCount: number;
  instructors: CourseInstructorSummary[];
}

export interface CourseViewerState {
  role: "ADMIN" | "INSTRUCTOR" | "STUDENT" | string;
  canEdit: boolean;
  enrollment: {
    id: string;
    status?: string;
    progressPercent: number;
    completedLessons: number;
    totalLessons: number;
  } | null;
}

export interface CourseLessonBlockOutline {
  id: string;
  blockType: string;
  sortOrder: number;
  title: string | null;
  durationSeconds: number | null;
  isRequired: boolean;
  status?: string | null;
}

export interface CourseLessonOutline {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  status: string;
  isPreview: boolean;
  estimatedMinutes: number | null;
  locked?: boolean;
  progress?: {
    status: string;
    progressPercent: number;
    completedBlocks: number;
    requiredBlocks: number;
    timeSpentSeconds?: number;
    completedAt?: string | null;
  } | null;
  blocks: CourseLessonBlockOutline[];
}

export interface CourseLessonBlockDetail extends CourseLessonBlockOutline {
  content?: unknown;
  url?: string | null;
  config?: Record<string, unknown> | null;
  progress?: {
    status: string;
    lastPositionSeconds: number;
  } | null;
}

export interface CourseLessonDetail {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  sortOrder: number;
  status: string;
  isPreview: boolean;
  estimatedMinutes: number | null;
  createdAt: string;
  updatedAt: string;
  locked: boolean;
  progress: {
    status: string;
    progressPercent: number;
    completedBlocks: number;
    requiredBlocks: number;
    timeSpentSeconds: number;
    completedAt: string | null;
  } | null;
  blocks: CourseLessonBlockDetail[];
}

export interface CourseListResponse {
  data: CourseListItem[];
  total: number;
  page: number;
  limit: number;
}

/** GET /courses/:courseId — Course metadata & viewer context only. */
export interface CourseDetailResponse {
  course: CourseListItem & {
    thumbnailUrl: string | null;
    deliveryMode: string | null;
    description: string | null;
    metadata: { tags?: string[]; categories?: string[] } | null;
    settings: Record<string, unknown>;
    instructors: CourseInstructorSummary[];
  };
  viewer: CourseViewerState;
}

/** GET /courses/:courseId/:lessonId — Full single-lesson payload. */
export interface CourseLessonDetailResponse {
  course: {
    id: string;
    title: string;
    slug: string;
    status: CourseStatus | string;
    isSequentialUnlock: boolean;
  };
  viewer: CourseViewerState;
  lesson: CourseLessonDetail;
}

export interface CourseLessonMeta {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  status: string;
  isPreview: boolean;
  estimatedMinutes: number | null;
  locked: boolean;
  progress: {
    status: string;
    progressPercent: number;
    completedBlocks: number;
    requiredBlocks: number;
    timeSpentSeconds: number;
    completedAt: string | null;
  } | null;
}

export interface CourseLessonsResponse {
  lessons: CourseLessonMeta[];
}
