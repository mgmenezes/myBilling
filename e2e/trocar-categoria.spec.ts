import { expect, type Locator, type Page, test } from "@playwright/test";
import type { Pool } from "pg";
import {
  criarPoolDeTeste,
  limparDados,
  recriarBancoDeTeste,
  semearCadastroBase,
} from "@/infrastructure/db/testing/banco-de-teste";

/**
 * **Trocar a categoria na lista de Lançamentos, de ponta a ponta** (TRC-01 a
 * TRC-04).
 *
 * A regra "gasto tem seletor, entrada não" é aplicada na tabela, e o alcance da
 * troca só aparece de verdade na lista de outros meses (lição L-001): por isso
 * cada percurso troca num mês e confere nos vizinhos. A categoria de uma linha
 * é lida na opção escolhida do seletor, e não no texto da linha, que contém
 * todas as opções.
 *
 * Os lançamentos nascem pela interface, como nos outros e2e. Nenhum valor ou
 * descrição vem de dado real da família (AD-009).
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
  /* A base traz só "Categoria Um"; a troca precisa de um destino. */
  await pool.query("INSERT INTO categoria (nome) VALUES ($1)", ["Categoria Dois"]);
  await entrar(page, EMAIL_PERMITIDO);
});

async function entrar(page: Page, email: string): Promise<void> {
  const csrf = await page.request.get("/api/auth/csrf");
  const { csrfToken } = (await csrf.json()) as { csrfToken: string };
  await page.request.post("/api/auth/callback/provedor-de-teste", {
    form: { csrfToken, email, callbackUrl: "/" },
  });
}

/** Cadastra um fixo em "Todo mês" do mês de início, sempre em Categoria Um. */
async function cadastrarFixo(
  page: Page,
  dados: {
    readonly descricao: string;
    readonly valor: string;
    readonly inicio: string;
    readonly fim?: string;
    readonly entrada?: boolean;
  },
): Promise<void> {
  await page.goto(`/${dados.inicio}/fixos`);
  await page.getByRole("button", { name: "+ Novo fixo" }).click();
  const form = page.getByRole("dialog").getByRole("form", { name: "Gasto fixo ou entrada" });
  if (dados.entrada === true) {
    await form.getByLabel("Um dinheiro que entra").check();
    await form.getByLabel("Dia que costuma cair").fill("5");
  }
  await form.getByLabel("Descrição").fill(dados.descricao);
  await form.getByLabel(/De quanto costuma ser/).fill(dados.valor);
  if (dados.fim !== undefined) {
    await form.getByLabel("Termina em (opcional)").fill(dados.fim);
  }
  await form.getByLabel("Categoria", { exact: true }).selectOption({ label: "Categoria Um" });
  await form
    .getByRole("button", {
      name: dados.entrada === true ? "Cadastrar entrada" : "Cadastrar gasto fixo",
    })
    .click();
  await expect(form.getByRole("status")).toContainText(dados.descricao);
  await page.keyboard.press("Escape");
}

/** Cadastra uma compra de R$ 300,00 em 3x no cartão, em Categoria Um. */
async function cadastrarCompra(page: Page, competencia: string, descricao: string): Promise<void> {
  await page.goto(`/${competencia}/lancamentos`);
  await page.getByRole("button", { name: "+ Novo lançamento" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByRole("tab", { name: "Parcelado" }).click();
  /* Escopo obrigatório: as duas abas ficam montadas, com campos homônimos. */
  const form = dialogo.getByRole("form", { name: "Nova compra" });
  await form.getByLabel("Descrição", { exact: true }).fill(descricao);
  await form.getByLabel("Valor total (R$)").fill("300,00");
  await form.getByLabel("Quantidade de parcelas").fill("3");
  await form.getByLabel("Categoria", { exact: true }).selectOption({ label: "Categoria Um" });
  await form.getByRole("button", { name: "Cadastrar compra" }).click();
  await expect(form.getByRole("status")).toContainText(descricao);
  await page.keyboard.press("Escape");
}

/**
 * Cadastra um avulso em Conta Corrente: o gasto cai em "Gastos do Mês", e não
 * em "Cartão de Crédito". Sem `categoria`, fica sem categoria.
 */
async function cadastrarAvulso(
  page: Page,
  competencia: string,
  dados: {
    readonly descricao: string;
    readonly valor: string;
    readonly entrada?: boolean;
    readonly categoria?: string;
  },
): Promise<void> {
  await page.goto(`/${competencia}/lancamentos`);
  await page.getByRole("button", { name: "+ Novo lançamento" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByRole("tab", { name: "Avulso" }).click();
  const form = dialogo.getByRole("form", { name: "Lançamento avulso" });
  if (dados.entrada === true) {
    await form.getByRole("radio", { name: "Um dinheiro que entra" }).check();
  }
  await form.getByLabel("Descrição").fill(dados.descricao);
  await form.getByLabel("Valor (R$)").fill(dados.valor);
  await form
    .getByLabel(dados.entrada === true ? "Onde o dinheiro cai" : "Meio de pagamento")
    .selectOption({ label: "Conta Corrente" });
  if (dados.categoria !== undefined) {
    await form.getByLabel("Categoria", { exact: true }).selectOption({ label: dados.categoria });
  }
  await form.getByRole("button", { name: "Cadastrar lançamento" }).click();
  await expect(form.getByRole("status")).toContainText(dados.descricao);
  await page.keyboard.press("Escape");
}

/** Abre os meses, para que as ocorrências do fixo existam antes da troca. */
async function abrirMeses(page: Page, competencias: ReadonlyArray<string>): Promise<void> {
  for (const competencia of competencias) {
    await page.goto(`/${competencia}/lancamentos`);
    await expect(page.getByRole("region", { name: "Fixos" })).toBeVisible();
  }
}

function linha(page: Page, bloco: string, descricao: string): Locator {
  return page
    .getByRole("region", { name: bloco })
    .getByRole("row", { name: new RegExp(descricao) });
}

function seletor(page: Page, descricao: string): Locator {
  return page.getByRole("combobox", { name: `Categoria de ${descricao}` });
}

/** A categoria que a linha mostra: a opção escolhida, e não o texto da linha. */
function categoriaEscolhida(page: Page, descricao: string): Locator {
  return seletor(page, descricao).locator("option:checked");
}

/**
 * O toast: a `status` dentro da região `aria-live` do layout. A contagem do
 * cartão de filtros também é `status` (LST-01, AC 8), então a busca solta
 * casaria as duas.
 */
function aviso(page: Page): Locator {
  return page.locator('[aria-live="polite"]').getByRole("status");
}

test("trocar em novembro a categoria de um fixo troca outubro e dezembro, e outubro continua pago (TRC-03 AC 1, TRC-04 ACs 1 e 5)", async ({
  page,
}) => {
  await cadastrarFixo(page, {
    descricao: "Conta de luz",
    valor: "100,00",
    inicio: "2026-10",
    fim: "2026-12",
  });
  await abrirMeses(page, ["2026-10", "2026-11", "2026-12"]);
  await page.goto("/2026-10/lancamentos");
  const outubro = linha(page, "Fixos", "Conta de luz");
  await outubro.locator("button[aria-pressed]").click();
  await expect(outubro.locator("button[aria-pressed]")).toHaveAttribute("aria-pressed", "true");

  await page.goto("/2026-11/lancamentos");
  await expect(categoriaEscolhida(page, "Conta de luz")).toHaveText("Categoria Um");
  await seletor(page, "Conta de luz").selectOption({ label: "Categoria Dois" });

  await expect(aviso(page)).toHaveText("Categoria trocada em todos os meses deste fixo.");
  /* Sem recarregar: a lista revalidada já traz a nova, e o seletor não volta. */
  await expect(categoriaEscolhida(page, "Conta de luz")).toHaveText("Categoria Dois");

  for (const competencia of ["2026-10", "2026-11", "2026-12"]) {
    await page.goto(`/${competencia}/lancamentos`);
    await expect(categoriaEscolhida(page, "Conta de luz")).toHaveText("Categoria Dois");
  }
  await page.goto("/2026-10/lancamentos");
  await expect(
    linha(page, "Fixos", "Conta de luz").locator("button[aria-pressed]"),
  ).toHaveAttribute("aria-pressed", "true");

  /* "Gastos por categoria" da Visão geral passa o valor do fixo para a nova. */
  await page.goto("/2026-11");
  const grafico = page.getByRole("list", {
    name: "Gastos por categoria, ordenados do maior para o menor",
  });
  await expect(grafico.getByRole("listitem").filter({ hasText: "Categoria Dois" })).toContainText(
    "R$ 100,00",
  );
  await expect(grafico.getByRole("listitem").filter({ hasText: "Categoria Um" })).toHaveCount(0);
});

test("trocar a parcela 2 de uma compra troca as parcelas 1 e 3, e o aviso some sozinho (TRC-03 AC 3, TRC-04 ACs 2 e 4)", async ({
  page,
}) => {
  await cadastrarCompra(page, "2026-03", "Compra parcelada A");

  await page.goto("/2026-04/lancamentos");
  await expect(linha(page, "Cartão de Crédito", "Compra parcelada A")).toContainText("2/3");
  await seletor(page, "Compra parcelada A").selectOption({ label: "Categoria Dois" });

  await expect(aviso(page)).toHaveText("Categoria trocada em todas as parcelas desta compra.");
  /* Quatro segundos na tela; a folga é do relógio do navegador, não do prazo. */
  await expect(aviso(page)).toHaveCount(0, { timeout: 6_000 });

  for (const [competencia, parcela] of [
    ["2026-03", "1/3"],
    ["2026-04", "2/3"],
    ["2026-05", "3/3"],
  ] as const) {
    await page.goto(`/${competencia}/lancamentos`);
    await expect(linha(page, "Cartão de Crédito", "Compra parcelada A")).toContainText(parcela);
    await expect(categoriaEscolhida(page, "Compra parcelada A")).toHaveText("Categoria Dois");
  }
});

test("trocar um gasto do mês troca só ele, e o outro de mesma categoria fica com ela (TRC-03 AC 4, TRC-04 AC 3)", async ({
  page,
}) => {
  await cadastrarAvulso(page, "2026-03", {
    descricao: "Farmácia",
    valor: "20,00",
    categoria: "Categoria Um",
  });
  await cadastrarAvulso(page, "2026-03", {
    descricao: "Padaria",
    valor: "10,00",
    categoria: "Categoria Um",
  });

  await page.goto("/2026-03/lancamentos");
  await seletor(page, "Farmácia").selectOption({ label: "Categoria Dois" });
  await expect(aviso(page)).toHaveText("Categoria trocada.");

  await page.reload();
  await expect(categoriaEscolhida(page, "Farmácia")).toHaveText("Categoria Dois");
  await expect(categoriaEscolhida(page, "Padaria")).toHaveText("Categoria Um");
});

test("com a lista filtrada pela categoria antiga, o gasto trocado sai dela (TRC-04 AC 5)", async ({
  page,
}) => {
  await cadastrarAvulso(page, "2026-03", {
    descricao: "Farmácia",
    valor: "20,00",
    categoria: "Categoria Um",
  });
  await cadastrarAvulso(page, "2026-03", {
    descricao: "Padaria",
    valor: "10,00",
    categoria: "Categoria Um",
  });

  await page.goto("/2026-03/lancamentos");
  /* A categoria é um chip do cartão, com o total do mês (LST-01). */
  await page
    .locator("#cartao-de-filtros")
    .getByRole("button", { name: "Categoria Um · R$ 30,00" })
    .click();
  await expect(page).toHaveURL(/categoriaId=/);
  await expect(linha(page, "Gastos do Mês", "Farmácia")).toBeVisible();

  await seletor(page, "Farmácia").selectOption({ label: "Categoria Dois" });

  await expect(aviso(page)).toHaveText("Categoria trocada.");
  await expect(linha(page, "Gastos do Mês", "Farmácia")).toHaveCount(0);
  await expect(linha(page, "Gastos do Mês", "Padaria")).toBeVisible();
});

test("com uma categoria arquivada, o gasto que a tem a vê pelo nome, e os outros não a oferecem (TRC-02, ACs 1 e 3)", async ({
  page,
}) => {
  await cadastrarAvulso(page, "2026-03", {
    descricao: "Farmácia",
    valor: "20,00",
    categoria: "Categoria Dois",
  });
  await cadastrarAvulso(page, "2026-03", {
    descricao: "Padaria",
    valor: "10,00",
    categoria: "Categoria Um",
  });
  /* Arquivar não tem tela ainda; o banco é o caminho. */
  const arquivadas = await pool.query("UPDATE categoria SET arquivada_em = now() WHERE nome = $1", [
    "Categoria Dois",
  ]);
  expect(arquivadas.rowCount).toBe(1);

  await page.goto("/2026-03/lancamentos");
  /* A página manda à linha o nome de todas as categorias, arquivadas inclusive
     (AC 3), e só as ativas como opções (AC 1). */
  await expect(categoriaEscolhida(page, "Farmácia")).toHaveText("Categoria Dois");
  await expect(seletor(page, "Padaria").locator("option")).toHaveText([
    "Sem categoria",
    "Categoria Um",
  ]);
});

test("entrada fixa com categoria e entrada avulsa sem categoria dizem Receita, sem seletor (TRC-01, ACs 1 e 2)", async ({
  page,
}) => {
  await cadastrarFixo(page, {
    descricao: "Salário",
    valor: "4.200,00",
    inicio: "2026-03",
    entrada: true,
  });
  await cadastrarAvulso(page, "2026-03", {
    descricao: "Pix recebido",
    valor: "50,00",
    entrada: true,
  });

  await page.goto("/2026-03/lancamentos");
  /* As duas condições do AC 1 são de verdade em março: uma tem categoria
     gravada, a outra não. O fixo também materializa os meses seguintes. */
  const gravadas = await pool.query<{ descricao: string; categoria_id: string | null }>(
    `SELECT descricao, categoria_id FROM movimento
      WHERE descricao = ANY($1) AND to_char(competencia, 'YYYY-MM') = $2
      ORDER BY descricao`,
    [["Pix recebido", "Salário"], "2026-03"],
  );
  expect(gravadas.rows.map((r) => [r.descricao, r.categoria_id !== null])).toEqual([
    ["Pix recebido", false],
    ["Salário", true],
  ]);

  for (const descricao of ["Salário", "Pix recebido"]) {
    await expect(
      linha(page, "Entradas", descricao).getByText("Receita", { exact: true }),
    ).toBeVisible();
  }
  await expect(page.getByRole("region", { name: "Entradas" }).getByRole("combobox")).toHaveCount(0);
});
