import { type APIResponse, expect, type Page, test } from "@playwright/test";
import type { Pool } from "pg";
import { dataParaCompetencia } from "@/domain";
import {
  criarPoolDeTeste,
  limparDados,
  recriarBancoDeTeste,
} from "@/infrastructure/db/testing/banco-de-teste";

/**
 * Fluxo de autenticação de ponta a ponta (AUTH-01).
 *
 * A entrada usa o provider de credenciais que só existe em ambiente de teste.
 * Ele **autentica e nada mais**: o e-mail continua passando pela allowlist no
 * callback `signIn`, igual ao Google. Se ele desse acesso a qualquer e-mail,
 * este arquivo estaria testando um bypass em vez do AC 2.
 */

const EMAIL_PERMITIDO = "pessoa-a@example.com";
const EMAIL_NEGADO = "intruso@example.com";
const FUSO = "America/Sao_Paulo";

let pool: Pool;

function competenciaCorrente(): string {
  const resultado = dataParaCompetencia(new Date().toISOString(), FUSO);
  if (!resultado.ok) {
    throw new Error("não foi possível resolver a competência corrente");
  }
  return resultado.value;
}

/** Entra pelo provider de teste e devolve a resposta final do fluxo. */
async function entrar(page: Page, email: string): Promise<APIResponse> {
  const csrf = await page.request.get("/api/auth/csrf");
  const { csrfToken } = (await csrf.json()) as { csrfToken: string };
  return page.request.post("/api/auth/callback/provedor-de-teste", {
    form: { csrfToken, email, callbackUrl: "/" },
  });
}

async function contarUsuarios(): Promise<number> {
  const { rows } = await pool.query<{ total: string }>("SELECT COUNT(*) AS total FROM usuario");
  return Number(rows[0]?.total ?? "-1");
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  pool = criarPoolDeTeste();
  await recriarBancoDeTeste(pool);
});

test.afterAll(async () => {
  await pool.end();
});

test.beforeEach(async () => {
  await limparDados(pool);
});

test("não autenticado é redirecionado para /login (AUTH-01, AC 1)", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/2026-03");
  await expect(page).toHaveURL(/\/login$/);

  await expect(page.getByRole("button", { name: "Entrar com o Google" })).toBeVisible();
});

/*
 * Antes deste teste a raiz redirecionava para a competência corrente, e o AC
 * dizia isso. A home substituiu o redirect (HOME-01, AC 1): o destino de
 * sempre continua a um clique, no cartão de destaque, e agora os outros onze
 * meses também têm porta. O teste foi reescrito para a intenção nova — não
 * afrouxado para a antiga passar.
 */
test("autenticado cai na home do ano corrente (HOME-01, ACs 1 e 3)", async ({ page }) => {
  const resposta = await entrar(page, EMAIL_PERMITIDO);
  expect(resposta.status()).toBe(200);

  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  const ano = competenciaCorrente().slice(0, 4);
  await expect(page.getByRole("heading", { level: 1, name: ano })).toBeVisible();
  expect(await contarUsuarios()).toBe(1);
});

test("o cartão de destaque leva à competência corrente (HOME-02, AC 2)", async ({ page }) => {
  await entrar(page, EMAIL_PERMITIDO);
  await page.goto("/");

  await page.getByRole("link", { name: /continuar de onde você parou/i }).click();

  await expect(page).toHaveURL(new RegExp(`/${competenciaCorrente()}$`));
  await expect(page.getByRole("navigation", { name: "Navegação entre meses" })).toBeVisible();
});

test("a grade leva a qualquer mês do ano exibido (HOME-01, AC 2)", async ({ page }) => {
  await entrar(page, EMAIL_PERMITIDO);
  await page.goto("/?ano=2026");

  await expect(page.getByRole("heading", { level: 1, name: "2026" })).toBeVisible();
  await page.getByRole("link", { name: /^março/i }).click();

  await expect(page).toHaveURL(/\/2026-03$/);
});

test("ano inválido na URL cai no ano corrente em vez de quebrar (HOME-01, AC 4)", async ({
  page,
}) => {
  await entrar(page, EMAIL_PERMITIDO);
  await page.goto("/?ano=banana");

  const ano = competenciaCorrente().slice(0, 4);
  await expect(page.getByRole("heading", { level: 1, name: ano })).toBeVisible();
  await expect(page.locator("#__next_error__")).toHaveCount(0);
});

test("e-mail fora da allowlist recebe 403 e não cria usuário (AUTH-01, AC 2)", async ({ page }) => {
  expect(await contarUsuarios()).toBe(0);

  const resposta = await entrar(page, EMAIL_NEGADO);
  expect(resposta.status()).toBe(403);

  expect(await contarUsuarios()).toBe(0);
  const { rows } = await pool.query("SELECT id FROM usuario WHERE email = $1", [EMAIL_NEGADO]);
  expect(rows).toEqual([]);

  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});

test("competência malformada na URL vira página de não encontrado (UI-02, AC 3)", async ({
  page,
}) => {
  await entrar(page, EMAIL_PERMITIDO);

  await page.goto("/2026-13");

  // O AC pede a página de não encontrado e nenhum erro não tratado; não pede
  // um status. O `next dev` responde 200 depois que o streaming começou, então
  // a asserção é sobre o que a página é, não sobre o código HTTP.
  await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
  await expect(page.locator("#__next_error__")).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Navegação entre meses" })).toHaveCount(0);
});

test("nenhuma rolagem horizontal em viewport de 400 pixels (UI-03, AC 9)", async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 800 });

  await page.goto("/login");
  expect(await transbordoHorizontal(page)).toBe(0);

  await entrar(page, EMAIL_PERMITIDO);

  // A home é a nova porta de entrada: ela mede antes do mês.
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await transbordoHorizontal(page)).toBe(0);

  await page.goto(`/${competenciaCorrente()}`);
  await expect(page.getByRole("navigation", { name: "Navegação entre meses" })).toBeVisible();
  expect(await transbordoHorizontal(page)).toBe(0);
});

/** Quanto a página passa da largura da janela. Zero é o único valor aceito. */
async function transbordoHorizontal(page: Page): Promise<number> {
  return page.evaluate(() =>
    Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
  );
}
