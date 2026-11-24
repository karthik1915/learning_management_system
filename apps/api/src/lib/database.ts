import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined in your .env file");
}

// Disable prefetch as it can cause issues in certain environments/Docker
// ssl: 'require' is needed for NeonDB
const client = postgres(connectionString, {
  prepare: false,
  ssl: "require",
  max: 10,
  connect_timeout: 30, // Neon free tier can take up to ~20s to wake from sleep
});

export const db = drizzle(client);
