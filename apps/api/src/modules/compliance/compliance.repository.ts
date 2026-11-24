import { and, desc, eq, isNull } from "drizzle-orm";
import type { Tx } from "@/db/client";
import { tTenantBankAccount, tTenantTaxProfile } from "@/db/schemas";

export class ComplianceRepository {
  constructor(private tx: Tx) {}

  async taxProfile(tenantId: string) {
    const x = tTenantTaxProfile;
    const [row] = await this.tx
      .select()
      .from(x)
      .where(and(eq(x.tenantId, tenantId), isNull(x.effectiveEndDate)));
    return row ?? null;
  }

  /** Explicit column list: the encrypted account number is never selected. */
  bankAccounts(tenantId: string) {
    const b = tTenantBankAccount;
    return this.tx
      .select({
        id: b.id,
        accountHolderName: b.accountHolderName,
        bankName: b.bankName,
        branchName: b.branchName,
        ifsc: b.ifsc,
        accountType: b.accountType,
        accountLast4: b.accountLast4,
        upiId: b.upiId,
        isPrimary: b.isPrimary,
        verificationStatus: b.verificationStatus,
      })
      .from(b)
      .where(and(eq(b.tenantId, tenantId), isNull(b.effectiveEndDate)))
      .orderBy(desc(b.isPrimary));
  }
}
