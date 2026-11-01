import { expect, type Page, test } from "@playwright/test";
import type { Pool } from "pg";
import {
  criarPoolDeTeste,
  limparDados,
  recriarBancoDeTeste,
  semearCadastroBase,
} from "@/infrastructure/db/testing/banco-de-teste";

/**
 * **Abrir um mês materializa doze meses à frente (HORIZ-01, AC 1).**
 *
 * A prova que discrimina está no banco, e não na tela: abrir o mês distante
 * também materializa a partir dele, então ver a linha lá provaria só que
 * aquela página roda. O que esta prova exige é que, logo depois de abrir
 * março, as ocorrências já existam até março do ano seguinte e **não** em
 * abril (o limite da janela, L-029). A tela entra depois, como composição:
 * a página passa a constante certa e a linha aparece onde a pessoa vai olhar.
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
  const csrf = await page.request.get("/api/auth/csrf");
  const { csrfToken } = (await csrf.json()) as { csrfToken: string };
  await page.request.post("/api/auth/callback/provedor-de-teste", {
    form: { csrfToken, email: EMAIL_PERMITIDO, callbackUrl: "/" },
  });
});

/** Cadastra um gasto fixo sem fim pela interface, a partir de "Todo mês". */
async function cadastrarFixo(page: Page, descricao: string): Promise<void> {
  await page.goto("/2026-03/fixos");
  const painel = page.getByRole("complementary", { name: "Painel do fixo" });
  const form = painel.getByRole("form", { name: "Gasto fixo ou entrada" });
  if (!(await form.isVisible())) {
    await page.getByRole("button", { name: "+ Novo fixo" }).click();
  }
  await form.getByLabel("Descrição").fill(descricao);
  await form.getByLabel(/De quanto costuma ser/).fill("180,00");
  await form.getByLabel("Dia de vencimento").fill("20");
  await form.getByRole("button", { name: "Cadastrar gasto fixo" }).click();
  await expect(page.getByRole("status")).toContainText(descricao);
  await page.keyboard.press("Escape");
}

async function competenciasDasOcorrencias(): Promise<string[]> {
  const { rows } = await pool.query<{ competencia: string }>(
    "SELECT DISTINCT competencia::text AS competencia FROM movimento WHERE recorrencia_id IS NOT NULL ORDER BY 1",
  );
  return rows.map((r) => r.competencia);
}

test("abrir março deixa o fixo lançado até março do ano seguinte, e não além (HORIZ-01, AC 1)", async ({
  page,
}) => {
  await cadastrarFixo(page, "Conta de água");
  await page.goto("/2026-03");
  await expect(page.getByRole("heading", { name: "Próximos meses", level: 2 })).toBeVisible();

  expect(await competenciasDasOcorrencias()).toEqual([
    "2026-03-01",
    "2026-04-01",
    "2026-05-01",
    "2026-06-01",
    "2026-07-01",
    "2026-08-01",
    "2026-09-01",
    "2026-10-01",
    "2026-11-01",
    "2026-12-01",
    "2027-01-01",
    "2027-02-01",
    "2027-03-01",
  ]);

  await page.goto("/2027-03/lancamentos");
  const linha = page
    .getByRole("region", { name: "Fixos" })
    .getByRole("row", { name: /Conta de água/ });
  await expect(linha).toBeVisible();
  expect((await linha.innerText()).replace(/\s+/g, " ")).toContain("R$ 180,00");
});
