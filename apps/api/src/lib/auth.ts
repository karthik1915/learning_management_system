import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";

import { dash } from "@better-auth/infra";
import { admin } from "better-auth/plugins";

import { db } from "./database";
import * as schema from "../db/schemas/auth";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schemaName: "auth",
    schema,
  }),
  baseURL: process.env.BETTER_AUTH_URL!,
  emailAndPassword: {
    enabled: true,
  },
  basePath: "/api/auth",
  type: "postgres",
  plugins: [dash(), admin()],
  advanced: {
    cookiePrefix: "lms",
    defaultCookieAttributes: {
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
    },
  },
});
