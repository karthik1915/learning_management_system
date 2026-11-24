import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgSchema,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { auditColumns, effectiveDates, pk, tenantIdCol } from "./common";
import { tTenant, tTenantMembership } from "./tenant";

/**
 * LEARNING SCHEMA: courses, lessons, content blocks, enrollment and progress.
 * Same rules as the tenant schema: every table carries tenant_id (RLS-protected), child -> parent
 * links are composite (tenant_id, id) FKs so a row can never point at another tenant's parent,
 * effective_end_date IS NULL = active row, and audit columns are filled by the DB trigger.
 *
 * Shape:  t_course 1─* t_course_lesson 1─* t_course_lesson_block
 *         t_course 1─* t_course_instructor *─1 membership
 *         t_course 1─* t_course_enrollment *─1 membership (student)
 *         enrollment 1─* t_course_lesson_progress 1─* t_course_block_progress
 */
export const learningSchema = pgSchema("learning");

// ───────────────────────── Course ─────────────────────────

export const tCourse = learningSchema.table(
  "t_course",
  {
    id: pk(),
    tenantId: tenantIdCol().references(() => tTenant.id),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary"), // one-line card text
    description: text("description"), // markdown
    thumbnailUrl: text("thumbnail_url"),
    level: text("level"), // BEGINNER | INTERMEDIATE | ADVANCED
    status: text("status").notNull().default("DRAFT"), // DRAFT | PUBLISHED | ARCHIVED
    deliveryMode: text("delivery_mode").notNull().default("SELF_PACED"), // SELF_PACED | INSTRUCTOR_LED
    isSequentialUnlock: boolean("is_sequential_unlock")
      .notNull()
      .default(false), // lesson N opens after N-1 is completed
    estimatedMinutes: integer("estimated_minutes"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    metadata: jsonb("metadata")
      .notNull()
      .default(sql`'{}'::jsonb`), // tags, categories, prerequisites ...
    settings: jsonb("settings")
      .notNull()
      .default(sql`'{}'::jsonb`), // other course-level switches
    ...effectiveDates(), // effective_end_date set = course deleted
    ...auditColumns(),
  },
  (t) => [
    unique("uq_t_course_tenant_id").on(t.tenantId, t.id), // composite-FK target
    uniqueIndex("uq_t_course_slug")
      .on(t.tenantId, t.slug)
      .where(sql`${t.effectiveEndDate} is null`),
    index("ix_t_course_tenant_status").on(t.tenantId, t.status),
    check(
      "ck_t_course_status",
      sql`${t.status} in ('DRAFT','PUBLISHED','ARCHIVED')`,
    ),
    check(
      "ck_t_course_delivery_mode",
      sql`${t.deliveryMode} in ('SELF_PACED','INSTRUCTOR_LED')`,
    ),
    check(
      "ck_t_course_level",
      sql`${t.level} is null or ${t.level} in ('BEGINNER','INTERMEDIATE','ADVANCED')`,
    ),
  ],
);

/** Which memberships teach a course. can_edit = may change the course content. */
export const tCourseInstructor = learningSchema.table(
  "t_course_instructor",
  {
    id: pk(),
    tenantId: tenantIdCol().references(() => tTenant.id),
    courseId: uuid("course_id").notNull(),
    membershipId: uuid("membership_id").notNull(),
    isPrimary: boolean("is_primary").notNull().default(false), // lead instructor
    canEdit: boolean("can_edit").notNull().default(true),
    ...effectiveDates(),
    ...auditColumns(),
  },
  (t) => [
    foreignKey({
      name: "fk_t_course_instructor_course",
      columns: [t.tenantId, t.courseId],
      foreignColumns: [tCourse.tenantId, tCourse.id],
    }),
    foreignKey({
      name: "fk_t_course_instructor_membership",
      columns: [t.tenantId, t.membershipId],
      foreignColumns: [tTenantMembership.tenantId, tTenantMembership.id],
    }),
    uniqueIndex("uq_t_course_instructor_current")
      .on(t.courseId, t.membershipId)
      .where(sql`${t.effectiveEndDate} is null`),
    uniqueIndex("uq_t_course_instructor_primary")
      .on(t.courseId)
      .where(sql`${t.isPrimary} and ${t.effectiveEndDate} is null`),
    index("ix_t_course_instructor_membership").on(t.tenantId, t.membershipId),
  ],
);

// ───────────────────────── Lessons and content blocks ─────────────────────────

export const tCourseLesson = learningSchema.table(
  "t_course_lesson",
  {
    id: pk(),
    tenantId: tenantIdCol().references(() => tTenant.id),
    courseId: uuid("course_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull(), // 1-based position inside the course
    status: text("status").notNull().default("DRAFT"), // DRAFT | PUBLISHED (students see PUBLISHED only)
    isPreview: boolean("is_preview").notNull().default(false), // visible even while sequential unlock is on
    estimatedMinutes: integer("estimated_minutes"),
    ...effectiveDates(),
    ...auditColumns(),
  },
  (t) => [
    foreignKey({
      name: "fk_t_course_lesson_course",
      columns: [t.tenantId, t.courseId],
      foreignColumns: [tCourse.tenantId, tCourse.id],
    }),
    unique("uq_t_course_lesson_tenant_id").on(t.tenantId, t.id), // composite-FK target
    // Deliberately NOT unique: a unique index would break one-statement reordering (swaps).
    index("ix_t_course_lesson_order").on(t.tenantId, t.courseId, t.sortOrder),
    check(
      "ck_t_course_lesson_status",
      sql`${t.status} in ('DRAFT','PUBLISHED')`,
    ),
    check("ck_t_course_lesson_order", sql`${t.sortOrder} > 0`),
  ],
);

/**
 * One piece of content inside a lesson. Normalized columns per kind of content, so each type is
 * queryable and constrained, plus `config` (JSONB) for type-specific extras.
 *   TEXT      body_markdown
 *   VIDEO     resource_provider + resource_url (+ duration_seconds)
 *   DOCUMENT  resource_url (+ resource_name, mime_type, size_bytes); body_markdown = optional caption
 *   LINK      resource_url (+ title); body_markdown = optional note
 *   CODING    ref_id -> coding problem (own table, added with the coding module)
 *   QUIZ      ref_id -> quiz (own table, later)
 * CODING / QUIZ are reserved: the CHECK allows them, the API does not accept them yet.
 */
export const tCourseLessonBlock = learningSchema.table(
  "t_course_lesson_block",
  {
    id: pk(),
    tenantId: tenantIdCol().references(() => tTenant.id),
    lessonId: uuid("lesson_id").notNull(),
    blockType: text("block_type").notNull(),
    sortOrder: integer("sort_order").notNull(),
    title: text("title"),
    bodyMarkdown: text("body_markdown"),
    resourceProvider: text("resource_provider"), // YOUTUBE | VIMEO | EXTERNAL | UPLOAD
    resourceUrl: text("resource_url"),
    resourceName: text("resource_name"),
    mimeType: text("mime_type"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    durationSeconds: integer("duration_seconds"),
    refType: text("ref_type"), // CODING_PROBLEM | QUIZ (future own tables)
    refId: uuid("ref_id"), // FK is added when those tables exist
    config: jsonb("config")
      .notNull()
      .default(sql`'{}'::jsonb`),
    isRequired: boolean("is_required").notNull().default(true), // counts toward lesson completion
    ...effectiveDates(),
    ...auditColumns(),
  },
  (t) => [
    foreignKey({
      name: "fk_t_course_lesson_block_lesson",
      columns: [t.tenantId, t.lessonId],
      foreignColumns: [tCourseLesson.tenantId, tCourseLesson.id],
    }),
    unique("uq_t_course_lesson_block_tenant_id").on(t.tenantId, t.id),
    unique("uq_t_course_lesson_block_with_lesson").on(
      t.tenantId,
      t.id,
      t.lessonId,
    ), // lets progress rows prove block belongs to lesson
    index("ix_t_course_lesson_block_order").on(
      t.tenantId,
      t.lessonId,
      t.sortOrder,
    ),
    check(
      "ck_t_course_lesson_block_type",
      sql`${t.blockType} in ('TEXT','VIDEO','DOCUMENT','LINK','CODING','QUIZ')`,
    ),
    check(
      "ck_t_course_lesson_block_content",
      sql`(
        (${t.blockType} = 'TEXT' and ${t.bodyMarkdown} is not null)
        or (${t.blockType} in ('VIDEO','DOCUMENT','LINK') and ${t.resourceUrl} is not null)
        or (${t.blockType} in ('CODING','QUIZ') and ${t.refId} is not null)
      )`,
    ),
    check(
      "ck_t_course_lesson_block_provider",
      sql`${t.resourceProvider} is null or ${t.resourceProvider} in ('YOUTUBE','VIMEO','EXTERNAL','UPLOAD')`,
    ),
    check("ck_t_course_lesson_block_order", sql`${t.sortOrder} > 0`),
  ],
);

// ───────────────────────── Enrollment (+ overall progress) ─────────────────────────

/**
 * Student <-> course. Admin enrolls. History: leaving a course sets effective_end_date, and
 * enrolling again creates a NEW row, so every enrollment period is kept.
 * progress_* columns are the course-level rollup of the lesson progress rows, maintained by the
 * service in the same transaction that writes progress.
 */
export const tCourseEnrollment = learningSchema.table(
  "t_course_enrollment",
  {
    id: pk(),
    tenantId: tenantIdCol().references(() => tTenant.id),
    courseId: uuid("course_id").notNull(),
    membershipId: uuid("membership_id").notNull(), // the student
    status: text("status").notNull().default("ACTIVE"), // ACTIVE | COMPLETED | DROPPED
    source: text("source").notNull().default("ADMIN"), // ADMIN | SELF | BATCH (later)
    enrolledAt: timestamp("enrolled_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    dueDate: date("due_date"), // instructor-led deadline
    startedAt: timestamp("started_at", { withTimezone: true }),
    lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    progressPercent: numeric("progress_percent", {
      precision: 5,
      scale: 2,
      mode: "number",
    })
      .notNull()
      .default(0),
    completedLessons: integer("completed_lessons").notNull().default(0),
    totalLessons: integer("total_lessons").notNull().default(0), // published lessons when last recomputed
    endReason: text("end_reason"), // UNENROLLED | COURSE_ARCHIVED | REPLACED (set with effective_end_date)
    ...effectiveDates(),
    ...auditColumns(),
  },
  (t) => [
    foreignKey({
      name: "fk_t_course_enrollment_course",
      columns: [t.tenantId, t.courseId],
      foreignColumns: [tCourse.tenantId, tCourse.id],
    }),
    foreignKey({
      name: "fk_t_course_enrollment_membership",
      columns: [t.tenantId, t.membershipId],
      foreignColumns: [tTenantMembership.tenantId, tTenantMembership.id],
    }),
    unique("uq_t_course_enrollment_tenant_id").on(t.tenantId, t.id), // composite-FK target
    uniqueIndex("uq_t_course_enrollment_current")
      .on(t.courseId, t.membershipId)
      .where(sql`${t.effectiveEndDate} is null`),
    index("ix_t_course_enrollment_membership").on(t.tenantId, t.membershipId),
    index("ix_t_course_enrollment_course").on(t.tenantId, t.courseId),
    check(
      "ck_t_course_enrollment_status",
      sql`${t.status} in ('ACTIVE','COMPLETED','DROPPED')`,
    ),
    check(
      "ck_t_course_enrollment_source",
      sql`${t.source} in ('ADMIN','SELF','BATCH')`,
    ),
    check(
      "ck_t_course_enrollment_progress",
      sql`${t.progressPercent} between 0 and 100`,
    ),
  ],
);

// ───────────────────────── Detailed progress (analytics-grade) ─────────────────────────

/** Per enrollment per lesson: status, time spent, when started/finished. One row per pair. */
export const tCourseLessonProgress = learningSchema.table(
  "t_course_lesson_progress",
  {
    id: pk(),
    tenantId: tenantIdCol().references(() => tTenant.id),
    enrollmentId: uuid("enrollment_id").notNull(),
    lessonId: uuid("lesson_id").notNull(),
    status: text("status").notNull().default("NOT_STARTED"), // NOT_STARTED | IN_PROGRESS | COMPLETED
    progressPercent: smallint("progress_percent").notNull().default(0), // required blocks done / required blocks
    completedBlocks: integer("completed_blocks").notNull().default(0),
    requiredBlocks: integer("required_blocks").notNull().default(0),
    timeSpentSeconds: integer("time_spent_seconds").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }),
    lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    metrics: jsonb("metrics")
      .notNull()
      .default(sql`'{}'::jsonb`), // future analytics fields without migrations
    ...auditColumns(),
  },
  (t) => [
    foreignKey({
      name: "fk_t_course_lesson_progress_enrollment",
      columns: [t.tenantId, t.enrollmentId],
      foreignColumns: [tCourseEnrollment.tenantId, tCourseEnrollment.id],
    }),
    foreignKey({
      name: "fk_t_course_lesson_progress_lesson",
      columns: [t.tenantId, t.lessonId],
      foreignColumns: [tCourseLesson.tenantId, tCourseLesson.id],
    }),
    unique("uq_t_course_lesson_progress").on(t.enrollmentId, t.lessonId),
    index("ix_t_course_lesson_progress_lesson").on(
      t.tenantId,
      t.lessonId,
      t.status,
    ), // "who finished lesson X"
    check(
      "ck_t_course_lesson_progress_status",
      sql`${t.status} in ('NOT_STARTED','IN_PROGRESS','COMPLETED')`,
    ),
    check(
      "ck_t_course_lesson_progress_pct",
      sql`${t.progressPercent} between 0 and 100`,
    ),
  ],
);

/** Per enrollment per block: the finest grain (video position, quiz/coding score later). */
export const tCourseBlockProgress = learningSchema.table(
  "t_course_block_progress",
  {
    id: pk(),
    tenantId: tenantIdCol().references(() => tTenant.id),
    enrollmentId: uuid("enrollment_id").notNull(),
    lessonId: uuid("lesson_id").notNull(),
    blockId: uuid("block_id").notNull(),
    status: text("status").notNull().default("NOT_STARTED"),
    timeSpentSeconds: integer("time_spent_seconds").notNull().default(0),
    lastPositionSeconds: integer("last_position_seconds"), // resume point for video
    attempts: integer("attempts").notNull().default(0),
    score: numeric("score", { precision: 6, scale: 2, mode: "number" }), // quiz / coding result later
    startedAt: timestamp("started_at", { withTimezone: true }),
    lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    data: jsonb("data")
      .notNull()
      .default(sql`'{}'::jsonb`), // type-specific extras (submission refs, answers ...)
    ...auditColumns(),
  },
  (t) => [
    foreignKey({
      name: "fk_t_course_block_progress_enrollment",
      columns: [t.tenantId, t.enrollmentId],
      foreignColumns: [tCourseEnrollment.tenantId, tCourseEnrollment.id],
    }),
    // (tenant, block, lesson) must match a real block of that lesson
    foreignKey({
      name: "fk_t_course_block_progress_block",
      columns: [t.tenantId, t.blockId, t.lessonId],
      foreignColumns: [
        tCourseLessonBlock.tenantId,
        tCourseLessonBlock.id,
        tCourseLessonBlock.lessonId,
      ],
    }),
    unique("uq_t_course_block_progress").on(t.enrollmentId, t.blockId),
    index("ix_t_course_block_progress_lesson").on(
      t.tenantId,
      t.enrollmentId,
      t.lessonId,
    ),
    check(
      "ck_t_course_block_progress_status",
      sql`${t.status} in ('NOT_STARTED','IN_PROGRESS','COMPLETED')`,
    ),
  ],
);
