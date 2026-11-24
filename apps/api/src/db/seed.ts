import { auth } from "../lib/auth";

/**
 * Sample tenant seed. Run once:  SEED_ADMIN_EMAIL=you@example.com bun run src/db/seed.ts
 * - SEED_ADMIN_EMAIL must be an EXISTING Better Auth user: they become the tenant's ADMIN.
 * - Instructor + 2 students are created through Better Auth sign-up (correct password hashing).
 * - Needs DATABASE_URL and DATA_ENCRYPTION_KEY (openssl rand -hex 32).
 */
import { createHash, randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { encryptText } from "../lib/crypto";
import { DEFAULT_ROLE_PERMISSIONS } from "../lib/permissions";
import { db } from "./client";
import * as s from "./schemas";
import { user } from "./schemas/auth";

/**
 * Sample tenant seed. Run once:  SEED_ADMIN_EMAIL=you@example.com bun run src/db/seed.ts
 * - SEED_ADMIN_EMAIL must be an EXISTING Better Auth user: they become the tenant's ADMIN.
 * - Instructor + 2 students are created through Better Auth sign-up (correct password hashing).
 * - Needs DATABASE_URL and DATA_ENCRYPTION_KEY (openssl rand -hex 32).
 */

const SLUG = "aahrbitx-academy";
const SAMPLE_PASSWORD = "testing@123";

const findUser = async (email: string) =>
  (await db.select().from(user).where(eq(user.email, email)))[0];

const ensureUser = async (name: string, email: string) => {
  let u = await findUser(email);
  if (!u) {
    await auth.api.signUpEmail({
      body: { name, email, password: SAMPLE_PASSWORD },
    });
    u = await findUser(email);
  }
  if (!u) throw new Error(`Could not create user ${email}`);
  return u;
};

const adminEmail = process.env.SEED_ADMIN_EMAIL;
if (!adminEmail)
  throw new Error("Set SEED_ADMIN_EMAIL to an existing user's email");
const admin = await findUser(adminEmail);
if (!admin)
  throw new Error(
    `No user with email ${adminEmail}. Sign up first, then seed.`,
  );

const instructor = await ensureUser(
  "Priya Raman",
  "priya@aahrbitx-academy.test",
);
const arun = await ensureUser("Arun Kumar", "arun@aahrbitx-academy.test");
const meena = await ensureUser("Meena Lakshmi", "meena@aahrbitx-academy.test");

const tenantId = uuidv7();

await db.transaction(async (tx) => {
  // t_tenant's RLS policy checks id = app.tenant_id, so set it to the new id before inserting.
  await tx.execute(
    sql`select set_config('app.tenant_id', ${tenantId}, true), set_config('app.user_id', ${admin.id}, true)`,
  );

  await tx.insert(s.tTenant).values({
    id: tenantId,
    slug: SLUG,
    name: "Aahrbitx Code Academy",
    status: "ACTIVE",
    ownerUserId: admin.id,
    onboardedAt: new Date(),
  });

  await tx.insert(s.tTenantDetail).values({
    tenantId,
    displayName: "Aahrbitx Code Academy",
    legalName: "Aahrbitx Code Academy Pvt Ltd",
    instituteType: "PROGRAMMING",
    description: "Programming academy teaching C, C++, Java and Python.",
    websiteUrl: "https://aahrbitx.in",
    establishedYear: 2024,
    studentSizeBand: "1-20",
    attributes: { teaches: ["C", "C++", "Java", "Python"] },
  });

  await tx.insert(s.tTenantAddress).values({
    tenantId,
    addressType: "REGISTERED",
    line1: "12, Anna Salai",
    city: "Chennai",
    state: "Tamil Nadu",
    postalCode: "600002",
    isPrimary: true,
  });

  await tx.insert(s.tTenantContact).values([
    {
      tenantId,
      contactType: "PRIMARY",
      fullName: "Karthik",
      email: adminEmail,
      phone: "+919000000001",
      isPrimary: true,
    },
    {
      tenantId,
      contactType: "BILLING",
      fullName: "Accounts Desk",
      email: "accounts@aahrbitx-academy.test",
      isPrimary: true,
    },
  ]);

  await tx.insert(s.tTenantTaxProfile).values({
    tenantId,
    legalEntityType: "PVT_LTD",
    panNumber: "ABCDE1234F", // sample
    gstRegistered: true,
    gstin: "33ABCDE1234F1Z5", // sample
    verificationStatus: "VERIFIED",
    verifiedAt: new Date(),
  });

  await tx.insert(s.tTenantBankAccount).values({
    tenantId,
    accountHolderName: "Aahrbitx Code Academy Pvt Ltd",
    bankName: "Sample Bank",
    branchName: "Anna Salai",
    ifsc: "SBIN0000001",
    accountType: "CURRENT",
    accountNumberEncrypted: encryptText("123456789012"), // sample number
    accountLast4: "9012",
    upiId: "academy@samplebank",
    isPrimary: true,
    verificationStatus: "VERIFIED",
    verifiedAt: new Date(),
  });

  await tx.insert(s.tTenantBranding).values({
    tenantId,
    primaryColor: "#4f46e5",
    secondaryColor: "#0ea5e9",
    theme: { radius: "md", mode: "light" },
    showPoweredBy: true,
  });

  await tx.insert(s.tTenantDomain).values({
    tenantId,
    host: `${SLUG}.localhost`,
    domainType: "SUBDOMAIN",
    isPrimary: true,
    verificationStatus: "VERIFIED",
    verifiedAt: new Date(),
  });

  await tx.insert(s.tTenantSetting).values([
    { tenantId, namespace: "learning", key: "default_language", value: "en" },
    {
      tenantId,
      namespace: "coding",
      key: "allowed_languages",
      value: ["c", "cpp", "java", "python"],
    },
    { tenantId, namespace: "notifications", key: "email_enabled", value: true },
  ]);

  const roles = await tx
    .insert(s.tTenantRole)
    .values(
      Object.entries(DEFAULT_ROLE_PERMISSIONS).map(([code, permissions]) => ({
        tenantId,
        code,
        name: code[0] + code.slice(1).toLowerCase(),
        isSystem: true,
        permissions: [...permissions],
      })),
    )
    .returning();
  const roleId = (code: string) => roles.find((r) => r.code === code)!.id;

  const people = [
    {
      u: admin,
      role: "ADMIN",
      name: admin.name || "Academy Admin",
      admissionNo: null as string | null,
    },
    {
      u: instructor,
      role: "INSTRUCTOR",
      name: instructor.name,
      admissionNo: null,
    },
    { u: arun, role: "STUDENT", name: arun.name, admissionNo: "AC-001" },
    { u: meena, role: "STUDENT", name: meena.name, admissionNo: "AC-002" },
  ];

  const memberships = await tx
    .insert(s.tTenantMembership)
    .values(
      people.map((p) => ({ tenantId, userId: p.u.id, invitedBy: admin.id })),
    )
    .returning();
  const membershipOf = (userId: string) =>
    memberships.find((m) => m.userId === userId)!.id;

  await tx.insert(s.tTenantMembershipRole).values(
    people.map((p) => ({
      tenantId,
      membershipId: membershipOf(p.u.id),
      roleId: roleId(p.role),
    })),
  );

  await tx.insert(s.tTenantMemberProfile).values(
    people.map((p) => ({
      tenantId,
      membershipId: membershipOf(p.u.id),
      displayName: p.name,
      admissionNo: p.admissionNo,
      joinedOn: new Date().toISOString().slice(0, 10),
    })),
  );

  await tx.insert(s.tTenantInvitation).values({
    tenantId,
    email: "new.student@aahrbitx-academy.test",
    roleId: roleId("STUDENT"),
    tokenHash: createHash("sha256").update(randomBytes(16)).digest("hex"),
    expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    invitedBy: admin.id,
  });

  await tx.insert(s.tAuditLog).values({
    tenantId,
    actorType: "SYSTEM",
    actorUserId: admin.id,
    action: "tenant.seeded",
    entityType: "tenant",
    entityId: tenantId,
    afterData: { slug: SLUG },
  });
});

console.log(`Seeded tenant "${SLUG}" (${tenantId}). ${adminEmail} is ADMIN.`);
console.log(
  `Sample users (password ${SAMPLE_PASSWORD}): priya@/arun@/meena@aahrbitx-academy.test`,
);
process.exit(0);
