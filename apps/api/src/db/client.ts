import { record } from "@elysiajs/opentelemetry";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schemas";

// Use Neon's POOLED connection string for the app.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Runs `fn` in a short transaction scoped to one tenant. Sets the session variables that
 * RLS (app.tenant_id) and the audit triggers (app.user_id) read. `true` = transaction-local,
 * which is what Neon's transaction-mode pooler requires.
 */
export const withTenant = <T>(
  tenantId: string,
  userId: string,
  fn: (tx: Tx) => Promise<T>,
) =>
  record(
    "db.tenant_tx",
    { attributes: { "db.system": "postgresql", "tenant.id": tenantId } },
    () =>
      db.transaction(async (tx) => {
        await tx.execute(
          sql`select set_config('app.tenant_id', ${tenantId}, true), set_config('app.user_id', ${userId}, true)`,
        );
        return fn(tx);
      }),
  );
