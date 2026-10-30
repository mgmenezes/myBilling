import { expect, type Locator, type Page, test } from "@playwright/test";
import type { Pool } from "pg";
import {
  type CadastroBase,
  criarPoolDeTeste,
  limparDados,
  recriarBancoDeTeste,
  semearCadastroBase,
} from "@/infrastructure/db/testing/banco-de-teste";

/**
 * **O saldo dos próximos meses, de ponta a ponta** (SALDO-03).
 *
 * O componente recebe da página o `saldo` que a projeção calculou, e o card
 * "Saldo previsto" do mês aberto recebe o dele de `resumoMensal`. Cada elo
 * tem teste próprio; só a tela prova que os dois números são o mesmo
 * (lições L-001 e L-014). As consultas ficam presas à região "Próximos
 * meses" (L-018).
 *
 * As recorrências entram pelo banco e a materialização as cria ao abrir
 * março, que cobre março e os três meses seguintes. Os valores são escolhidos
 * pela conta, um mês com sobra e um com falta. Nomes genéricos (AD-009).
 */

const EMAIL_PERMITIDO = "pessoa-a@example.com";
const MARCO = "2026-03";

let pool: Pool;
let base: CadastroBase;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  pool = criarPoolDeTeste();
  await recriarBancoDeTeste(pool);
  await limparDados(pool);
  base = await semearCadastroBase(pool);
  /* Entrada fixa de R$ 1.000,00 e fixo de R$ 300,00, de março em diante, sem fim. */
  await semearRecorrencia("Entrada A", "RECEITA", null, `${MARCO}-01`, null, 100000);
  await semearRecorrencia("Fixo A", "DESPESA", base.categoriaId, `${MARCO}-01`, null, 30000);
  /* Só em maio, R$ 1.200,00: maio fecha faltando R$ 500,00. */
  await semearRecorrencia(
    "Fixo B",
    "DESPESA",
    base.categoriaId,
    "2026-05-01",
    "2026-05-01",
    120000,
  );
});

test.afterAll(async () => {
  await pool.end();
});

test.beforeEach(async ({ page }) => {
  await entrar(page, EMAIL_PERMITIDO);
});

async function entrar(page: Page, email: string): Promise<void> {
  const csrf = await page.request.get("/api/auth/csrf");
  const { csrfToken } = (await csrf.json()) as { csrfToken: string };
  await page.request.post("/api/auth/callback/provedor-de-teste", {
    form: { csrfToken, email, callbackUrl: "/" },
  });
}

async function semearRecorrencia(
  descricao: string,
  natureza: "RECEITA" | "DESPESA",
  categoriaId: string | null,
  inicio: string,
  fim: string | null,
  centavos: number,
): Promise<void> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO recorrencia (descricao, natureza, categoria_id, usuario_id, meio_pagamento_id,
       competencia_inicio, competencia_fim, dia_vencimento)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 10) RETURNING id`,
    [descricao, natureza, categoriaId, base.usuarioId, base.contaId, inicio, fim],
  );
  await pool.query(
    "INSERT INTO recorrencia_versao (recorrencia_id, vigente_desde, valor_previsto_centavos) VALUES ($1, $2, $3)",
    [rows[0]?.id, inicio, centavos],
  );
}

function proximosMeses(page: Page): Locator {
  return page.getByRole("region", { name: "Próximos meses" });
}

function cartao(page: Page, mes: string): Locator {
  return proximosMeses(page).getByRole("listitem").filter({ hasText: mes });
}

/** O valor que segue o rótulo, no par `dt`/`dd` do cartão. */
function valorDe(item: Locator, rotulo: string): Locator {
  return item.locator("dt", { hasText: rotulo }).locator("xpath=following-sibling::dd[1]");
}

/** O valor do card "Saldo previsto" dos indicadores, fora da régua. */
function cardSaldoPrevisto(page: Page): Locator {
  return page
    .getByText("Saldo previsto", { exact: true })
    .locator("xpath=following-sibling::span[1]");
}

test("cada mês seguinte mostra o comprometido e quanto vai sobrar ou faltar (SALDO-03, ACs 1 a 5)", async ({
  page,
}) => {
  await page.goto(`/${MARCO}`);

  await expect(page.getByRole("heading", { name: "Próximos meses", level: 2 })).toBeVisible();
  await expect(page.getByText("Já comprometido nos próximos meses")).toHaveCount(0);
  await expect(proximosMeses(page).getByRole("listitem")).toHaveCount(3);

  const abril = cartao(page, "Abril de 2026");
  await expect(valorDe(abril, "Comprometido")).toHaveText("R$ 300,00");
  await expect(valorDe(abril, "Vai sobrar")).toHaveText("R$ 700,00");

  const maio = cartao(page, "Maio de 2026");
  await expect(valorDe(maio, "Comprometido")).toHaveText("R$ 1.500,00");
  await expect(valorDe(maio, "Vai faltar")).toHaveText("R$ 500,00");

  const junho = cartao(page, "Junho de 2026");
  await expect(valorDe(junho, "Comprometido")).toHaveText("R$ 300,00");
  await expect(valorDe(junho, "Vai sobrar")).toHaveText("R$ 700,00");
});

test("o saldo do cartão é o mesmo do card Saldo previsto ao abrir o mês (SALDO-03, AC 7)", async ({
  page,
}) => {
  await page.goto(`/${MARCO}`);
  const sobraDeAbril = await valorDe(cartao(page, "Abril de 2026"), "Vai sobrar").textContent();
  const faltaDeMaio = await valorDe(cartao(page, "Maio de 2026"), "Vai faltar").textContent();
  expect(sobraDeAbril).toBe("R$ 700,00");
  expect(faltaDeMaio).toBe("R$ 500,00");

  await page.goto("/2026-04");
  await expect(cardSaldoPrevisto(page)).toHaveText(sobraDeAbril ?? "");

  await page.goto("/2026-05");
  await expect(cardSaldoPrevisto(page)).toHaveText(`-${faltaDeMaio ?? ""}`);
});

test("a régua aparece em Movimentações sem o rótulo do eixo competência (SALDO-03, AC 6)", async ({
  page,
}) => {
  await page.goto(`/${MARCO}?visao=movimentacoes`);

  await expect(page.getByText("Saldo do período", { exact: true })).toBeVisible();
  await expect(valorDe(cartao(page, "Abril de 2026"), "Vai sobrar")).toHaveText("R$ 700,00");
  await expect(page.getByText("Saldo previsto")).toHaveCount(0);
});

test("em 400 px a Visão geral cabe sem rolagem horizontal (SALDO-03, AC 8)", async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 900 });
  await page.goto(`/${MARCO}`);
  await expect(valorDe(cartao(page, "Maio de 2026"), "Vai faltar")).toHaveText("R$ 500,00");

  const transborda = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(transborda).toBe(false);
});
