import { and, desc, eq, lt } from "drizzle-orm";
import type { Tx } from "@/db/client";
import { tAuditLog } from "@/db/schemas";

export type AuditFilter = {
  before?: string;
  limit?: number;
  entityType?: string;
  action?: string;
  actorUserId?: string;
};

export class AuditRepository {
  constructor(private tx: Tx) {}

  /** Cursor pagination: pass `meta.nextBefore` as `before` to get the next page. */
  async find(tenantId: string, f: AuditFilter) {
    const a = tAuditLog;
    const limit = f.limit ?? 50;
    const rows = await this.tx
      .select()
      .from(a)
      .where(
        and(
          eq(a.tenantId, tenantId),
          f.before ? lt(a.createdAt, new Date(f.before)) : undefined,
          f.entityType ? eq(a.entityType, f.entityType) : undefined,
          f.action ? eq(a.action, f.action) : undefined,
          f.actorUserId ? eq(a.actorUserId, f.actorUserId) : undefined,
        ),
      )
      .orderBy(desc(a.createdAt))
      .limit(limit + 1);

    const data = rows.slice(0, limit);
    return {
      data,
      meta: {
        limit,
        hasMore: rows.length > limit,
        nextBefore: rows.length > limit ? data.at(-1)?.createdAt : null,
      },
    };
  }
}
