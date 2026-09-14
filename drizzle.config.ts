import { defineConfig } from "drizzle-kit";

import { carregarEnvLocal } from "./src/infrastructure/config/env-local";

/**
 * Migrations são SQL versionado, gerado e **revisado à mão**. `drizzle-kit
 * push` é proibido neste projeto: um schema aplicado sem diff revisado é
 * como um DROP que ninguém leu.
 *
 * O `drizzle-kit` não carrega `.env.local` — só o Next faz isso. Carregar
 * aqui vale para todos os seus comandos (`migrate`, `generate`, `studio`)
 * de uma vez.
 */
carregarEnvLocal();

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/infrastructure/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  strict: true,
});
