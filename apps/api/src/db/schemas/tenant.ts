import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import {
  auditColumns,
  effectiveDates,
  pk,
  tenantIdCol,
  tenantSchema,
} from "./common";

/**
 * TENANT SCHEMA = application data. Every table except t_tenant carries tenant_id and is
 * protected by RLS (see 0001_audit_rls.sql). Child -> parent links use composite
 * (tenant_id, id) FKs so a row can never point at another tenant's parent.
 */

// ───────────────────────── 1. Tenant registry ─────────────────────────

export const tTenant = tenantSchema.table(
  "t_tenant",
  {
    id: pk(),
    slug: text("slug").notNull(), // academy.<ourdomain>
    name: text("name").notNull(),
    status: text("status").notNull().default("PENDING"),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => user.id),
    country: text("country").notNull().default("IN"),
    timezone: text("timezone").notNull().default("Asia/Kolkata"),
    locale: text("locale").notNull().default("en-IN"),
    onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
    ...effectiveDates(), // effective_end_date = tenant churned / closed
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex("uq_t_tenant_slug").on(t.slug), // slug is reserved even after the tenant ends
    index("ix_t_tenant_status").on(t.status),
    index("ix_t_tenant_owner").on(t.ownerUserId),
    check(
      "ck_t_tenant_status",
      sql`${t.status} in ('PENDING','ACTIVE','SUSPENDED','CANCELLED')`,
    ),
  ],
);

/** 1:1 business profile. Flexible extras live in `attributes` (JSONB). */
export const tTenantDetail = tenantSchema.table(
  "t_tenant_detail",
  {
    id: pk(),
    tenantId: tenantIdCol().references(() => tTenant.id),
    displayName: text("display_name").notNull(),
    legalName: text("legal_name"),
    instituteType: text("institute_type"), // PROGRAMMING | LANGUAGE | PLACEMENT | OTHER
    description: text("description"),
    websiteUrl: text("website_url"),
    establishedYear: integer("established_year"),
    studentSizeBand: text("student_size_band"), // e.g. 1-20, 21-100
    attributes: jsonb("attributes")
      .notNull()
      .default(sql`'{}'::jsonb`),
    ...auditColumns(),
  },
  (t) => [unique("uq_t_tenant_detail_tenant").on(t.tenantId)],
);

export const tTenantAddress = tenantSchema.table(
  "t_tenant_address",
  {
    id: pk(),
    tenantId: tenantIdCol().references(() => tTenant.id),
    addressType: text("address_type").notNull(), // REGISTERED | BILLING | BRANCH
    line1: text("line1").notNull(),
    line2: text("line2"),
    city: text("city").notNull(),
    state: text("state").notNull(),
    postalCode: text("postal_code").notNull(),
    country: text("country").notNull().default("IN"),
    isPrimary: boolean("is_primary").notNull().default(false),
    ...effectiveDates(),
    ...auditColumns(),
  },
  (t) => [
    index("ix_t_tenant_address_tenant_type").on(t.tenantId, t.addressType),
    uniqueIndex("uq_t_tenant_address_primary")
      .on(t.tenantId, t.addressType)
      .where(sql`${t.isPrimary} and ${t.effectiveEndDate} is null`),
  ],
);

export const tTenantContact = tenantSchema.table(
  "t_tenant_contact",
  {
    id: pk(),
    tenantId: tenantIdCol().references(() => tTenant.id),
    contactType: text("contact_type").notNull(), // PRIMARY | BILLING | SUPPORT | TECHNICAL
    fullName: text("full_name").notNull(),
    designation: text("designation"),
    email: text("email"),
    phone: text("phone"),
    whatsapp: text("whatsapp"),
    isPrimary: boolean("is_primary").notNull().default(false),
    ...effectiveDates(),
    ...auditColumns(),
  },
  (t) => [
    index("ix_t_tenant_contact_tenant_type").on(t.tenantId, t.contactType),
    uniqueIndex("uq_t_tenant_contact_primary")
      .on(t.tenantId, t.contactType)
      .where(sql`${t.isPrimary} and ${t.effectiveEndDate} is null`),
  ],
);

// ───────────────────────── 2. Business / compliance (sensitive) ─────────────────────────

export const tTenantTaxProfile = tenantSchema.table(
  "t_tenant_tax_profile",
  {
    id: pk(),
    tenantId: tenantIdCol().references(() => tTenant.id),
    legalEntityType: text("legal_entity_type"), // PROPRIETORSHIP | PARTNERSHIP | PVT_LTD | TRUST ...
    panNumber: text("pan_number"),
    gstRegistered: boolean("gst_registered").notNull().default(false),
    gstin: text("gstin"),
    documentRef: text("document_ref"), // pointer to stored registration doc
    verificationStatus: text("verification_status")
      .notNull()
      .default("UNVERIFIED"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verifiedBy: text("verified_by").references(() => user.id), // platform admin
    ...effectiveDates(),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex("uq_t_tenant_tax_profile_current")
      .on(t.tenantId)
      .where(sql`${t.effectiveEndDate} is null`),
    check(
      "ck_t_tenant_tax_profile_verif",
      sql`${t.verificationStatus} in ('UNVERIFIED','PENDING','VERIFIED','REJECTED')`,
    ),
  ],
);

export const tTenantBankAccount = tenantSchema.table(
  "t_tenant_bank_account",
  {
    id: pk(),
    tenantId: tenantIdCol().references(() => tTenant.id),
    accountHolderName: text("account_holder_name").notNull(),
    bankName: text("bank_name").notNull(),
    branchName: text("branch_name"),
    ifsc: text("ifsc").notNull(),
    accountType: text("account_type"), // SAVINGS | CURRENT
    accountNumberEncrypted: text("account_number_encrypted").notNull(), // app-level encryption
    accountLast4: text("account_last4").notNull(), // the only part APIs return
    upiId: text("upi_id"),
    isPrimary: boolean("is_primary").notNull().default(false),
    verificationStatus: text("verification_status")
      .notNull()
      .default("UNVERIFIED"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verifiedBy: text("verified_by").references(() => user.id), // platform admin
    ...effectiveDates(),
    ...auditColumns(),
  },
  (t) => [
    index("ix_t_tenant_bank_account_tenant").on(t.tenantId),
    uniqueIndex("uq_t_tenant_bank_account_primary")
      .on(t.tenantId)
      .where(sql`${t.isPrimary} and ${t.effectiveEndDate} is null`),
    check(
      "ck_t_tenant_bank_account_verif",
      sql`${t.verificationStatus} in ('UNVERIFIED','PENDING','VERIFIED','REJECTED')`,
    ),
  ],
);

// ───────────────────────── 3. Branding, domains, settings ─────────────────────────

/** Branding CONFIG. Whether white-label is allowed is an entitlement (platform.t_feature). */
export const tTenantBranding = tenantSchema.table(
  "t_tenant_branding",
  {
    id: pk(),
    tenantId: tenantIdCol().references(() => tTenant.id),
    logoUrl: text("logo_url"),
    faviconUrl: text("favicon_url"),
    primaryColor: text("primary_color"),
    secondaryColor: text("secondary_color"),
    theme: jsonb("theme")
      .notNull()
      .default(sql`'{}'::jsonb`),
    showPoweredBy: boolean("show_powered_by").notNull().default(true),
    ...auditColumns(),
  },
  (t) => [unique("uq_t_tenant_branding_tenant").on(t.tenantId)],
);

export const tTenantDomain = tenantSchema.table(
  "t_tenant_domain",
  {
    id: pk(),
    tenantId: tenantIdCol().references(() => tTenant.id),
    host: text("host").notNull(), // stored lower-case
    domainType: text("domain_type").notNull(), // SUBDOMAIN | CUSTOM
    isPrimary: boolean("is_primary").notNull().default(false),
    verificationStatus: text("verification_status")
      .notNull()
      .default("PENDING"),
    verificationToken: text("verification_token"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    sslStatus: text("ssl_status"),
    ...effectiveDates(),
    ...auditColumns(),
  },
  (t) => [
    // host -> tenant lookup (host must be globally unique among current domains)
    uniqueIndex("uq_t_tenant_domain_host")
      .on(t.host)
      .where(sql`${t.effectiveEndDate} is null`),
    index("ix_t_tenant_domain_tenant").on(t.tenantId),
    uniqueIndex("uq_t_tenant_domain_primary")
      .on(t.tenantId)
      .where(sql`${t.isPrimary} and ${t.effectiveEndDate} is null`),
    check(
      "ck_t_tenant_domain_type",
      sql`${t.domainType} in ('SUBDOMAIN','CUSTOM')`,
    ),
    check(
      "ck_t_tenant_domain_verif",
      sql`${t.verificationStatus} in ('PENDING','VERIFIED','FAILED')`,
    ),
  ],
);

/** Tenant-CONTROLLED preferences (namespaced JSONB). Entitlements live in platform schema. */
export const tTenantSetting = tenantSchema.table(
  "t_tenant_setting",
  {
    id: pk(),
    tenantId: tenantIdCol().references(() => tTenant.id),
    namespace: text("namespace").notNull(), // learning | coding | notifications ...
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
    ...auditColumns(),
  },
  (t) => [unique("uq_t_tenant_setting_key").on(t.tenantId, t.namespace, t.key)],
);

// ───────────────────────── 4. Roles and membership ─────────────────────────

export const tTenantRole = tenantSchema.table(
  "t_tenant_role",
  {
    id: pk(),
    tenantId: tenantIdCol().references(() => tTenant.id),
    code: text("code").notNull(), // OWNER | ADMIN | INSTRUCTOR | STUDENT | custom
    name: text("name").notNull(),
    description: text("description"),
    isSystem: boolean("is_system").notNull().default(false),
    permissions: jsonb("permissions")
      .notNull()
      .default(sql`'[]'::jsonb`),
    ...effectiveDates(),
    ...auditColumns(),
  },
  (t) => [
    unique("uq_t_tenant_role_tenant_id").on(t.tenantId, t.id), // composite-FK target
    uniqueIndex("uq_t_tenant_role_code")
      .on(t.tenantId, t.code)
      .where(sql`${t.effectiveEndDate} is null`),
  ],
);

/** user (Better Auth) <-> tenant. One user may belong to many tenants. */
export const tTenantMembership = tenantSchema.table(
  "t_tenant_membership",
  {
    id: pk(),
    tenantId: tenantIdCol().references(() => tTenant.id),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    status: text("status").notNull().default("ACTIVE"),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    invitedBy: text("invited_by").references(() => user.id),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
    ...effectiveDates(), // effective_end_date = removed from institute (history kept)
    ...auditColumns(),
  },
  (t) => [
    unique("uq_t_tenant_membership_tenant_id").on(t.tenantId, t.id), // composite-FK target
    uniqueIndex("uq_t_tenant_membership_current")
      .on(t.tenantId, t.userId)
      .where(sql`${t.effectiveEndDate} is null`),
    index("ix_t_tenant_membership_user").on(t.userId),
    index("ix_t_tenant_membership_tenant_status").on(t.tenantId, t.status),
    check(
      "ck_t_tenant_membership_status",
      sql`${t.status} in ('INVITED','ACTIVE','SUSPENDED')`,
    ),
  ],
);

/** Many-to-many: a member can hold several roles; history preserved via effective dates. */
export const tTenantMembershipRole = tenantSchema.table(
  "t_tenant_membership_role",
  {
    id: pk(),
    tenantId: tenantIdCol(),
    membershipId: uuid("membership_id").notNull(),
    roleId: uuid("role_id").notNull(),
    ...effectiveDates(),
    ...auditColumns(),
  },
  (t) => [
    foreignKey({
      name: "fk_t_membership_role_membership",
      columns: [t.tenantId, t.membershipId],
      foreignColumns: [tTenantMembership.tenantId, tTenantMembership.id],
    }),
    foreignKey({
      name: "fk_t_membership_role_role",
      columns: [t.tenantId, t.roleId],
      foreignColumns: [tTenantRole.tenantId, tTenantRole.id],
    }),
    uniqueIndex("uq_t_membership_role_current")
      .on(t.membershipId, t.roleId)
      .where(sql`${t.effectiveEndDate} is null`),
    index("ix_t_membership_role_tenant_role").on(t.tenantId, t.roleId),
  ],
);

/** Per-institute profile (same user can appear differently in two institutes). 1:1 with membership. */
export const tTenantMemberProfile = tenantSchema.table(
  "t_tenant_member_profile",
  {
    id: pk(),
    tenantId: tenantIdCol(),
    membershipId: uuid("membership_id").notNull(),
    displayName: text("display_name").notNull(),
    phone: text("phone"),
    avatarUrl: text("avatar_url"),
    admissionNo: text("admission_no"), // roll / admission number
    joinedOn: date("joined_on"),
    attributes: jsonb("attributes")
      .notNull()
      .default(sql`'{}'::jsonb`),
    ...auditColumns(),
  },
  (t) => [
    foreignKey({
      name: "fk_t_member_profile_membership",
      columns: [t.tenantId, t.membershipId],
      foreignColumns: [tTenantMembership.tenantId, tTenantMembership.id],
    }),
    unique("uq_t_member_profile_membership").on(t.membershipId),
    unique("uq_t_member_profile_admission").on(t.tenantId, t.admissionNo), // NULLs allowed multiple times
  ],
);

export const tTenantInvitation = tenantSchema.table(
  "t_tenant_invitation",
  {
    id: pk(),
    tenantId: tenantIdCol().references(() => tTenant.id),
    email: text("email").notNull(),
    roleId: uuid("role_id").notNull(),
    tokenHash: text("token_hash").notNull(), // never store the raw token
    status: text("status").notNull().default("PENDING"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    invitedBy: text("invited_by").references(() => user.id),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    ...auditColumns(),
  },
  (t) => [
    foreignKey({
      name: "fk_t_invitation_role",
      columns: [t.tenantId, t.roleId],
      foreignColumns: [tTenantRole.tenantId, tTenantRole.id],
    }),
    uniqueIndex("uq_t_tenant_invitation_token").on(t.tokenHash),
    index("ix_t_tenant_invitation_email").on(t.tenantId, t.email),
    check(
      "ck_t_tenant_invitation_status",
      sql`${t.status} in ('PENDING','ACCEPTED','REVOKED','EXPIRED')`,
    ),
  ],
);

// ───────────────────────── 5. Audit trail (append-only) ─────────────────────────

export const tAuditLog = tenantSchema.table(
  "t_audit_log",
  {
    id: pk(),
    tenantId: tenantIdCol().references(() => tTenant.id),
    actorType: text("actor_type").notNull(), // USER | PLATFORM_ADMIN | SYSTEM
    actorUserId: text("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(), // e.g. tenant.updated, membership.role_changed
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    beforeData: jsonb("before_data"),
    afterData: jsonb("after_data"),
    requestId: text("request_id"),
    traceId: text("trace_id"), // OpenTelemetry trace correlation (populated once OTel is wired)
    spanId: text("span_id"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("ix_t_audit_log_trace").on(t.traceId),
    index("ix_t_audit_log_actor").on(t.tenantId, t.actorUserId),
    index("ix_t_audit_log_tenant_time").on(t.tenantId, t.createdAt.desc()),
    index("ix_t_audit_log_entity").on(t.entityType, t.entityId),
    check(
      "ck_t_audit_log_actor",
      sql`${t.actorType} in ('USER','PLATFORM_ADMIN','SYSTEM')`,
    ),
  ],
);
