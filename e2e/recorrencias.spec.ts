import { expect, type Locator, type Page, test } from "@playwright/test";
import type { Pool } from "pg";
import {
  criarPoolDeTeste,
  limparDados,
  recriarBancoDeTeste,
  semearCadastroBase,
} from "@/infrastructure/db/testing/banco-de-teste";

/**
 * **O ciclo completo do gasto fixo, de ponta a ponta.**
 *
 * É a segunda re-digitação que a planilha impunha: criar a conta de luz uma vez
 * e vê-la em todo mês. E é a pergunta que atrasou a fatia duas vezes — quando o
 * valor muda, o passado muda junto? Este arquivo responde com números, não com
 * presença de elemento: ele compara valores mês a mês antes e depois do
 * reajuste.
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

/**
 * Abre o cadastro de "Todo mês", que vive num `<dialog>` desde o T29 — a lista
 * só cresce e o formulário no rodapé ficava cada vez mais longe.
 */
async function abrirCadastroFixo(page: Page): Promise<Locator> {
  const dialogo = page.getByRole("dialog");
  if (!(await dialogo.isVisible())) {
    await page.getByRole("button", { name: "+ Novo fixo" }).click();
  }
  return dialogo.getByRole("form", { name: "Gasto fixo ou entrada" });
}

/** Cadastra um gasto fixo pela interface, a partir da área "Todo mês". */
async function cadastrarFixo(
  page: Page,
  dados: { descricao: string; valor: string; dia: string; inicio: string },
): Promise<void> {
  await page.goto(`/${dados.inicio}/fixos`);
  const form = await abrirCadastroFixo(page);
  await form.getByLabel("Descrição").fill(dados.descricao);
  await form.getByLabel(/De quanto costuma ser/).fill(dados.valor);
  await form.getByLabel("Dia de vencimento").fill(dados.dia);
  await form.getByRole("button", { name: "Cadastrar gasto fixo" }).click();
  await expect(page.getByRole("status")).toContainText(dados.descricao);
  await page.keyboard.press("Escape");
}

/** O valor exibido de um gasto fixo na lista de lançamentos daquele mês. */
async function valorNaLista(page: Page, competencia: string, descricao: string): Promise<string> {
  await page.goto(`/${competencia}/lancamentos`);
  const linha = page
    .getByRole("region", { name: "Fixos" })
    .getByRole("row", { name: new RegExp(descricao) });
  await expect(linha).toBeVisible();
  return (await linha.innerText()).replace(/\s+/g, " ");
}

test("cadastrar uma vez faz o gasto fixo aparecer em todo mês (FIXO-01)", async ({ page }) => {
  await cadastrarFixo(page, {
    descricao: "Conta de água",
    valor: "180,00",
    dia: "20",
    inicio: "2026-03",
  });

  for (const competencia of ["2026-03", "2026-04", "2026-05"]) {
    expect(await valorNaLista(page, competencia, "Conta de água")).toContain("R$ 180,00");
  }
});

test("mês anterior ao início não recebe ocorrência (FIXO-01, AC 3)", async ({ page }) => {
  await cadastrarFixo(page, {
    descricao: "Conta de água",
    valor: "180,00",
    dia: "20",
    inicio: "2026-03",
  });

  await page.goto("/2026-02/lancamentos");
  await expect(
    page.getByRole("region", { name: "Fixos" }).getByRole("row", { name: /Conta de água/ }),
  ).toHaveCount(0);
});

test("mudar o valor a partir de um mês não reescreve os anteriores (FIXO-03)", async ({ page }) => {
  await cadastrarFixo(page, {
    descricao: "Conta de luz",
    valor: "180,00",
    dia: "20",
    inicio: "2026-03",
  });
  // Visita maio para a ocorrência dele existir antes do reajuste — é o caso que
  // exercita a propagação, e não só a materialização com o valor novo.
  await page.goto("/2026-05/lancamentos");

  await page.goto("/2026-03/fixos");
  await page.getByRole("button", { name: "Mudar valor" }).click();
  await page.getByLabel("Novo valor (R$)").fill("240,00");
  await page.getByLabel("Vale a partir de").fill("2026-05");
  await page.getByRole("button", { name: "Registrar" }).click();
  await expect(page.getByLabel("Novo valor (R$)")).toHaveCount(0);

  expect(await valorNaLista(page, "2026-03", "Conta de luz")).toContain("R$ 180,00");
  expect(await valorNaLista(page, "2026-04", "Conta de luz")).toContain("R$ 180,00");
  expect(await valorNaLista(page, "2026-05", "Conta de luz")).toContain("R$ 240,00");
});

test("a área Todo mês mostra o valor vigente no mês aberto, não o mais recente", async ({
  page,
}) => {
  await cadastrarFixo(page, {
    descricao: "Conta de luz",
    valor: "180,00",
    dia: "20",
    inicio: "2026-03",
  });

  await page.goto("/2026-03/fixos");
  await page.getByRole("button", { name: "Mudar valor" }).click();
  await page.getByLabel("Novo valor (R$)").fill("240,00");
  await page.getByLabel("Vale a partir de").fill("2026-05");
  await page.getByRole("button", { name: "Registrar" }).click();

  await page.goto("/2026-03/fixos");
  await expect(page.getByText("R$ 180,00")).toBeVisible();

  await page.goto("/2026-05/fixos");
  await expect(page.getByText("R$ 240,00")).toBeVisible();
});

test("confirmar o valor real move o indicador do mês (FIXO-04)", async ({ page }) => {
  await cadastrarFixo(page, {
    descricao: "Conta de luz",
    valor: "180,00",
    dia: "20",
    inicio: "2026-03",
  });

  await page.goto("/2026-03");
  const pendenteAntes = await valorDoIndicador(page, "Ainda não pago");

  await page.goto("/2026-03/lancamentos");
  await page.getByRole("button", { name: /confirmar o valor de Conta de luz/ }).click();
  await page.getByLabel(/Valor real de Conta de luz/).fill("192,40");
  await page.getByRole("button", { name: "Confirmar" }).click();

  // A previsão continua visível ao lado do valor confirmado.
  const linha = await valorNaLista(page, "2026-03", "Conta de luz");
  expect(linha).toContain("R$ 192,40");
  expect(linha).toContain("confirmado");
  expect(linha).toContain("R$ 180,00");

  await page.goto("/2026-03");
  expect(await valorDoIndicador(page, "Ainda não pago")).toBe(pendenteAntes + 1240);

  // E abril segue previsto em 180: confirmar um mês não alcança outro.
  expect(await valorNaLista(page, "2026-04", "Conta de luz")).toContain("R$ 180,00");
});

test("encerrar remove o futuro não pago e preserva o passado (FIXO-06)", async ({ page }) => {
  await cadastrarFixo(page, {
    descricao: "Internet",
    valor: "120,00",
    dia: "10",
    inicio: "2026-03",
  });
  await page.goto("/2026-05/lancamentos");

  await page.goto("/2026-03/fixos");
  await page.getByRole("button", { name: "Encerrar" }).click();
  await page.getByLabel("Encerrar a partir de").fill("2026-05");
  await page.getByRole("button", { name: "Encerrar mesmo assim" }).click();

  // Março e abril continuam; maio some.
  expect(await valorNaLista(page, "2026-03", "Internet")).toContain("R$ 120,00");
  expect(await valorNaLista(page, "2026-04", "Internet")).toContain("R$ 120,00");

  await page.goto("/2026-05/lancamentos");
  await expect(
    page.getByRole("region", { name: "Fixos" }).getByRole("row", { name: /Internet/ }),
  ).toHaveCount(0);

  /*
   * **A lista de "Todo mês" também para de mostrá-la em maio** (FIXO-07).
   * Faltava esta asserção: o percurso visitava `/2026-05/lancamentos` e
   * `/2026-03/fixos`, nunca `/2026-05/fixos`, e o Verifier provou que apagar o
   * filtro da página deixava as 1.022 provas verdes.
   */
  await page.goto("/2026-05/fixos");
  await expect(page.getByRole("listitem").filter({ hasText: "Internet" })).toHaveCount(0);

  /* Em abril ela continua lá, com o selo de encerrada: abril é um mês em que
     ela valeu, e escondê-la ali seria mentir sobre aquele mês. */
  await page.goto("/2026-04/fixos");
  const emAbril = page.getByRole("listitem").filter({ hasText: "Internet" });
  await expect(emAbril).toBeVisible();
  await expect(emAbril).toContainText("Encerrado");

  // E abrir maio de novo não recria: a materialização respeita o encerramento.
  await page.goto("/2026-05/lancamentos");
  await expect(
    page.getByRole("region", { name: "Fixos" }).getByRole("row", { name: /Internet/ }),
  ).toHaveCount(0);

  // A recorrência continua existindo, marcada como encerrada.
  await page.goto("/2026-03/fixos");
  await expect(page.getByText("Encerrado")).toBeVisible();
});

test("receita recorrente entra em Entradas, não em Fixos (FIXO-01 AC 6, ENTR-03)", async ({
  page,
}) => {
  await page.goto("/2026-03/fixos");
  const form = await abrirCadastroFixo(page);
  await form.getByLabel("Descrição").fill("Salário");
  await form.getByLabel("Um dinheiro que entra").check();

  /*
   * Os rótulos mudam com a natureza (ENTR-03): com receita marcada não há "Dia
   * de vencimento" nem "Meio de pagamento", porque salário não vence e não cai
   * em cartão de crédito. Este percurso é o que prova a troca na tela real.
   */
  await form.getByLabel(/De quanto costuma ser/).fill("4.200,00");
  await form.getByLabel("Dia que costuma cair").fill("5");
  await expect(form.getByLabel("Onde o dinheiro cai")).toBeVisible();
  await expect(form.getByLabel("Onde o dinheiro cai").getByRole("option")).toHaveText([
    "Conta Corrente",
  ]);
  await form.getByRole("button", { name: "Cadastrar entrada" }).click();
  await expect(page.getByRole("status")).toContainText("Salário");
  await page.keyboard.press("Escape");

  await page.goto("/2026-03/lancamentos");
  await expect(
    page.getByRole("region", { name: "Entradas" }).getByRole("row", {
      name: /Salário/,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Fixos" }).getByRole("row", { name: /Salário/ }),
  ).toHaveCount(0);
});

/** O valor de um indicador do painel, em centavos. */
async function valorDoIndicador(page: Page, rotulo: string): Promise<number> {
  const texto = await page
    .locator("a, div")
    .filter({ hasText: new RegExp(`^${rotulo}`) })
    .last()
    .innerText();
  const encontrado = texto.match(/R\$\s*([\d.]+),(\d{2})/);
  if (encontrado === null) {
    throw new Error(`indicador "${rotulo}" sem valor legível em: ${texto}`);
  }
  return Number(encontrado[1]?.replaceAll(".", "")) * 100 + Number(encontrado[2]);
}
