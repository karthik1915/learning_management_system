import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type { Tx } from "@/db/client";

import {
  tCourse,
  tCourseBlockProgress,
  tCourseEnrollment,
  tCourseInstructor,
  tCourseLesson,
  tCourseLessonBlock,
  tCourseLessonProgress,
} from "@/db/schemas";

const c = tCourse;
const e = tCourseEnrollment;
const i = tCourseInstructor;
const l = tCourseLesson;
const b = tCourseLessonBlock;

/** Card fields shared by every course listing. */
const courseCard = {
  id: c.id,
  slug: c.slug,
  title: c.title,
  summary: c.summary,
  thumbnailUrl: c.thumbnailUrl,
  level: c.level,
  status: c.status,
  deliveryMode: c.deliveryMode,
  estimatedMinutes: c.estimatedMinutes,
  metadata: c.metadata,
};

/**
 * Drizzle drops table qualifiers in single-table selects, which turns `${c.id}` into a bare "id"
 * inside correlated subqueries (ambiguous, or silently the wrong table). Subqueries therefore use
 * aliases plus this literal, fully-qualified reference to the outer course row.
 */
const OUTER_COURSE_ID = sql.raw('"learning"."t_course"."id"');

const SORTABLE = {
  title: c.title,
  status: c.status,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
  publishedAt: c.publishedAt,
} as const;
export type CourseSort = keyof typeof SORTABLE;

export type CourseListFilter = {
  q?: string;
  status?: string;
  sortBy?: CourseSort;
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
  /** When set, only courses this membership teaches (instructor scope). Admin passes nothing. */
  taughtBy?: string;
};

export class CoursesRepository {
  constructor(private tx: Tx) {}

  /** Courses the member is enrolled in. Students only ever see PUBLISHED courses. */
  enrolledCourses(tenantId: string, membershipId: string) {
    return this.tx
      .select({
        ...courseCard,
        enrollmentId: e.id,
        enrollmentStatus: e.status,
        enrolledAt: e.enrolledAt,
        dueDate: e.dueDate,
        lastAccessedAt: e.lastAccessedAt,
        completedAt: e.completedAt,
        progressPercent: e.progressPercent,
        completedLessons: e.completedLessons,
        totalLessons: e.totalLessons,
      })
      .from(e)
      .innerJoin(c, and(eq(c.tenantId, e.tenantId), eq(c.id, e.courseId)))
      .where(
        and(
          eq(e.tenantId, tenantId),
          eq(e.membershipId, membershipId),
          isNull(e.effectiveEndDate),
          isNull(c.effectiveEndDate),
          eq(c.status, "PUBLISHED"),
        ),
      )
      .orderBy(sql`${e.lastAccessedAt} desc nulls last`, desc(e.enrolledAt));
  }

  /** Courses the member teaches (any status except deleted). */
  taughtCourses(tenantId: string, membershipId: string) {
    return this.tx
      .select({
        ...courseCard,
        isPrimary: i.isPrimary,
        canEdit: i.canEdit,
        lessonCount: this.lessonCount,
        enrolledCount: this.enrolledCount,
      })
      .from(i)
      .innerJoin(c, and(eq(c.tenantId, i.tenantId), eq(c.id, i.courseId)))
      .where(
        and(
          eq(i.tenantId, tenantId),
          eq(i.membershipId, membershipId),
          isNull(i.effectiveEndDate),
          isNull(c.effectiveEndDate),
        ),
      )
      .orderBy(asc(c.title));
  }

  // ───────── /courses (datatable) ─────────

  private get lessonCount() {
    return sql<number>`(select count(*)::int from learning.t_course_lesson ls
      where ls.course_id = ${OUTER_COURSE_ID} and ls.effective_end_date is null)`;
  }

  private get enrolledCount() {
    return sql<number>`(select count(*)::int from learning.t_course_enrollment en
      where en.course_id = ${OUTER_COURSE_ID} and en.effective_end_date is null)`;
  }

  private get instructors() {
    return sql<
      {
        membershipId: string;
        displayName: string | null;
        isPrimary: boolean;
        canEdit: boolean;
      }[]
    >`coalesce((
      select json_agg(json_build_object(
               'membershipId', ci.membership_id, 'displayName', mp.display_name,
               'isPrimary', ci.is_primary, 'canEdit', ci.can_edit)
             order by ci.is_primary desc, mp.display_name)
      from learning.t_course_instructor ci
      left join tenant.t_tenant_member_profile mp on mp.membership_id = ci.membership_id
      where ci.course_id = ${OUTER_COURSE_ID} and ci.effective_end_date is null), '[]'::json)`;
  }

  async list(tenantId: string, f: CourseListFilter) {
    const page = f.page ?? 1;
    const limit = f.limit ?? 20;
    const where: SQL | undefined = and(
      eq(c.tenantId, tenantId),
      isNull(c.effectiveEndDate),
      f.status ? eq(c.status, f.status) : undefined,
      f.q
        ? or(ilike(c.title, `%${f.q}%`), ilike(c.slug, `%${f.q}%`))
        : undefined,
      f.taughtBy
        ? sql`exists (select 1 from learning.t_course_instructor ti
                      where ti.course_id = ${OUTER_COURSE_ID} and ti.membership_id = ${f.taughtBy}
                        and ti.effective_end_date is null)`
        : undefined,
    );
    const sortCol = SORTABLE[f.sortBy ?? "updatedAt"];

    const [rows, [{ total }]] = await Promise.all([
      this.tx
        .select({
          ...courseCard,
          publishedAt: c.publishedAt,
          isSequentialUnlock: c.isSequentialUnlock,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          lessonCount: this.lessonCount,
          enrolledCount: this.enrolledCount,
          instructors: this.instructors,
        })
        .from(c)
        .where(where)
        .orderBy(f.order === "asc" ? asc(sortCol) : desc(sortCol), asc(c.id))
        .limit(limit)
        .offset((page - 1) * limit),
      this.tx
        .select({ total: sql<number>`count(*)::int` })
        .from(c)
        .where(where),
    ]);

    return {
      data: rows,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  // ───────── /courses/:courseId ─────────

  async findById(tenantId: string, id: string) {
    const [row] = await this.tx
      .select({
        ...courseCard,
        description: c.description,
        isSequentialUnlock: c.isSequentialUnlock,
        publishedAt: c.publishedAt,
        settings: c.settings,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        instructors: this.instructors,
      })
      .from(c)
      .where(
        and(eq(c.tenantId, tenantId), eq(c.id, id), isNull(c.effectiveEndDate)),
      );
    return row ?? null;
  }

  async instructorLink(
    tenantId: string,
    courseId: string,
    membershipId: string,
  ) {
    const [row] = await this.tx
      .select({ isPrimary: i.isPrimary, canEdit: i.canEdit })
      .from(i)
      .where(
        and(
          eq(i.tenantId, tenantId),
          eq(i.courseId, courseId),
          eq(i.membershipId, membershipId),
          isNull(i.effectiveEndDate),
        ),
      );
    return row ?? null;
  }

  async activeEnrollment(
    tenantId: string,
    courseId: string,
    membershipId: string,
  ) {
    const [row] = await this.tx
      .select({
        id: e.id,
        status: e.status,
        enrolledAt: e.enrolledAt,
        dueDate: e.dueDate,
        startedAt: e.startedAt,
        lastAccessedAt: e.lastAccessedAt,
        completedAt: e.completedAt,
        progressPercent: e.progressPercent,
        completedLessons: e.completedLessons,
        totalLessons: e.totalLessons,
      })
      .from(e)
      .where(
        and(
          eq(e.tenantId, tenantId),
          eq(e.courseId, courseId),
          eq(e.membershipId, membershipId),
          isNull(e.effectiveEndDate),
        ),
      );
    return row ?? null;
  }

  /** Lessons in order. Students pass publishedOnly so drafts never leave the database. */
  lessons(tenantId: string, courseId: string, publishedOnly: boolean) {
    return this.tx
      .select({
        id: l.id,
        title: l.title,
        description: l.description,
        sortOrder: l.sortOrder,
        status: l.status,
        isPreview: l.isPreview,
        estimatedMinutes: l.estimatedMinutes,
      })
      .from(l)
      .where(
        and(
          eq(l.tenantId, tenantId),
          eq(l.courseId, courseId),
          isNull(l.effectiveEndDate),
          publishedOnly ? eq(l.status, "PUBLISHED") : undefined,
        ),
      )
      .orderBy(asc(l.sortOrder), asc(l.createdAt), asc(l.id));
  }

  // ───────── /courses/:courseId/:lessonId ─────────

  /** Single lesson within a course. Students pass publishedOnly so drafts never leak. */
  async lessonById(
    tenantId: string,
    courseId: string,
    lessonId: string,
    publishedOnly: boolean,
  ) {
    const [row] = await this.tx
      .select({
        id: l.id,
        courseId: l.courseId,
        title: l.title,
        description: l.description,
        sortOrder: l.sortOrder,
        status: l.status,
        isPreview: l.isPreview,
        estimatedMinutes: l.estimatedMinutes,
        createdAt: l.createdAt,
        updatedAt: l.updatedAt,
      })
      .from(l)
      .where(
        and(
          eq(l.tenantId, tenantId),
          eq(l.courseId, courseId),
          eq(l.id, lessonId),
          isNull(l.effectiveEndDate),
          publishedOnly ? eq(l.status, "PUBLISHED") : undefined,
        ),
      );
    return row ?? null;
  }

  /** Full block details (content, URLs, config, etc.) for a single lesson. */
  lessonBlocks(tenantId: string, lessonId: string) {
    return this.tx
      .select()
      .from(b)
      .where(
        and(
          eq(b.tenantId, tenantId),
          eq(b.lessonId, lessonId),
          isNull(b.effectiveEndDate),
        ),
      )
      .orderBy(asc(b.sortOrder), asc(b.createdAt), asc(b.id));
  }

  /** Block OUTLINE only: no markdown body and no resource URL, those come from the lesson endpoint. */
  blockOutlines(tenantId: string, lessonIds: string[]) {
    if (lessonIds.length === 0) return Promise.resolve([]);
    return this.tx
      .select({
        id: b.id,
        lessonId: b.lessonId,
        blockType: b.blockType,
        title: b.title,
        sortOrder: b.sortOrder,
        isRequired: b.isRequired,
        durationSeconds: b.durationSeconds,
      })
      .from(b)
      .where(
        and(
          eq(b.tenantId, tenantId),
          inArray(b.lessonId, lessonIds),
          isNull(b.effectiveEndDate),
        ),
      )
      .orderBy(asc(b.sortOrder), asc(b.createdAt), asc(b.id));
  }

  lessonProgress(tenantId: string, enrollmentId: string) {
    const p = tCourseLessonProgress;
    return this.tx
      .select({
        lessonId: p.lessonId,
        status: p.status,
        progressPercent: p.progressPercent,
        completedBlocks: p.completedBlocks,
        requiredBlocks: p.requiredBlocks,
        timeSpentSeconds: p.timeSpentSeconds,
        completedAt: p.completedAt,
      })
      .from(p)
      .where(and(eq(p.tenantId, tenantId), eq(p.enrollmentId, enrollmentId)));
  }

  blockProgress(tenantId: string, enrollmentId: string) {
    const p = tCourseBlockProgress;
    return this.tx
      .select({
        blockId: p.blockId,
        status: p.status,
        lastPositionSeconds: p.lastPositionSeconds,
      })
      .from(p)
      .where(and(eq(p.tenantId, tenantId), eq(p.enrollmentId, enrollmentId)));
  }
}
