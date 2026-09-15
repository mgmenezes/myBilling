import { expect, type Locator, type Page, test } from "@playwright/test";
import type { Pool } from "pg";
import {
  criarPoolDeTeste,
  limparDados,
  recriarBancoDeTeste,
  semearCadastroBase,
} from "@/infrastructure/db/testing/banco-de-teste";

/**
 * **O mês passa a fechar, de ponta a ponta.**
 *
 * Antes desta fatia só compra parcelada e gasto fixo tinham caminho até o banco.
 * Este arquivo prova os três percursos que faltavam: o gasto avulso caindo no
 * bloco certo, o dinheiro que entra, e desfazer um erro de digitação.
 *
 * O que mais importa aqui é o **bloco** em que a linha aparece. "Cartão de
 * Crédito" deixou de significar "veio de compra parcelada" e passou a
 * significar "vai cair na fatura", e essa mudança só é observável na tela.
 *
 * Nenhum valor ou descrição vem de dado real da família (AD-009).
 */

const EMAIL_PERMITIDO = "pessoa-a@example.com";
const MARCO = "2026-03";

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

async function entrar(page: Page, email: string): Promise<void> {
  const csrf = await page.request.get("/api/auth/csrf");
  const { csrfToken } = (await csrf.json()) as { csrfToken: string };
  await page.request.post("/api/auth/callback/provedor-de-teste", {
    form: { csrfToken, email, callbackUrl: "/" },
  });
}

/** O formulário de avulso dentro do diálogo, que precisa estar aberto. */
function avulso(page: Page): Locator {
  return page.getByRole("dialog").getByRole("form", { name: "Lançamento avulso" });
}

/** Abre o diálogo na aba de compra parcelada, para o caso da parcela. */
async function abrirCadastroParcelado(page: Page): Promise<Locator> {
  const dialogo = page.getByRole("dialog");
  if (!(await dialogo.isVisible())) {
    await page.getByRole("button", { name: "+ Novo lançamento" }).click();
  }
  await dialogo.getByRole("tab", { name: "Parcelado" }).click();
  return dialogo.getByRole("form", { name: "Nova compra" });
}

/** Abre o diálogo de cadastro na aba de avulso. */
async function abrirAvulso(page: Page): Promise<Locator> {
  const dialogo = page.getByRole("dialog");
  if (!(await dialogo.isVisible())) {
    await page.getByRole("button", { name: "+ Novo lançamento" }).click();
  }
  await dialogo.getByRole("tab", { name: "Avulso" }).click();
  return avulso(page);
}

interface Avulso {
  readonly descricao: string;
  readonly valor: string;
  readonly natureza?: "entra" | "sai";
  readonly meio?: string;
}

/** Preenche e envia. O diálogo fica aberto, com a confirmação visível. */
async function cadastrarAvulso(page: Page, dados: Avulso): Promise<void> {
  const form = await abrirAvulso(page);
  if (dados.natureza === "entra") {
    await form.getByRole("radio", { name: "Um dinheiro que entra" }).check();
  }
  await form.getByLabel("Descrição").fill(dados.descricao);
  await form.getByLabel("Valor (R$)").fill(dados.valor);
  if (dados.meio !== undefined) {
    const rotulo = dados.natureza === "entra" ? "Onde o dinheiro cai" : "Meio de pagamento";
    await form.getByLabel(rotulo).selectOption({ label: dados.meio });
  }
  await form.getByRole("button", { name: "Cadastrar lançamento" }).click();
  await expect(page.getByRole("status")).toContainText(dados.descricao);
}

/** A linha daquela descrição dentro do bloco informado. */
function linhaNoBloco(page: Page, bloco: string, descricao: string): Locator {
  return page
    .getByRole("region", { name: bloco })
    .getByRole("row", { name: new RegExp(descricao) });
}

/** O valor de um indicador do painel, em centavos. */
async function indicador(page: Page, rotulo: string): Promise<number> {
  const texto = (await page.getByRole("link", { name: new RegExp(rotulo) }).textContent()) ?? "";
  const encontrado = texto.match(/R\$\s*([\d.]+),(\d{2})/);
  if (!encontrado) {
    throw new Error(`indicador "${rotulo}" sem valor legível em: ${texto}`);
  }
  return Number(encontrado[1]?.replaceAll(".", "")) * 100 + Number(encontrado[2]);
}

test("despesa avulsa no cartão cai no bloco do cartão, e não em Gastos do Mês (BLOCO-01, AC 3)", async ({
  page,
}) => {
  await page.goto(`/${MARCO}/lancamentos`);

  await cadastrarAvulso(page, { descricao: "Farmácia", valor: "48,90", meio: "Cartão Roxo" });
  await page.keyboard.press("Escape");

  await expect(linhaNoBloco(page, "Cartão de Crédito", "Farmácia")).toBeVisible();
  /* O ponto da fatia: antes ela cairia aqui, fora da fatura. */
  await expect(linhaNoBloco(page, "Gastos do Mês", "Farmácia")).toHaveCount(0);
});

test("a mesma despesa numa conta corrente cai em Gastos do Mês (BLOCO-01, AC 4)", async ({
  page,
}) => {
  await page.goto(`/${MARCO}/lancamentos`);

  await cadastrarAvulso(page, { descricao: "Almoço", valor: "32,50", meio: "Conta Corrente" });
  await page.keyboard.press("Escape");

  await expect(linhaNoBloco(page, "Gastos do Mês", "Almoço")).toBeVisible();
  await expect(linhaNoBloco(page, "Cartão de Crédito", "Almoço")).toHaveCount(0);
});

test("o gasto avulso move o indicador do painel, não só a lista (AVUL-01, AC 6)", async ({
  page,
}) => {
  await page.goto(`/${MARCO}`);
  const antes = await indicador(page, "Despesas do mês");

  await page.goto(`/${MARCO}/lancamentos`);
  await cadastrarAvulso(page, { descricao: "Farmácia", valor: "48,90", meio: "Cartão Roxo" });
  await page.keyboard.press("Escape");

  await page.goto(`/${MARCO}`);

  expect(await indicador(page, "Despesas do mês")).toBe(antes + 4890);
});

/*
 * O painel do mês tem quatro indicadores e nenhum deles é por bloco: a
 * concordância entre o total do bloco e o número exibido é afirmada na camada
 * de aplicação, em `obter-visao-mensal/handler.test.ts`, onde os dois saem da
 * mesma função. O que só a tela pode provar é a **separação**: dois gastos de
 * meios diferentes não caem no mesmo bloco.
 */
test("gastos de meios diferentes ficam em blocos diferentes, somando o mesmo total", async ({
  page,
}) => {
  await page.goto(`/${MARCO}/lancamentos`);
  await cadastrarAvulso(page, { descricao: "Farmácia", valor: "48,90", meio: "Cartão Roxo" });
  await cadastrarAvulso(page, { descricao: "Almoço", valor: "32,50", meio: "Conta Corrente" });
  await page.keyboard.press("Escape");

  await expect(linhaNoBloco(page, "Cartão de Crédito", "Farmácia")).toBeVisible();
  await expect(linhaNoBloco(page, "Gastos do Mês", "Almoço")).toBeVisible();
  await expect(linhaNoBloco(page, "Cartão de Crédito", "Almoço")).toHaveCount(0);
  await expect(linhaNoBloco(page, "Gastos do Mês", "Farmácia")).toHaveCount(0);

  await page.goto(`/${MARCO}`);
  expect(await indicador(page, "Despesas do mês")).toBe(4890 + 3250);
});

test("o Pix recebido aparece em Entradas e move Receitas do mês (AVUL-02, AC 1 e 3)", async ({
  page,
}) => {
  await page.goto(`/${MARCO}/lancamentos`);

  await cadastrarAvulso(page, {
    descricao: "Pix recebido",
    valor: "50,00",
    natureza: "entra",
    meio: "Conta Corrente",
  });
  await page.keyboard.press("Escape");

  await expect(linhaNoBloco(page, "Entradas", "Pix recebido")).toBeVisible();
  for (const bloco of ["Fixos", "Cartão de Crédito", "Gastos do Mês"]) {
    await expect(linhaNoBloco(page, bloco, "Pix recebido")).toHaveCount(0);
  }

  await page.goto(`/${MARCO}`);
  expect(await indicador(page, "Receitas do mês")).toBe(5000);
  /* E não contamina o outro lado: entrada não é gasto. */
  expect(await indicador(page, "Despesas do mês")).toBe(0);
});

test("a receita não oferece cartão como destino (ENTR-03, AC 1 e 2)", async ({ page }) => {
  await page.goto(`/${MARCO}/lancamentos`);
  const form = await abrirAvulso(page);

  await expect(form.getByLabel("Meio de pagamento")).toBeVisible();

  await form.getByRole("radio", { name: "Um dinheiro que entra" }).check();

  await expect(form.getByLabel("Onde o dinheiro cai")).toBeVisible();
  await expect(form.getByLabel("Meio de pagamento")).toHaveCount(0);
  await expect(form.getByLabel("Onde o dinheiro cai").getByRole("option")).toHaveText([
    "Conta Corrente",
  ]);
});

/*
 * O bloco de entradas aparecia só quando tinha conteúdo, enquanto os três de
 * despesa apareciam vazios. Num mês sem receita, o dinheiro que entra era o
 * único que sumia da tela — e com ele o convite para cadastrar.
 */
test("Entradas aparece no topo e vazio num mês sem receita (ENTR-02, AC 2 a 4)", async ({
  page,
}) => {
  await page.goto(`/${MARCO}/lancamentos`);
  await cadastrarAvulso(page, { descricao: "Almoço", valor: "32,50", meio: "Conta Corrente" });
  await page.keyboard.press("Escape");

  const entradas = page.getByRole("region", { name: "Entradas" });
  await expect(entradas).toBeVisible();
  await expect(entradas.getByText("Nenhum lançamento neste bloco.")).toBeVisible();

  const titulos = await page.getByRole("heading", { level: 3 }).allTextContents();
  expect(titulos).toEqual(["Entradas", "Fixos", "Cartão de Crédito", "Gastos do Mês"]);
});

test("excluir um avulso devolve o total do mês ao valor anterior (AVUL-03, AC 2)", async ({
  page,
}) => {
  await page.goto(`/${MARCO}`);
  const antes = await indicador(page, "Despesas do mês");

  await page.goto(`/${MARCO}/lancamentos`);
  await cadastrarAvulso(page, { descricao: "Erro de digitação", valor: "999,99" });
  await page.keyboard.press("Escape");
  await page.goto(`/${MARCO}`);
  expect(await indicador(page, "Despesas do mês")).toBe(antes + 99999);

  await page.goto(`/${MARCO}/lancamentos`);
  const linha = page.getByRole("row", { name: /Erro de digita/ });
  await expect(linha).toBeVisible();
  await linha.getByRole("button", { name: /^Excluir/ }).click();
  await linha.getByRole("button", { name: /^Confirmar/ }).click();

  await expect(page.getByRole("row", { name: /Erro de digita/ })).toHaveCount(0);
  await page.goto(`/${MARCO}`);
  expect(await indicador(page, "Despesas do mês")).toBe(antes);
});

test("o primeiro toque em Excluir não exclui (AVUL-03, AC 6)", async ({ page }) => {
  await page.goto(`/${MARCO}/lancamentos`);
  await cadastrarAvulso(page, { descricao: "Almoço", valor: "32,50" });
  await page.keyboard.press("Escape");

  const linha = page.getByRole("row", { name: /Almoço/ });
  await linha.getByRole("button", { name: /^Excluir/ }).click();

  await expect(linha.getByRole("button", { name: /^Confirmar/ })).toBeVisible();
  await expect(linha).toBeVisible();
});

test("parcela de compra não oferece o controle de excluir (AVUL-03, AC 5)", async ({ page }) => {
  await page.goto(`/${MARCO}/lancamentos`);

  const compra = await abrirCadastroParcelado(page);
  await compra.getByLabel("Descrição", { exact: true }).fill("Compra parcelada A");
  await compra.getByLabel("Valor total (R$)").fill("300,00");
  await compra.getByLabel("Quantidade de parcelas").fill("3");
  await compra.getByRole("button", { name: "Cadastrar compra" }).click();
  await expect(page.getByRole("status")).toContainText("Compra parcelada A");
  await page.keyboard.press("Escape");

  const linha = linhaNoBloco(page, "Cartão de Crédito", "Compra parcelada A");
  await expect(linha).toBeVisible();
  await expect(linha.getByRole("button", { name: /^Excluir/ })).toHaveCount(0);
  /* O selo de pago continua lá: só a exclusão é que não se aplica. */
  await expect(linha.getByRole("button", { name: /Previsto/ })).toBeVisible();
});
