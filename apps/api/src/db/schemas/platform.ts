import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
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
import { auditColumns, effectiveDates, pk, platformSchema } from "./common";
import { tTenant } from "./tenant";

/**
 * PLATFORM SCHEMA = our (app-admin) data. Not RLS-scoped by tenant; access is controlled by
 * DB roles/grants: the platform-admin role gets write access, the tenant-app role gets
 * read-only access to the few tables it needs (plans, features, own subscription).
 */

// ───────────────────────── Platform administrators ─────────────────────────

export const tPlatformAdmin = platformSchema.table(
  "t_platform_admin",
  {
    id: pk(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    level: text("level").notNull(), // SUPER | SUPPORT | SALES
    ...effectiveDates(),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex("uq_t_platform_admin_current")
      .on(t.userId)
      .where(sql`${t.effectiveEndDate} is null`),
    check(
      "ck_t_platform_admin_level",
      sql`${t.level} in ('SUPER','SUPPORT','SALES')`,
    ),
  ],
);

// ───────────────────────── Plans and entitlements (feature flags) ─────────────────────────

export const tPlan = platformSchema.table(
  "t_plan",
  {
    id: pk(),
    code: text("code").notNull(), // STARTER | GROWTH | ...
    name: text("name").notNull(),
    description: text("description"),
    currency: text("currency").notNull().default("INR"),
    billingInterval: text("billing_interval").notNull().default("MONTH"), // MONTH | YEAR
    basePricePaise: integer("base_price_paise").notNull().default(0),
    includedStudents: integer("included_students").notNull().default(0),
    perStudentPricePaise: integer("per_student_price_paise")
      .notNull()
      .default(0),
    limits: jsonb("limits")
      .notNull()
      .default(sql`'{}'::jsonb`), // soft/hard numeric limits
    isPublic: boolean("is_public").notNull().default(true),
    ...effectiveDates(),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex("uq_t_plan_code")
      .on(t.code)
      .where(sql`${t.effectiveEndDate} is null`),
    check("ck_t_plan_interval", sql`${t.billingInterval} in ('MONTH','YEAR')`),
  ],
);

/** Catalogue of every flag / limit the product knows about. */
export const tFeature = platformSchema.table(
  "t_feature",
  {
    id: pk(),
    code: text("code").notNull(), // white_label | custom_domain | coding_exercises | max_executions_per_month
    name: text("name").notNull(),
    description: text("description"),
    valueType: text("value_type").notNull(), // BOOLEAN | LIMIT | VARIANT
    defaultValue: jsonb("default_value").notNull(), // e.g. false / 100 / "basic"
    isActive: boolean("is_active").notNull().default(true),
    ...auditColumns(),
  },
  (t) => [
    unique("uq_t_feature_code").on(t.code),
    check(
      "ck_t_feature_type",
      sql`${t.valueType} in ('BOOLEAN','LIMIT','VARIANT')`,
    ),
  ],
);

/** What each plan grants. */
export const tPlanFeature = platformSchema.table(
  "t_plan_feature",
  {
    id: pk(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => tPlan.id),
    featureId: uuid("feature_id")
      .notNull()
      .references(() => tFeature.id),
    value: jsonb("value").notNull(),
    ...auditColumns(),
  },
  (t) => [
    unique("uq_t_plan_feature").on(t.planId, t.featureId),
    index("ix_t_plan_feature_feature").on(t.featureId),
  ],
);

/**
 * Per-tenant exception set by us (pilot perks, negotiated limits, kill-switch).
 * Resolution order: active override > plan value > feature default.
 */
export const tTenantFeatureOverride = platformSchema.table(
  "t_tenant_feature_override",
  {
    id: pk(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tTenant.id),
    featureId: uuid("feature_id")
      .notNull()
      .references(() => tFeature.id),
    value: jsonb("value").notNull(),
    reason: text("reason"),
    ...effectiveDates(),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex("uq_t_tenant_feature_override_current")
      .on(t.tenantId, t.featureId)
      .where(sql`${t.effectiveEndDate} is null`),
    index("ix_t_tenant_feature_override_tenant").on(t.tenantId),
  ],
);

// ───────────────────────── Subscription, billing and usage ─────────────────────────

export const tTenantSubscription = platformSchema.table(
  "t_tenant_subscription",
  {
    id: pk(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tTenant.id),
    planId: uuid("plan_id")
      .notNull()
      .references(() => tPlan.id),
    status: text("status").notNull().default("TRIALING"),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    currentPeriodStart: timestamp("current_period_start", {
      withTimezone: true,
    }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    // price snapshot so later plan edits never change existing customers
    includedStudentsSnapshot: integer("included_students_snapshot").notNull(),
    basePricePaiseSnapshot: integer("base_price_paise_snapshot").notNull(),
    perStudentPricePaiseSnapshot: integer(
      "per_student_price_paise_snapshot",
    ).notNull(),
    limitsOverride: jsonb("limits_override")
      .notNull()
      .default(sql`'{}'::jsonb`),
    gatewayCustomerRef: text("gateway_customer_ref"),
    gatewaySubscriptionRef: text("gateway_subscription_ref"),
    ...effectiveDates(), // history of plan changes
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex("uq_t_tenant_subscription_current")
      .on(t.tenantId)
      .where(sql`${t.effectiveEndDate} is null`),
    index("ix_t_tenant_subscription_plan").on(t.planId),
    index("ix_t_tenant_subscription_status").on(t.status),
    check(
      "ck_t_tenant_subscription_status",
      sql`${t.status} in ('TRIALING','ACTIVE','PAST_DUE','CANCELLED')`,
    ),
  ],
);

export const tTenantUsageCounter = platformSchema.table(
  "t_tenant_usage_counter",
  {
    id: pk(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tTenant.id),
    metric: text("metric").notNull(), // ACTIVE_STUDENTS | CODE_EXECUTIONS | STORAGE_MB
    periodStart: date("period_start").notNull(),
    value: bigint("value", { mode: "number" }).notNull().default(0),
    ...auditColumns(),
  },
  (t) => [
    unique("uq_t_tenant_usage_counter").on(t.tenantId, t.metric, t.periodStart),
  ],
);

// ───────────────────────── Internal tenant view (CRM-style) ─────────────────────────

export const tTenantAdminInfo = platformSchema.table(
  "t_tenant_admin_info",
  {
    id: pk(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tTenant.id),
    onboardingStage: text("onboarding_stage").notNull().default("SIGNED_UP"),
    accountManagerUserId: text("account_manager_user_id").references(
      () => user.id,
    ),
    leadSource: text("lead_source"),
    isPilot: boolean("is_pilot").notNull().default(false),
    internalNotes: text("internal_notes"),
    flags: jsonb("flags")
      .notNull()
      .default(sql`'{}'::jsonb`),
    ...auditColumns(),
  },
  (t) => [
    unique("uq_t_tenant_admin_info_tenant").on(t.tenantId),
    index("ix_t_tenant_admin_info_stage").on(t.onboardingStage),
  ],
);

// ───────────────────────── Logging & audit (platform side) ─────────────────────────

/**
 * Audit trail of what OUR admins did (impersonation, plan overrides, suspensions...).
 * tenant_id is nullable: some actions are platform-wide. Append-only.
 */
export const tPlatformAuditLog = platformSchema.table(
  "t_platform_audit_log",
  {
    id: pk(),
    tenantId: uuid("tenant_id").references(() => tTenant.id),
    actorUserId: text("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(), // e.g. tenant.suspended, feature_override.created
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    beforeData: jsonb("before_data"),
    afterData: jsonb("after_data"),
    requestId: text("request_id"),
    traceId: text("trace_id"),
    spanId: text("span_id"),
    ip: text("ip"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("ix_t_platform_audit_log_time").on(t.createdAt.desc()),
    index("ix_t_platform_audit_log_tenant").on(t.tenantId, t.createdAt.desc()),
    index("ix_t_platform_audit_log_actor").on(t.actorUserId),
    index("ix_t_platform_audit_log_trace").on(t.traceId),
  ],
);

/**
 * Structured application / operational log (errors, job runs, Judge0 failures, webhooks).
 * Store only what you want to query in-app; the full log stream goes to OpenTelemetry/SigNoz later.
 * tenant_id nullable (system-wide events). Append-only; partition by month + retention job later.
 */
export const tAppLog = platformSchema.table(
  "t_app_log",
  {
    id: pk(),
    tenantId: uuid("tenant_id").references(() => tTenant.id),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    level: text("level").notNull(), // DEBUG | INFO | WARN | ERROR | FATAL
    source: text("source").notNull(), // module name: auth, courses, code-execution ...
    message: text("message").notNull(),
    context: jsonb("context")
      .notNull()
      .default(sql`'{}'::jsonb`),
    errorCode: text("error_code"),
    requestId: text("request_id"),
    traceId: text("trace_id"),
    spanId: text("span_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("ix_t_app_log_time").on(t.createdAt.desc()),
    index("ix_t_app_log_tenant_time").on(t.tenantId, t.createdAt.desc()),
    index("ix_t_app_log_level_time").on(t.level, t.createdAt.desc()),
    index("ix_t_app_log_trace").on(t.traceId),
    check(
      "ck_t_app_log_level",
      sql`${t.level} in ('DEBUG','INFO','WARN','ERROR','FATAL')`,
    ),
  ],
);
