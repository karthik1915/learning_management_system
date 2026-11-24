import { and, asc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import type { Tx } from "@/db/client";
import {
  tTenantInvitation,
  tTenantMemberProfile,
  tTenantMembership,
  tTenantMembershipRole,
  tTenantRole,
} from "@/db/schemas";
import { user } from "@/db/schemas/auth";

const m = tTenantMembership;
const p = tTenantMemberProfile;
const mr = tTenantMembershipRole;
const r = tTenantRole;

export type MemberFilter = {
  id?: string;
  q?: string;
  status?: string;
  role?: string;
  page?: number;
  limit?: number;
};

export class MembersRepository {
  constructor(private tx: Tx) {}

  /** The signed-in user's membership, roles and merged permissions (used by the session plugin). */
  async findContext(tenantId: string, userId: string) {
    const [member] = await this.tx
      .select({
        id: m.id,
        status: m.status,
        joinedAt: m.joinedAt,
        displayName: p.displayName,
        phone: p.phone,
        admissionNo: p.admissionNo,
      })
      .from(m)
      .leftJoin(p, eq(p.membershipId, m.id))
      .where(
        and(
          eq(m.tenantId, tenantId),
          eq(m.userId, userId),
          eq(m.status, "ACTIVE"),
          isNull(m.effectiveEndDate),
        ),
      );
    if (!member) return null;

    const roles = await this.tx
      .select({ code: r.code, name: r.name, permissions: r.permissions })
      .from(mr)
      .innerJoin(r, eq(r.id, mr.roleId))
      .where(
        and(
          eq(mr.membershipId, member.id),
          isNull(mr.effectiveEndDate),
          isNull(r.effectiveEndDate),
        ),
      );

    return {
      member,
      roles: roles.map(({ code, name }) => ({ code, name })),
      permissions: [
        ...new Set(roles.flatMap((x) => x.permissions as string[])),
      ],
    };
  }

  /** Members with their profile and role codes. Fetches limit+1 rows to compute hasMore. */
  async find(tenantId: string, f: MemberFilter) {
    const limit = f.limit ?? 20;
    const page = f.page ?? 1;
    const rows = await this.tx
      .select({
        id: m.id,
        userId: m.userId,
        status: m.status,
        joinedAt: m.joinedAt,
        email: user.email,
        displayName: p.displayName,
        phone: p.phone,
        admissionNo: p.admissionNo,
        roles: sql<
          string[]
        >`coalesce(array_agg(distinct ${r.code}) filter (where ${r.code} is not null), '{}')`,
      })
      .from(m)
      .innerJoin(user, eq(user.id, m.userId))
      .leftJoin(p, eq(p.membershipId, m.id))
      .leftJoin(mr, and(eq(mr.membershipId, m.id), isNull(mr.effectiveEndDate)))
      .leftJoin(r, eq(r.id, mr.roleId))
      .where(
        and(
          eq(m.tenantId, tenantId),
          isNull(m.effectiveEndDate),
          f.id ? eq(m.id, f.id) : undefined,
          f.status ? eq(m.status, f.status) : undefined,
          f.q
            ? or(
                ilike(p.displayName, `%${f.q}%`),
                ilike(user.email, `%${f.q}%`),
              )
            : undefined,
        ),
      )
      .groupBy(m.id, user.email, p.id)
      .having(f.role ? sql`bool_or(${r.code} = ${f.role})` : undefined)
      .orderBy(asc(p.displayName), asc(m.joinedAt))
      .limit(limit + 1)
      .offset((page - 1) * limit);

    return {
      data: rows.slice(0, limit),
      meta: { page, limit, hasMore: rows.length > limit },
    };
  }

  async get(tenantId: string, id: string) {
    return (await this.find(tenantId, { id, limit: 1 })).data[0] ?? null;
  }

  roles(tenantId: string) {
    return this.tx
      .select({
        id: r.id,
        code: r.code,
        name: r.name,
        description: r.description,
        isSystem: r.isSystem,
        permissions: r.permissions,
      })
      .from(r)
      .where(and(eq(r.tenantId, tenantId), isNull(r.effectiveEndDate)))
      .orderBy(asc(r.code));
  }

  invitations(tenantId: string) {
    const i = tTenantInvitation;
    return this.tx
      .select({
        id: i.id,
        email: i.email,
        roleId: i.roleId,
        status: i.status,
        expiresAt: i.expiresAt,
        createdAt: i.createdAt,
      })
      .from(i)
      .where(eq(i.tenantId, tenantId))
      .orderBy(sql`${i.createdAt} desc`)
      .limit(100);
  }
}
