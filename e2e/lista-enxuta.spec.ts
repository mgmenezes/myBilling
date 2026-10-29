import { type Browser, expect, type Locator, type Page, test } from "@playwright/test";
import type { Pool } from "pg";
import {
  type CadastroBase,
  criarPoolDeTeste,
  limparDados,
  recriarBancoDeTeste,
  semearCadastroBase,
} from "@/infrastructure/db/testing/banco-de-teste";

/**
 * **A lista de Lançamentos enxuta, de ponta a ponta** (LST-01 a LST-05).
 *
 * Os chips recebem da página os totais de `resumoPorCategoria`, o cookie dos
 * blocos é lido no servidor e a tabela do Cartão depende da largura que o
 * navegador calcula: nenhuma dessas três coisas existe no jsdom. Aqui elas são
 * conferidas pela tela, com os números da Visão geral e o retângulo desenhado
 * (lições L-001 e L-014).
 *
 * **O mês é semeado uma vez.** Os percursos só leem e navegam: filtro e bloco
 * recolhido vivem na URL e no cookie de cada contexto, e nenhum percurso grava
 * no banco. Os fixos entram pelo banco, porque dez cadastros pelo formulário
 * custariam um minuto e o formulário já tem percurso em `recorrencias.spec.ts`;
 * os gastos e a compra entram pela interface, como nos outros e2e.
 *
 * Os valores são escolhidos pela conta, um total diferente por categoria, para
 * que a ordem dos chips seja uma só. Nomes genéricos (AD-009).
 */

const EMAIL_PERMITIDO = "pessoa-a@example.com";
const MARCO = "2026-03";
const NOME_LONGO = "Categoria Nove de nome comprido que não cabe";

/** Dez fixos de R$ 20,00 em Categoria Um: R$ 200,00, o maior total do mês. */
const FIXOS = 10;

/** Os gastos avulsos, um por categoria, do maior para o menor total. */
const GASTOS: ReadonlyArray<{
  readonly descricao: string;
  readonly valor: string;
  readonly categoria?: string;
  readonly meio: "Conta Corrente" | "Cartão Roxo";
}> = [
  { descricao: "Gasto C", valor: "70,00", categoria: "Categoria Três", meio: "Conta Corrente" },
  { descricao: "Gasto D", valor: "60,00", categoria: "Categoria Quatro", meio: "Conta Corrente" },
  { descricao: "Gasto E", valor: "50,00", categoria: "Categoria Cinco", meio: "Conta Corrente" },
  { descricao: "Gasto F", valor: "40,00", categoria: "Categoria Seis", meio: "Conta Corrente" },
  { descricao: "Gasto G", valor: "30,00", categoria: "Categoria Sete", meio: "Conta Corrente" },
  { descricao: "Gasto H", valor: "20,00", categoria: "Categoria Oito", meio: "Conta Corrente" },
  { descricao: "Gasto I", valor: "10,00", meio: "Conta Corrente" },
  /* No Cartão, com o nome longo escolhido: é a linha que mais alarga a tabela. */
  { descricao: "Gasto J", valor: "5,00", categoria: NOME_LONGO, meio: "Cartão Roxo" },
];

/** Os chips na ordem do maior gasto: os seis primeiros aparecem sem "+N". */
const SEIS_PRIMEIROS = [
  "Categoria Um · R$ 200,00",
  "Categoria Dois · R$ 150,00",
  "Categoria Três · R$ 70,00",
  "Categoria Quatro · R$ 60,00",
  "Categoria Cinco · R$ 50,00",
  "Categoria Seis · R$ 40,00",
];
const OS_OUTROS = [
  "Categoria Sete · R$ 30,00",
  "Categoria Oito · R$ 20,00",
  "Sem categoria · R$ 10,00",
  `${NOME_LONGO} · R$ 5,00`,
];

let pool: Pool;
let base: CadastroBase;

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }, testInfo) => {
  pool = criarPoolDeTeste();
  await recriarBancoDeTeste(pool);
  await limparDados(pool);
  base = await semearCadastroBase(pool);
  for (const nome of [
    "Categoria Dois",
    "Categoria Três",
    "Categoria Quatro",
    "Categoria Cinco",
    "Categoria Seis",
    "Categoria Sete",
    "Categoria Oito",
    NOME_LONGO,
  ]) {
    await pool.query("INSERT INTO categoria (nome) VALUES ($1)", [nome]);
  }
  await semearFixos();
  await semearPelaInterface(browser, testInfo.project.use.baseURL);
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

/** Fixos só de março, em Conta Corrente: a materialização os cria ao abrir o mês. */
async function semearFixos(): Promise<void> {
  for (let n = 1; n <= FIXOS; n += 1) {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO recorrencia (descricao, natureza, categoria_id, usuario_id, meio_pagamento_id,
         competencia_inicio, competencia_fim, dia_vencimento)
       VALUES ($1, 'DESPESA', $2, $3, $4, $5, $5, 10) RETURNING id`,
      [
        `Fixo ${String(n).padStart(2, "0")}`,
        base.categoriaId,
        base.usuarioId,
        base.contaId,
        `${MARCO}-01`,
      ],
    );
    await pool.query(
      "INSERT INTO recorrencia_versao (recorrencia_id, vigente_desde, valor_previsto_centavos) VALUES ($1, $2, 2000)",
      [rows[0]?.id, `${MARCO}-01`],
    );
  }
}

async function semearPelaInterface(browser: Browser, baseURL: string | undefined): Promise<void> {
  const contexto = await browser.newContext({ baseURL });
  const page = await contexto.newPage();
  await entrar(page, EMAIL_PERMITIDO);
  await page.goto(`/${MARCO}/lancamentos`);
  await cadastrarCompra(page);
  for (const gasto of GASTOS) {
    await cadastrarAvulso(page, gasto);
  }
  await contexto.close();
}

/** "Compra B": quatro parcelas de R$ 150,00, a primeira deste mês sendo a 2ª. */
async function cadastrarCompra(page: Page): Promise<void> {
  await page.getByRole("button", { name: "+ Novo lançamento" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByRole("tab", { name: "Parcelado" }).click();
  /* Escopo obrigatório: as duas abas ficam montadas, com campos homônimos. */
  const form = dialogo.getByRole("form", { name: "Nova compra" });
  await form.getByLabel("Descrição", { exact: true }).fill("Compra B");
  await form.getByRole("radio", { name: "Valor da parcela" }).check();
  await form.getByLabel("Valor da parcela (R$)").fill("150,00");
  await form.getByLabel("Quantidade de parcelas").fill("4");
  await form.getByLabel("Já estou na parcela").fill("2");
  await form.getByLabel("Categoria", { exact: true }).selectOption({ label: "Categoria Dois" });
  await form.getByRole("button", { name: "Cadastrar compra" }).click();
  await expect(form.getByRole("status")).toContainText("Compra B");
  await page.keyboard.press("Escape");
}

async function cadastrarAvulso(page: Page, dados: (typeof GASTOS)[number]): Promise<void> {
  await page.getByRole("button", { name: "+ Novo lançamento" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByRole("tab", { name: "Avulso" }).click();
  const form = dialogo.getByRole("form", { name: "Lançamento avulso" });
  await form.getByLabel("Descrição").fill(dados.descricao);
  await form.getByLabel("Valor (R$)").fill(dados.valor);
  await form.getByLabel("Meio de pagamento").selectOption({ label: dados.meio });
  /* Sempre escolhida: o formulário guarda a do cadastro anterior. */
  await form
    .getByLabel("Categoria", { exact: true })
    .selectOption({ label: dados.categoria ?? "Sem categoria" });
  await form.getByRole("button", { name: "Cadastrar lançamento" }).click();
  await expect(form.getByRole("status")).toContainText(dados.descricao);
  await page.keyboard.press("Escape");
}

/** O cartão de filtros. A barra compacta também é `search`, com outro nome. */
function cartaoDeFiltros(page: Page): Locator {
  return page.locator("#cartao-de-filtros");
}

function barraCompacta(page: Page): Locator {
  return page.getByRole("search", { name: "Busca e filtros ativos" });
}

/** Os chips de categoria, sem o "+N": só eles têm `aria-pressed`. */
function chips(page: Page): Locator {
  return cartaoDeFiltros(page)
    .getByRole("list", { name: "Categoria" })
    .locator("button[aria-pressed]");
}

function chip(page: Page, nome: string): Locator {
  return cartaoDeFiltros(page).getByRole("button", { name: nome, exact: true });
}

function linha(page: Page, descricao: string): Locator {
  return page.getByRole("row", { name: new RegExp(descricao) });
}

async function rolarAteOFim(page: Page): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
}

async function transbordoHorizontal(page: Page): Promise<number> {
  return page.evaluate(() =>
    Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
  );
}

test("o chip filtra a lista e mostra o mesmo total da barra na Visão geral, com outro filtro ou sem (LST-01, ACs 1, 2 e 5)", async ({
  page,
}) => {
  await page.goto(`/${MARCO}/lancamentos`);

  /* Um chip por categoria com gasto, do maior para o menor, no cartão. */
  await expect(chips(page)).toHaveText(SEIS_PRIMEIROS);
  /* No lugar do select "Categoria" do cartão; o do diálogo de cadastro fica. */
  await expect(cartaoDeFiltros(page).getByRole("combobox", { name: "Categoria" })).toHaveCount(0);

  await chip(page, "Categoria Dois · R$ 150,00").click();
  await expect(page).toHaveURL(/categoriaId=/);
  await expect(chip(page, "Categoria Dois · R$ 150,00")).toHaveAttribute("aria-pressed", "true");
  await expect(linha(page, "Compra B")).toBeVisible();
  await expect(linha(page, "Fixo 01")).toHaveCount(0);
  await expect(linha(page, "Gasto C")).toHaveCount(0);

  /* O total do chip é o número da barra de Categoria Dois na Visão geral. */
  await page.goto(`/${MARCO}`);
  const grafico = page.getByRole("list", {
    name: "Gastos por categoria, ordenados do maior para o menor",
  });
  await expect(grafico.getByRole("link", { name: /^Categoria Dois / })).toContainText("R$ 150,00");

  /* Com a busca ativa, o total dos chips não muda, e o chip mantém a busca. */
  await page.goto(`/${MARCO}/lancamentos?busca=Gasto`);
  await expect(chips(page)).toHaveText(SEIS_PRIMEIROS);
  await expect(linha(page, "Compra B")).toHaveCount(0);
  await chip(page, "Categoria Quatro · R$ 60,00").click();
  await expect(page).toHaveURL(/busca=Gasto/);
  await expect(page).toHaveURL(/categoriaId=/);
  await expect(linha(page, "Gasto D")).toBeVisible();
  await expect(linha(page, "Gasto C")).toHaveCount(0);

  /* Tocar no chip ativo tira só a categoria. */
  await chip(page, "Categoria Quatro · R$ 60,00").click();
  await expect(page).not.toHaveURL(/categoriaId=/);
  await expect(page).toHaveURL(/busca=Gasto/);
  await expect(linha(page, "Gasto C")).toBeVisible();
});

test('"+4 categorias" revela as outras na mesma coleção, e Sem categoria lista só o gasto sem categoria (LST-01, ACs 3, 4 e 9)', async ({
  page,
}) => {
  await page.goto(`/${MARCO}/lancamentos`);

  const mais = cartaoDeFiltros(page).getByRole("button", { name: "+4 categorias" });
  await expect(mais).toHaveAttribute("aria-expanded", "false");
  await expect(chips(page)).toHaveCount(6);

  await mais.click();
  await expect(
    cartaoDeFiltros(page).getByRole("button", { name: "Mostrar menos" }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(chips(page)).toHaveText([...SEIS_PRIMEIROS, ...OS_OUTROS]);
  /* Revelar não é cortar: todos os chips inteiros dentro do cartão. */
  const caixaDoCartao = await cartaoDeFiltros(page).boundingBox();
  for (const caixa of await Promise.all(
    (await chips(page).all()).map((umChip) => umChip.boundingBox()),
  )) {
    expect(caixa).not.toBeNull();
    expect(caixa?.x ?? -1).toBeGreaterThanOrEqual(caixaDoCartao?.x ?? Number.POSITIVE_INFINITY);
    expect((caixa?.x ?? 0) + (caixa?.width ?? 0)).toBeLessThanOrEqual(
      (caixaDoCartao?.x ?? 0) + (caixaDoCartao?.width ?? 0),
    );
  }

  await chip(page, "Sem categoria · R$ 10,00").click();
  await expect(page).toHaveURL(/categoriaId=sem-categoria/);
  await expect(linha(page, "Gasto I")).toBeVisible();
  await expect(linha(page, "Gasto H")).toHaveCount(0);
  await expect(linha(page, "Fixo 01")).toHaveCount(0);
});

test("recolher Fixos e recarregar mantém Fixos recolhido, com o resumo, já no HTML do servidor (LST-02, ACs 1 a 4)", async ({
  page,
}) => {
  await page.goto(`/${MARCO}/lancamentos`);

  const fixos = page.getByRole("region", { name: "Fixos" });
  const botao = fixos.getByRole("button", { name: "Fixos" });
  /* Dez de R$ 20,00, nenhum pago: os de março já venceram, e vencido é a pagar. */
  await expect(fixos).toContainText("10 · R$ 200,00 · 10 a pagar");
  await expect(botao).toHaveAttribute("aria-expanded", "true");
  await expect(linha(page, "Fixo 01")).toBeVisible();

  await botao.click();
  await expect(botao).toHaveAttribute("aria-expanded", "false");
  await expect(linha(page, "Fixo 01")).toBeHidden();

  await page.reload();
  await expect(botao).toHaveAttribute("aria-expanded", "false");
  await expect(linha(page, "Fixo 01")).toBeHidden();
  await expect(fixos).toContainText("10 · R$ 200,00 · 10 a pagar");
  /* Os outros blocos continuam abertos. */
  await expect(linha(page, "Compra B")).toBeVisible();

  /* O servidor já manda Fixos fechado: o bloco não abre e fecha diante da pessoa. */
  const html = await (await page.request.get(`/${MARCO}/lancamentos`)).text();
  expect(html).toMatch(/<div id="linhas-fixos" hidden="">/);
  expect(html).toMatch(/<div id="linhas-cartao">/);
});

test("rolar até o fim mostra a barra com o filtro ativo, o × tira o filtro e voltar ao topo esconde a barra (LST-03, ACs 1, 2 e 4)", async ({
  page,
}) => {
  await page.goto(`/${MARCO}/lancamentos`);
  await chip(page, "Categoria Um · R$ 200,00").click();
  await expect(page).toHaveURL(/categoriaId=/);
  await expect(linha(page, "Gasto C")).toHaveCount(0);

  /* Com o cartão na tela, nada de barra. */
  await expect(barraCompacta(page)).toHaveCount(0);

  await rolarAteOFim(page);
  const barra = barraCompacta(page);
  await expect(barra).toBeVisible();
  await expect(barra.getByLabel("Buscar por descrição")).toBeVisible();
  await expect(barra.getByRole("button", { name: "Filtros" })).toBeVisible();
  const tirar = barra.getByRole("button", { name: "Tirar o filtro Categoria Um" });
  await expect(tirar).toHaveText("Categoria Um ×");

  await tirar.click();
  await expect(page).not.toHaveURL(/categoriaId=/);
  await expect(linha(page, "Gasto C")).toHaveCount(1);

  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(barraCompacta(page)).toHaveCount(0);
});

test.describe("em 400 pixels", () => {
  test.use({ viewport: { width: 400, height: 900 } });

  test("a barra mostra dois filtros e +1, sem rolagem horizontal (LST-03, AC 7)", async ({
    page,
  }) => {
    await page.goto(
      `/${MARCO}/lancamentos?categoriaId=${base.categoriaId}&usuarioId=${base.usuarioId}&meioPagamentoId=${base.contaId}`,
    );
    await expect(linha(page, "Fixo 10")).toHaveCount(1);

    await rolarAteOFim(page);
    const barra = barraCompacta(page);
    await expect(barra).toBeVisible();
    await expect(
      barra.getByRole("button", { name: /^Tirar o filtro / }).filter({ visible: true }),
    ).toHaveCount(2);
    await expect(barra.getByText("+1", { exact: true })).toBeVisible();
    expect(await transbordoHorizontal(page)).toBe(0);
  });
});

/**
 * A coluna de conteúdo é a largura do cartão de filtros, que a ocupa inteira.
 * A tabela do Cartão terminar dentro dela é o que o dono pediu (LST-05, AC 3).
 */
for (const largura of [1024, 1280, 1440]) {
  test.describe(`em ${largura} pixels`, () => {
    test.use({ viewport: { width: largura, height: 900 } });

    test("a tabela do Cartão termina dentro da coluna de conteúdo, com a parcela sob a descrição (LST-05, ACs 1 e 3)", async ({
      page,
    }) => {
      await page.goto(`/${MARCO}/lancamentos`);

      const coluna = await cartaoDeFiltros(page).boundingBox();
      const tabela = await page
        .getByRole("region", { name: "Cartão de Crédito" })
        .getByRole("table")
        .boundingBox();
      if (coluna === null || tabela === null) {
        throw new Error("a coluna de conteúdo ou a tabela do Cartão não foi desenhada");
      }
      expect(tabela.x).toBeGreaterThanOrEqual(coluna.x - 0.5);
      expect(tabela.x + tabela.width).toBeLessThanOrEqual(coluna.x + coluna.width + 0.5);
      expect(await transbordoHorizontal(page)).toBe(0);

      /* A parcela é a segunda linha da célula da descrição, e não outra coluna. */
      const descricao = linha(page, "Compra B").getByRole("cell").first();
      await expect(descricao).toContainText("Compra B");
      await expect(descricao.getByText("2/4 · (faltam 2 depois desta)")).toBeVisible();
      /* "Sob": o topo da parcela não sobe acima do pé do texto da descrição. */
      const { peDaDescricao, topoDaParcela } = await descricao.evaluate((celula) => {
        const texto = document.createRange();
        texto.selectNodeContents(celula.firstChild as Node);
        return {
          peDaDescricao: texto.getBoundingClientRect().bottom,
          topoDaParcela: celula.lastElementChild?.getBoundingClientRect().top ?? -1,
        };
      });
      expect(topoDaParcela).toBeGreaterThanOrEqual(peDaDescricao - 1);
      await expect(
        page.getByRole("region", { name: "Cartão de Crédito" }).getByRole("columnheader"),
      ).toHaveText(["Descrição", "Categoria", "Data", "Situação", "Valor"]);
    });
  });
}

test("a barra de uma categoria na Visão geral abre a lista com o chip dela ativo, e Sem categoria abre sem-categoria (LST-04, ACs 1 e 2)", async ({
  page,
}) => {
  await page.goto(`/${MARCO}`);
  const grafico = page.getByRole("list", {
    name: "Gastos por categoria, ordenados do maior para o menor",
  });

  await grafico.getByRole("link", { name: /^Categoria Dois / }).click();
  await expect(page).toHaveURL(new RegExp(`/${MARCO}/lancamentos\\?categoriaId=[0-9a-f-]{36}$`));
  await expect(chip(page, "Categoria Dois · R$ 150,00")).toHaveAttribute("aria-pressed", "true");
  await expect(linha(page, "Compra B")).toBeVisible();
  await expect(linha(page, "Fixo 01")).toHaveCount(0);

  await page.goto(`/${MARCO}`);
  await grafico.getByRole("link", { name: /^Sem categoria / }).click();
  await expect(page).toHaveURL(new RegExp(`/${MARCO}/lancamentos\\?categoriaId=sem-categoria$`));
  /* O chip está além dos seis primeiros: a coleção chega aberta para mostrá-lo. */
  await expect(chip(page, "Sem categoria · R$ 10,00")).toHaveAttribute("aria-pressed", "true");
  await expect(linha(page, "Gasto I")).toBeVisible();
  await expect(linha(page, "Gasto H")).toHaveCount(0);
});
