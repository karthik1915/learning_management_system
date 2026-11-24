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

  private async resolveAccess(v: Viewer, courseId: string) {
    const course = await this.repo.findById(v.tenantId, courseId);
    if (!course) return null;

    const [teaching, enrollment] = await Promise.all([
      this.repo.instructorLink(v.tenantId, courseId, v.membershipId),
      this.repo.activeEnrollment(v.tenantId, courseId, v.membershipId),
    ]);

    const manager = isAdmin(v) || !!teaching;
    const student = !!enrollment && course.status === "PUBLISHED";
    if (!manager && !student) return null;

    return {
      course,
      teaching,
      enrollment: enrollment ?? null,
      manager,
      viewer: {
        role: isAdmin(v)
          ? ("ADMIN" as const)
          : teaching
            ? ("INSTRUCTOR" as const)
            : ("STUDENT" as const),
        canEdit: isAdmin(v) || !!teaching?.canEdit,
        enrollment: enrollment ?? null,
      },
    };
  }

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
   * /courses/:courseId — Course metadata & viewer state.
   * Returns null (-> 404) when the caller may not see the course, so existence is never leaked.
   */
  async courseDetail(v: Viewer, courseId: string) {
    const access = await this.resolveAccess(v, courseId);
    if (!access) return null;

    return {
      course: access.course,
      viewer: access.viewer,
    };
  }

  /** /courses/:courseId/lessons — Lightweight lesson metadata, lock state, and progress. */
  async courseLessons(v: Viewer, courseId: string) {
    const access = await this.resolveAccess(v, courseId);
    if (!access) return null;

    const { course, enrollment, manager } = access;
    const rows = await this.repo.lessons(v.tenantId, courseId, !manager);

    const progressList = enrollment
      ? await this.repo.lessonProgress(v.tenantId, enrollment.id)
      : [];
    const progressByLesson = new Map(progressList.map((p) => [p.lessonId, p]));

    const enforceLocks = !manager && course.isSequentialUnlock;
    let previousCompleted = true;

    const lessons = rows.map((lesson) => {
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
              timeSpentSeconds: progress?.timeSpentSeconds ?? 0,
              completedAt: progress?.completedAt ?? null,
            }
          : null,
      };
    });

    return { lessons };
  }

  /**
   * /courses/:courseId/:lessonId — Single lesson details, full blocks, lock state, and progress.
   * Returns null (-> 404) when the course or lesson does not exist or is hidden from the viewer.
   */
  async lessonDetail(v: Viewer, courseId: string, lessonId: string) {
    const access = await this.resolveAccess(v, courseId);
    if (!access) return null;

    const { course, enrollment, manager, viewer } = access;

    const lesson = await this.repo.lessonById(
      v.tenantId,
      courseId,
      lessonId,
      !manager,
    );
    if (!lesson) return null;

    // Sequential unlock applies to students only; managers always see everything open.
    // Lesson N opens once lesson N-1 is COMPLETED; a locked lesson keeps everything after it locked.
    const enforceLocks = !manager && course.isSequentialUnlock;
    const lessonProgressList = enrollment
      ? await this.repo.lessonProgress(v.tenantId, enrollment.id)
      : [];
    const progressByLesson = new Map(
      lessonProgressList.map((p) => [p.lessonId, p]),
    );

    let locked = false;
    if (enforceLocks) {
      const orderedLessons = await this.repo.lessons(
        v.tenantId,
        courseId,
        true,
      );
      let previousCompleted = true;
      for (const item of orderedLessons) {
        const itemLocked = !item.isPreview && !previousCompleted;
        if (item.id === lesson.id) {
          locked = itemLocked;
          break;
        }
        previousCompleted =
          progressByLesson.get(item.id)?.status === "COMPLETED";
      }
    }

    const [blocks, blockProgressList] = await Promise.all([
      this.repo.lessonBlocks(v.tenantId, lesson.id),
      enrollment ? this.repo.blockProgress(v.tenantId, enrollment.id) : [],
    ]);

    const progress = progressByLesson.get(lesson.id);
    const statusByBlock = new Map(blockProgressList.map((p) => [p.blockId, p]));

    return {
      course: {
        id: course.id,
        title: course.title,
        slug: course.slug,
        status: course.status,
        isSequentialUnlock: course.isSequentialUnlock,
      },
      viewer,
      lesson: {
        ...lesson,
        locked,
        progress: enrollment
          ? {
              status: progress?.status ?? "NOT_STARTED",
              progressPercent: progress?.progressPercent ?? 0,
              completedBlocks: progress?.completedBlocks ?? 0,
              requiredBlocks: progress?.requiredBlocks ?? 0,
              timeSpentSeconds: progress?.timeSpentSeconds ?? 0,
              completedAt: progress?.completedAt ?? null,
            }
          : null,
        blocks: blocks.map(({ lessonId: _lessonId, ...block }) => ({
          ...block,
          status: enrollment
            ? (statusByBlock.get(block.id)?.status ?? "NOT_STARTED")
            : null,
        })),
      },
    };
  }
}
