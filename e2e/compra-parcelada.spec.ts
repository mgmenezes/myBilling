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

/**
 * Preenche e envia o formulário.
 *
 * O cadastro mora em `/AAAA-MM/lancamentos`, e não mais na visão geral: quem
 * abre o painel quer entender o mês, quem abre Lançamentos está em manutenção.
 * A asserção continua a mesma; só o endereço mudou.
 */
async function cadastrar(page: Page, compra: Compra): Promise<void> {
  if (!page.url().includes("/lancamentos")) {
    const competencia = new URL(page.url()).pathname.split("/")[1];
    await page.goto(`/${competencia}/lancamentos`);
  }
  await page.getByLabel("Descrição", { exact: true }).fill(compra.descricao);
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

/** A linha do bloco "Cartão de Crédito" daquela descrição, na área de Lançamentos. */
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
  await page.goto("/2026-03/lancamentos");

  // O preview mostra o rateio antes de gravar: o usuário confere o centavo.
  await page.getByLabel("Descrição", { exact: true }).fill("Compra parcelada A");
  await page.getByLabel("Valor total (R$)").fill("1.000,00");
  await page.getByLabel("Quantidade de parcelas").fill("3");
  const previa = page.getByRole("region", { name: "Previsão das parcelas" });
  await expect(previa.getByRole("listitem").nth(0)).toContainText("R$ 333,34");
  await expect(previa.getByRole("listitem").nth(1)).toContainText("R$ 333,33");
  await expect(previa.getByRole("listitem").nth(2)).toContainText("R$ 333,33");

  await page.getByRole("button", { name: "Cadastrar compra" }).click();
  await expect(page.getByRole("status")).toContainText("Compra parcelada A");

  // Março: parcela 1/3, já nesta mesma página.
  await expect(linhaDaParcela(page, "Compra parcelada A")).toContainText("1/3");
  await expect(linhaDaParcela(page, "Compra parcelada A")).toContainText("R$ 333,34");

  // Abril: **nenhuma ação além de navegar**. A parcela já está lá.
  await page.goto("/2026-04/lancamentos");
  await expect(linhaDaParcela(page, "Compra parcelada A")).toContainText("2/3");
  await expect(linhaDaParcela(page, "Compra parcelada A")).toContainText("R$ 333,33");

  // Maio: idem.
  await page.goto("/2026-05/lancamentos");
  await expect(linhaDaParcela(page, "Compra parcelada A")).toContainText("3/3");
  await expect(linhaDaParcela(page, "Compra parcelada A")).toContainText("R$ 333,33");

  // E acabou em maio: junho não tem parcela nenhuma desta compra.
  await page.goto("/2026-06/lancamentos");
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

  await page.goto("/2026-04/lancamentos");
  await expect(linhaDaParcela(page, "Compra parcelada B")).toContainText("9/10");
  await page.goto("/2026-05/lancamentos");
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

  await page.goto("/2027-01/lancamentos");
  await expect(linhaDaParcela(page, "Compra parcelada C")).toContainText("2/3");
  await expect(linhaDaParcela(page, "Compra parcelada C")).toContainText("R$ 100,00");

  await page.goto("/2027-02/lancamentos");
  await expect(linhaDaParcela(page, "Compra parcelada C")).toContainText("3/3");
  await expect(linhaDaParcela(page, "Compra parcelada C")).toContainText("R$ 100,00");
});

test("as duas visões nunca aparecem juntas (MOV-03, UI-01 AC 4)", async ({ page }) => {
  await page.goto("/2026-03");
  await cadastrar(page, {
    descricao: "Compra parcelada A",
    modo: "Valor total",
    valor: "1.000,00",
    qtdParcelas: "3",
  });

  await page.goto("/2026-03");
  const alternador = page.getByRole("navigation", { name: "Visão do mês" });
  await expect(alternador).toBeVisible();

  /*
   * Esta asserção é mais forte que a do desenho anterior. Antes os dois eixos
   * ficavam na tela ao mesmo tempo, em caixas separadas, e o teste checava que
   * uma não continha a outra. Agora só uma visão existe por vez, então a
   * ausência da outra é verificável de forma direta: se o rótulo do eixo caixa
   * não está no DOM, nenhuma composição pode somá-lo ao de competência.
   */
  await expect(page.getByText("Despesas do mês")).toBeVisible();
  await expect(page.getByText("Saldo previsto")).toBeVisible();
  await expect(page.getByText("Saiu da conta")).toHaveCount(0);
  await expect(page.getByText("Saldo do período")).toHaveCount(0);

  // A parcela de março aparece no indicador de despesas desta visão.
  await expect(page.getByRole("link", { name: /Despesas do mês/ })).toContainText("R$ 333,34");

  await alternador.getByRole("link", { name: "Movimentações" }).click();
  await expect(page.getByText("Saiu da conta")).toBeVisible();
  await expect(page.getByText("Saldo do período")).toBeVisible();
  await expect(page.getByText("Despesas do mês")).toHaveCount(0);
  await expect(page.getByText("Saldo previsto")).toHaveCount(0);

  // A compra foi assumida em março e ainda não foi paga: o eixo caixa está
  // zerado enquanto o de competência já contabiliza. A divergência é a
  // informação, e a tela a explica em vez de calculá-la.
  await expect(page.getByRole("link", { name: /Saiu da conta/ })).toContainText("R$ 0,00");

  await page.getByText("Qual é a diferença").click();
  await expect(page.getByText(/nunca soma nem subtrai um do outro/)).toBeVisible();
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

/**
 * O seletor de categoria **do formulário**. Existe um segundo com o mesmo
 * rótulo no bloco de filtros, logo acima, e sem escopo o Playwright acerta os
 * dois — o que é um lembrete útil de que os dois precisam receber a categoria
 * nova, cada um por seu caminho.
 */
function seletorDeCategoria(page: Page) {
  return page.getByRole("form", { name: "Nova compra" }).getByLabel("Categoria", { exact: true });
}

function seletorDeMeio(page: Page) {
  return page
    .getByRole("form", { name: "Nova compra" })
    .getByLabel("Meio de pagamento", { exact: true });
}

/**
 * **A segunda re-digitação da planilha.**
 *
 * Criar uma categoria na planilha obrigava a inseri-la à mão em cada aba de
 * mês. Aqui ela nasce uma vez e vale para todos, inclusive os que ainda não
 * chegaram — não porque exista código sincronizando mês a mês, mas porque
 * `categoria` não tem competência. Este teste prova o efeito, que é o que o
 * usuário percebe.
 */
test("criar uma categoria no formulário a torna disponível nos meses seguintes (DADO-02)", async ({
  page,
}) => {
  await page.goto("/2026-03/lancamentos");

  // Ela não existe antes: o seletor não a oferece.
  await expect(seletorDeCategoria(page)).not.toContainText("Mercado");

  await page.getByRole("button", { name: "+ nova" }).click();
  await page.getByLabel("Nome da nova categoria").fill("Mercado");
  await page.getByRole("button", { name: "Criar" }).click();

  // Criada e já selecionada, sem sair do formulário.
  await expect(seletorDeCategoria(page)).toHaveValue(/.+/);
  await expect(seletorDeCategoria(page)).toContainText("Mercado");

  await cadastrar(page, {
    descricao: "Compra com categoria nova",
    modo: "Valor total",
    valor: "300,00",
    qtdParcelas: "3",
  });

  // O mês seguinte: a parcela existe e a categoria continua oferecida,
  // sem ninguém ter cadastrado nada de novo.
  await page.goto("/2026-04/lancamentos");
  await expect(linhaDaParcela(page, "Compra com categoria nova")).toBeVisible();
  await expect(seletorDeCategoria(page)).toContainText("Mercado");

  // E um mês que ainda não tem lançamento nenhum também a oferece.
  await page.goto("/2026-11/lancamentos");
  await expect(seletorDeCategoria(page)).toContainText("Mercado");
});

test("criar uma categoria com nome já existente não duplica a lista", async ({ page }) => {
  await page.goto("/2026-03/lancamentos");

  await page.getByRole("button", { name: "+ nova" }).click();
  await page.getByLabel("Nome da nova categoria").fill("Mercado");
  await page.getByRole("button", { name: "Criar" }).click();
  await expect(seletorDeCategoria(page)).toContainText("Mercado");

  // De novo, com outra caixa: o `UNIQUE` do Postgres é sensível a caixa e
  // deixaria "mercado" entrar ao lado de "Mercado" se a action não olhasse.
  await page.getByRole("button", { name: "+ nova" }).click();
  await page.getByLabel("Nome da nova categoria").fill("MERCADO");
  await page.getByRole("button", { name: "Criar" }).click();

  // Escopado ao formulário de propósito: `next dev` injeta o próprio overlay
  // de erro, e um `getByRole("alert")` solto na página acaba testando o
  // framework em vez do app.
  await expect(page.getByRole("form", { name: "Nova compra" }).getByRole("alert")).toHaveCount(0);
  await expect(seletorDeCategoria(page).getByRole("option", { name: /^Mercado$/ })).toHaveCount(1);
});

/**
 * Meio de pagamento fecha a outra metade da re-digitação: cadastrar o cartão
 * uma vez e usá-lo em qualquer mês. O que este teste prova, além da criação, é
 * que a compra **grava de verdade** no meio recém-criado — sem isso a feature
 * seria só um `<option>` a mais na lista.
 */
test("criar um cartão no formulário e cadastrar uma compra nele (CART-02)", async ({ page }) => {
  await page.goto("/2026-03/lancamentos");

  await expect(seletorDeMeio(page)).not.toContainText("Cartão Novo");

  await page.getByRole("button", { name: "+ novo" }).click();
  await page.getByLabel("Nome do novo meio de pagamento").fill("Cartão Novo");
  await page.getByLabel("Dia de fechamento").fill("25");
  await page.getByLabel("Dia de vencimento").fill("5");
  await page.getByRole("button", { name: "Criar" }).click();

  // Criado e já selecionado, sem sair do formulário.
  await expect(seletorDeMeio(page)).toContainText("Cartão Novo");
  await expect(seletorDeMeio(page)).toHaveValue(/.+/);

  await cadastrar(page, {
    descricao: "Compra no cartão novo",
    modo: "Valor total",
    valor: "300,00",
    qtdParcelas: "3",
  });

  // A parcela do mês seguinte existe, e o cartão continua oferecido lá.
  await page.goto("/2026-04/lancamentos");
  await expect(linhaDaParcela(page, "Compra no cartão novo")).toBeVisible();
  await expect(seletorDeMeio(page)).toContainText("Cartão Novo");
});

test("conta corrente e rótulo não pedem dia de ciclo", async ({ page }) => {
  await page.goto("/2026-03/lancamentos");

  await page.getByRole("button", { name: "+ novo" }).click();
  await expect(page.getByLabel("Dia de fechamento")).toBeVisible();

  await page.getByLabel("Tipo").selectOption("ROTULO");
  await expect(page.getByLabel("Dia de fechamento")).toHaveCount(0);
  await expect(page.getByLabel("Dia de vencimento")).toHaveCount(0);

  await page.getByLabel("Nome do novo meio de pagamento").fill("Seguro do carro");
  await page.getByRole("button", { name: "Criar" }).click();

  await expect(seletorDeMeio(page)).toContainText("Seguro do carro");
});

test("nome de meio já existente vira erro, e não um segundo item na lista", async ({ page }) => {
  await page.goto("/2026-03/lancamentos");

  await page.getByRole("button", { name: "+ novo" }).click();
  await page.getByLabel("Nome do novo meio de pagamento").fill("Conta Nova");
  await page.getByLabel("Tipo").selectOption("CONTA_CORRENTE");
  await page.getByRole("button", { name: "Criar" }).click();
  await expect(seletorDeMeio(page)).toContainText("Conta Nova");

  await page.getByRole("button", { name: "+ novo" }).click();
  await page.getByLabel("Nome do novo meio de pagamento").fill("conta nova");
  await page.getByLabel("Tipo").selectOption("CONTA_CORRENTE");
  await page.getByRole("button", { name: "Criar" }).click();

  await expect(page.getByRole("form", { name: "Nova compra" }).getByRole("alert")).toContainText(
    "Já existe um meio de pagamento com esse nome.",
  );
  await expect(seletorDeMeio(page).getByRole("option", { name: /^Conta Nova$/ })).toHaveCount(1);
});
