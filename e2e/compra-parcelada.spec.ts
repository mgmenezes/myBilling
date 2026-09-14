import { expect, type Page, test } from "@playwright/test";
import type { Pool } from "pg";
import {
  criarPoolDeTeste,
  limparDados,
  recriarBancoDeTeste,
  semearCadastroBase,
} from "@/infrastructure/db/testing/banco-de-teste";

/**
 * **A dor central, de ponta a ponta.**
 *
 * Moisés cadastra a compra parcelada **uma vez** e as parcelas aparecem
 * sozinhas nos meses seguintes. É este arquivo que prova que a re-digitação
 * mensal acabou: entre cadastrar em março e encontrar a parcela em abril não
 * existe nenhuma ação do usuário além de navegar.
 *
 * A entrada reusa o provider de credenciais de teste de T46 — o mesmo que
 * continua passando pela allowlist no callback `signIn`.
 */

const EMAIL_PERMITIDO = "pessoa-a@example.com";

let pool: Pool;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  pool = criarPoolDeTeste();
  await recriarBancoDeTeste(pool);
});

test.afterAll(async () => {
  await pool.end();
});

test.beforeEach(async ({ page }) => {
  await limparDados(pool);
  await semearCadastroBase(pool);
  await entrar(page, EMAIL_PERMITIDO);
});

/** Entra pelo provider de teste, como em `auth.spec.ts`. */
async function entrar(page: Page, email: string): Promise<void> {
  const csrf = await page.request.get("/api/auth/csrf");
  const { csrfToken } = (await csrf.json()) as { csrfToken: string };
  await page.request.post("/api/auth/callback/provedor-de-teste", {
    form: { csrfToken, email, callbackUrl: "/" },
  });
}

interface Compra {
  readonly descricao: string;
  readonly modo: "Valor total" | "Valor da parcela";
  readonly valor: string;
  readonly qtdParcelas: string;
  readonly parcelaInicial?: string;
}

/** Preenche e envia o formulário na competência já aberta. */
async function cadastrar(page: Page, compra: Compra): Promise<void> {
  await page.getByLabel("Descrição").fill(compra.descricao);
  if (compra.modo === "Valor da parcela") {
    await page.getByRole("radio", { name: "Valor da parcela" }).check();
  }
  await page.getByLabel(`${compra.modo} (R$)`).fill(compra.valor);
  await page.getByLabel("Quantidade de parcelas").fill(compra.qtdParcelas);
  if (compra.parcelaInicial) {
    await page.getByLabel("Já estou na parcela").fill(compra.parcelaInicial);
  }
  await page.getByRole("button", { name: "Cadastrar compra" }).click();
  await expect(page.getByRole("status")).toContainText(compra.descricao);
}

/** A linha do bloco "Cartão de Crédito" daquela descrição. */
function linhaDaParcela(page: Page, descricao: string) {
  return page.getByRole("region", { name: "Cartão de Crédito" }).getByRole("row", {
    name: new RegExp(descricao),
  });
}

async function contarMovimentosAntesDe(competencia: string): Promise<number> {
  const { rows } = await pool.query<{ total: string }>(
    "SELECT count(*)::text AS total FROM movimento WHERE competencia < $1::date",
    [`${competencia}-01`],
  );
  return Number.parseInt(rows[0]?.total ?? "-1", 10);
}

test("cadastrar R$ 1.000,00 em 3x em março e achar as parcelas em abril e maio sem nenhuma ação adicional (PARC-01, AC 1)", async ({
  page,
}) => {
  await page.goto("/2026-03");

  // O preview mostra o rateio antes de gravar: o usuário confere o centavo.
  await page.getByLabel("Descrição").fill("Compra parcelada A");
  await page.getByLabel("Valor total (R$)").fill("1.000,00");
  await page.getByLabel("Quantidade de parcelas").fill("3");
  const previa = page.getByRole("region", { name: "Previsão das parcelas" });
  await expect(previa.getByRole("listitem").nth(0)).toContainText("R$ 333,34");
  await expect(previa.getByRole("listitem").nth(1)).toContainText("R$ 333,33");
  await expect(previa.getByRole("listitem").nth(2)).toContainText("R$ 333,33");

  await page.getByRole("button", { name: "Cadastrar compra" }).click();
  await expect(page.getByRole("status")).toContainText("Compra parcelada A");

  // Março: parcela 1/3.
  await expect(linhaDaParcela(page, "Compra parcelada A")).toContainText("1/3");
  await expect(linhaDaParcela(page, "Compra parcelada A")).toContainText("R$ 333,34");

  // Abril: **nenhuma ação além de navegar**. A parcela já está lá.
  await page.goto("/2026-04");
  await expect(linhaDaParcela(page, "Compra parcelada A")).toContainText("2/3");
  await expect(linhaDaParcela(page, "Compra parcelada A")).toContainText("R$ 333,33");

  // Maio: idem.
  await page.goto("/2026-05");
  await expect(linhaDaParcela(page, "Compra parcelada A")).toContainText("3/3");
  await expect(linhaDaParcela(page, "Compra parcelada A")).toContainText("R$ 333,33");

  // E acabou em maio: junho não tem parcela nenhuma desta compra.
  await page.goto("/2026-06");
  await expect(linhaDaParcela(page, "Compra parcelada A")).toHaveCount(0);
});

test("cadastrar uma compra 8/10 cria 3 parcelas e nenhum lançamento em competência anterior (PARC-06, AC 1 e AC 3)", async ({
  page,
}) => {
  await page.goto("/2026-03");

  await cadastrar(page, {
    descricao: "Compra parcelada B",
    modo: "Valor da parcela",
    valor: "60,00",
    qtdParcelas: "10",
    parcelaInicial: "8",
  });

  await expect(linhaDaParcela(page, "Compra parcelada B")).toContainText("8/10");
  await expect(linhaDaParcela(page, "Compra parcelada B")).toContainText("faltam 2 depois desta");

  await page.goto("/2026-04");
  await expect(linhaDaParcela(page, "Compra parcelada B")).toContainText("9/10");
  await page.goto("/2026-05");
  await expect(linhaDaParcela(page, "Compra parcelada B")).toContainText("10/10");
  await expect(linhaDaParcela(page, "Compra parcelada B")).toContainText("(última)");

  // Os sete meses anteriores não ganharam despesa nenhuma (AD-005).
  await page.goto("/2026-02");
  await expect(page.getByText("Compra parcelada B")).toHaveCount(0);
  expect(await contarMovimentosAntesDe("2026-03")).toBe(0);

  const { rows } = await pool.query<{ total: string }>(
    "SELECT count(*)::text AS total FROM movimento",
  );
  expect(Number.parseInt(rows[0]?.total ?? "-1", 10)).toBe(3);
});

test("cadastrar em 2026-12 em 3x chega a 2027-02 (COMP-01, AC 1)", async ({ page }) => {
  await page.goto("/2026-12");

  await cadastrar(page, {
    descricao: "Compra parcelada C",
    modo: "Valor total",
    valor: "300,00",
    qtdParcelas: "3",
  });

  await expect(linhaDaParcela(page, "Compra parcelada C")).toContainText("1/3");

  await page.goto("/2027-01");
  await expect(linhaDaParcela(page, "Compra parcelada C")).toContainText("2/3");
  await expect(linhaDaParcela(page, "Compra parcelada C")).toContainText("R$ 100,00");

  await page.goto("/2027-02");
  await expect(linhaDaParcela(page, "Compra parcelada C")).toContainText("3/3");
  await expect(linhaDaParcela(page, "Compra parcelada C")).toContainText("R$ 100,00");
});

test("os dois eixos ficam em blocos separados, cada um com o seu selo (MOV-03, UI-01 AC 4)", async ({
  page,
}) => {
  await page.goto("/2026-03");
  await cadastrar(page, {
    descricao: "Compra parcelada A",
    modo: "Valor total",
    valor: "1.000,00",
    qtdParcelas: "3",
  });

  const competencia = page.getByRole("region", { name: "Total de Gastos" });
  const caixa = page.getByRole("region", { name: "Saídas" });

  await expect(competencia).toContainText("Eixo competência");
  await expect(caixa).toContainText("Eixo caixa");

  // São dois blocos, e um não contém o outro.
  await expect(competencia).toHaveCount(1);
  await expect(caixa).toHaveCount(1);
  expect(await competencia.locator('[aria-labelledby="eixo-caixa"]').count()).toBe(0);
  expect(await caixa.locator('[aria-labelledby="eixo-competencia"]').count()).toBe(0);

  // O valor da competência está no bloco da competência e não no do caixa.
  await expect(competencia).toContainText("R$ 333,34");
  await expect(caixa).not.toContainText("R$ 333,34");

  // Os dois números são medidos à parte: a compra foi assumida em março e
  // ainda não foi paga, então o eixo caixa continua zerado enquanto o eixo
  // competência já contabiliza a parcela. A divergência é a informação.
  await expect(caixa).toContainText("R$ 0,00");

  // E a tela explica a divergência em vez de calculá-la: nenhuma subtração
  // entre os dois eixos aparece em lugar nenhum.
  await expect(page.getByText(/não soma nem subtrai um do outro/)).toBeVisible();
});

test("em 400 pixels nada rola na horizontal, e a barra não foi escondida (UI-03, AC 9)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 400, height: 900 });
  await page.goto("/2026-03");
  await cadastrar(page, {
    descricao: "Compra parcelada A",
    modo: "Valor total",
    valor: "1.000,00",
    qtdParcelas: "3",
  });

  expect(await transbordoHorizontal(page)).toBe(0);

  // Sem `overflow-x: hidden`: esconder a barra faria a medição acima passar
  // sem significar nada.
  const overflow = await page.evaluate(() => [
    getComputedStyle(document.documentElement).overflowX,
    getComputedStyle(document.body).overflowX,
  ]);
  expect(overflow).not.toContain("hidden");
  expect(overflow).not.toContain("clip");
});

/** Quanto a página passa da largura da janela. Zero é o único valor aceito. */
async function transbordoHorizontal(page: Page): Promise<number> {
  return page.evaluate(() =>
    Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
  );
}
