import { Elysia, status, t } from "elysia";
import type { Tx } from "@/db/client";
import { doc } from "@/lib/openapi";
import { can } from "@/lib/permissions";
import { session } from "@/plugins/session";
import { CoursesRepository } from "./courses.repository";
import { CoursesService } from "./courses.service";

/** One place that wires repository + service onto a tenant-scoped transaction. */
export const coursesService = (tx: Tx) =>
  new CoursesService(new CoursesRepository(tx));

export const coursesRouter = new Elysia({ prefix: "/courses" })
  .use(session)
  .get(
    "",
    ({ scope, tenantId, member, permissions, query }) =>
      scope((tx) =>
        coursesService(tx).list(
          { tenantId, membershipId: member.id, permissions },
          query,
        ),
      ),
    {
      beforeHandle: can("courses.manage"),
      detail: doc("Courses", "List courses (datatable)", {
        description:
          "Page-based list with search, status filter and sorting. Admins see every course; instructors see only the courses they teach. Each row has lesson count, enrolled count and instructors.",
        permission: "courses.manage",
      }),
      query: t.Object({
        q: t.Optional(t.String({ maxLength: 100 })),
        status: t.Optional(
          t.Union([
            t.Literal("DRAFT"),
            t.Literal("PUBLISHED"),
            t.Literal("ARCHIVED"),
          ]),
        ),
        sortBy: t.Optional(
          t.Union([
            t.Literal("title"),
            t.Literal("status"),
            t.Literal("createdAt"),
            t.Literal("updatedAt"),
            t.Literal("publishedAt"),
          ]),
        ),
        order: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
        page: t.Optional(t.Numeric({ minimum: 1 })),
        limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
      }),
    },
  )
  .get(
    "/:courseId",
    async ({ scope, tenantId, member, permissions, params }) =>
      (await scope((tx) =>
        coursesService(tx).courseDetail(
          { tenantId, membershipId: member.id, permissions },
          params.courseId,
        ),
      )) ?? status(404, { error: "COURSE_NOT_FOUND" }),
    {
      beforeHandle: can("courses.read"),
      detail: doc("Courses", "Get a course with its lessons in order", {
        description:
          "Course details plus lessons ordered by position, each with a block outline (no content bodies or URLs). Students get their own progress and `locked` flags (sequential unlock); only published lessons are returned to them. Returns 404 when the course does not exist or the caller may not see it.",
        permission: "courses.read",
      }),
      params: t.Object({ courseId: t.String({ format: "uuid" }) }),
    },
  )
  .get(
    "/:courseId/lessons",
    async ({ scope, tenantId, member, permissions, params }) =>
      (await scope((tx) =>
        coursesService(tx).courseLessons(
          { tenantId, membershipId: member.id, permissions },
          params.courseId,
        ),
      )) ?? status(404, { error: "COURSE_NOT_FOUND" }),
    {
      beforeHandle: can("courses.read"),
      detail: doc("Courses", "List lessons metadata for a course", {
        description:
          "Returns ordered lesson metadata, lock status, and viewer progress without full block payloads.",
        permission: "courses.read",
      }),
      params: t.Object({ courseId: t.String({ format: "uuid" }) }),
    },
  )
  .get(
    "/:courseId/:lessonId",
    async ({ scope, tenantId, member, permissions, params }) =>
      (await scope((tx) =>
        coursesService(tx).lessonDetail(
          { tenantId, membershipId: member.id, permissions },
          params.courseId,
          params.lessonId,
        ),
      )) ?? status(404, { error: "LESSON_NOT_FOUND" }),
    {
      beforeHandle: can("courses.read"),
      detail: doc("Courses", "Get detailed information for a single lesson", {
        description:
          "Returns a single lesson within a course along with its blocks, lock status (sequential unlock), and viewer progress. Returns 404 when the course or lesson does not exist or the caller may not see it.",
        permission: "courses.read",
      }),
      params: t.Object({
        courseId: t.String({ format: "uuid" }),
        lessonId: t.String({ format: "uuid" }),
      }),
    },
  );
