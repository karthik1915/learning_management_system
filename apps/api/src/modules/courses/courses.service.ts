import { CoursesRepository, type CourseListFilter } from "./courses.repository";

/** Who is asking: resolved by the session plugin. */
export type Viewer = {
  tenantId: string;
  membershipId: string;
  permissions: string[];
};

const isAdmin = (v: Viewer) => v.permissions.includes("courses.manage_all");

export class CoursesService {
  constructor(private repo: CoursesRepository) {}

  /** /me/courses: strictly the caller's own courses, as a student and/or as an instructor. */
  async mine(v: Viewer) {
    const [enrolled, taught] = await Promise.all([
      this.repo.enrolledCourses(v.tenantId, v.membershipId),
      this.repo.taughtCourses(v.tenantId, v.membershipId),
    ]);
    return [
      ...taught.map(
        ({ isPrimary, canEdit, lessonCount, enrolledCount, ...course }) => ({
          relation: "INSTRUCTOR" as const,
          course,
          teaching: { isPrimary, canEdit, lessonCount, enrolledCount },
        }),
      ),
      ...enrolled.map(
        ({
          enrollmentId,
          enrollmentStatus,
          enrolledAt,
          dueDate,
          lastAccessedAt,
          completedAt,
          progressPercent,
          completedLessons,
          totalLessons,
          ...course
        }) => ({
          relation: "STUDENT" as const,
          course,
          enrollment: {
            id: enrollmentId,
            status: enrollmentStatus,
            enrolledAt,
            dueDate,
            lastAccessedAt,
            completedAt,
            progressPercent,
            completedLessons,
            totalLessons,
          },
        }),
      ),
    ];
  }

  /** /courses datatable. Admin sees every course; an instructor only the courses they teach. */
  list(v: Viewer, filter: CourseListFilter) {
    return this.repo.list(v.tenantId, {
      ...filter,
      taughtBy: isAdmin(v) ? undefined : v.membershipId,
    });
  }

  /**
   * /courses/:id. Returns null (-> 404) when the caller may not see the course, so existence is
   * never leaked. Managers (admin, or instructor of the course) see drafts; students only see a
   * PUBLISHED course they are enrolled in, with PUBLISHED lessons, and with locks applied.
   */
  async detail(v: Viewer, courseId: string) {
    const course = await this.repo.findById(v.tenantId, courseId);
    if (!course) return null;

    const [teaching, enrollment] = await Promise.all([
      this.repo.instructorLink(v.tenantId, courseId, v.membershipId),
      this.repo.activeEnrollment(v.tenantId, courseId, v.membershipId),
    ]);

    const manager = isAdmin(v) || !!teaching;
    const student = !!enrollment && course.status === "PUBLISHED";
    if (!manager && !student) return null;

    const lessons = await this.repo.lessons(v.tenantId, courseId, !manager);
    const lessonIds = lessons.map((x) => x.id);
    const [blocks, lessonProgress, blockProgress] = await Promise.all([
      this.repo.blockOutlines(v.tenantId, lessonIds),
      enrollment ? this.repo.lessonProgress(v.tenantId, enrollment.id) : [],
      enrollment ? this.repo.blockProgress(v.tenantId, enrollment.id) : [],
    ]);

    const progressByLesson = new Map(
      lessonProgress.map((p) => [p.lessonId, p]),
    );
    const statusByBlock = new Map(blockProgress.map((p) => [p.blockId, p]));

    // Sequential unlock applies to students only; managers always see everything open.
    // Lesson N opens once lesson N-1 is COMPLETED; a locked lesson keeps everything after it locked.
    const enforceLocks = !manager && course.isSequentialUnlock;
    let previousCompleted = true;

    const outline = lessons.map((lesson) => {
      const progress = progressByLesson.get(lesson.id);
      const locked = enforceLocks && !lesson.isPreview && !previousCompleted;
      previousCompleted = progress?.status === "COMPLETED";
      return {
        ...lesson,
        locked,
        progress: enrollment
          ? {
              status: progress?.status ?? "NOT_STARTED",
              progressPercent: progress?.progressPercent ?? 0,
              completedBlocks: progress?.completedBlocks ?? 0,
              requiredBlocks: progress?.requiredBlocks ?? 0,
              completedAt: progress?.completedAt ?? null,
            }
          : null,
        blocks: blocks
          .filter((x) => x.lessonId === lesson.id)
          .map(({ lessonId: _lessonId, ...block }) => ({
            ...block,
            status: enrollment
              ? (statusByBlock.get(block.id)?.status ?? "NOT_STARTED")
              : null,
          })),
      };
    });

    return {
      course,
      viewer: {
        role: isAdmin(v) ? "ADMIN" : teaching ? "INSTRUCTOR" : "STUDENT",
        canEdit: isAdmin(v) || !!teaching?.canEdit,
        enrollment: enrollment ?? null,
      },
      lessons: outline,
    };
  }
}
