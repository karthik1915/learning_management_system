import { and, asc, eq, isNull } from "drizzle-orm";
import type { Tx } from "@/db/client";
import {
  tTenant,
  tTenantAddress,
  tTenantBranding,
  tTenantContact,
  tTenantDetail,
  tTenantDomain,
  tTenantSetting,
} from "@/db/schemas";

export class TenantRepository {
  constructor(private tx: Tx) {}

  /** Tenant core + business profile + branding in one round trip. */
  async profile(tenantId: string) {
    const [row] = await this.tx
      .select({
        tenant: tTenant,
        detail: tTenantDetail,
        branding: tTenantBranding,
      })
      .from(tTenant)
      .leftJoin(tTenantDetail, eq(tTenantDetail.tenantId, tTenant.id))
      .leftJoin(tTenantBranding, eq(tTenantBranding.tenantId, tTenant.id))
      .where(eq(tTenant.id, tenantId));
    return row ?? null;
  }

  contacts(tenantId: string) {
    const c = tTenantContact;
    return this.tx
      .select()
      .from(c)
      .where(and(eq(c.tenantId, tenantId), isNull(c.effectiveEndDate)))
      .orderBy(asc(c.contactType));
  }

  addresses(tenantId: string) {
    const a = tTenantAddress;
    return this.tx
      .select()
      .from(a)
      .where(and(eq(a.tenantId, tenantId), isNull(a.effectiveEndDate)))
      .orderBy(asc(a.addressType));
  }

  /** Never returns the verification token. */
  domains(tenantId: string) {
    const d = tTenantDomain;
    return this.tx
      .select({
        id: d.id,
        host: d.host,
        domainType: d.domainType,
        isPrimary: d.isPrimary,
        verificationStatus: d.verificationStatus,
        verifiedAt: d.verifiedAt,
        sslStatus: d.sslStatus,
      })
      .from(d)
      .where(and(eq(d.tenantId, tenantId), isNull(d.effectiveEndDate)));
  }

  settings(tenantId: string, namespace?: string) {
    const s = tTenantSetting;
    return this.tx
      .select({ namespace: s.namespace, key: s.key, value: s.value })
      .from(s)
      .where(
        and(
          eq(s.tenantId, tenantId),
          namespace ? eq(s.namespace, namespace) : undefined,
        ),
      )
      .orderBy(asc(s.namespace), asc(s.key));
  }
}
