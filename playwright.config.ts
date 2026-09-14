import { defineConfig, devices } from "@playwright/test";

/**
 * O servidor do e2e roda com `NODE_ENV=test` e `AUTH_PROVIDER_DE_TESTE=1`, as
 * duas condições que registram o provider de credenciais de teste. Nenhuma
 * credencial real do Google entra aqui: os valores abaixo são placeholders
 * locais, e o provider de teste continua passando pela allowlist (AD-009).
 */

const PORTA = 3100;
const URL_BASE = `http://localhost:${PORTA}`;

/** Mesmo banco em Docker dos testes de integração (AD-010), na porta 5433. */
const URL_BANCO =
  process.env.DATABASE_URL_TEST ?? "postgres://mybilling:mybilling@localhost:5433/mybilling_test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  timeout: 60_000,
  use: {
    baseURL: URL_BASE,
    trace: "retain-on-failure",
  },
  projects: [
    // Usa o Chrome instalado na máquina: não há download de browser no gate.
    { name: "chromium", use: { ...devices["Desktop Chrome"], channel: "chrome" } },
  ],
  webServer: {
    command: `pnpm exec next dev --port ${PORTA}`,
    url: URL_BASE,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "pipe",
    env: {
      NODE_ENV: "test",
      AUTH_PROVIDER_DE_TESTE: "1",
      DATABASE_URL: URL_BANCO,
      AUTH_SECRET: "segredo-local-de-teste-nao-e-credencial",
      AUTH_GOOGLE_ID: "client-id-placeholder",
      AUTH_GOOGLE_SECRET: "client-secret-placeholder",
      EMAILS_PERMITIDOS: "pessoa-a@example.com,pessoa-b@example.com",
    },
  },
});
