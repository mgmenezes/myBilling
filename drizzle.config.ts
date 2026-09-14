import { defineConfig } from "drizzle-kit";

/**
 * Migrations são SQL versionado, gerado e **revisado à mão**. `drizzle-kit
 * push` é proibido neste projeto: um schema aplicado sem diff revisado é
 * como um DROP que ninguém leu.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/infrastructure/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  strict: true,
});
