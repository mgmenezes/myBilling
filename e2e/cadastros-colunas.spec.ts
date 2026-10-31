import { expect, type Locator, type Page, type Request as Pedido, test } from "@playwright/test";
import type { Pool } from "pg";
import {
  type CadastroBase,
  criarPoolDeTeste,
  limparDados,
  recriarBancoDeTeste,
  semearCadastroBase,
} from "@/infrastructure/db/testing/banco-de-teste";

/**
 * **Cadastros em abas, com o item aberto no painel, de ponta a ponta**
 * (CADCOL-01 a CADCOL-11).
 *
 * Março de 2026, semeado pelo banco antes de cada teste sobre
 * `semearCadastroBase` ("Pessoa A", "Cartão Roxo" com fechamento 25 e
 * vencimento 5, "Conta Corrente" e "Categoria Um"). Nenhum fixo tem ocorrência
 * gravada antes de o teste abrir a tela:
 * - Fixo A: despesa, Conta Corrente, R$ 100,00, desde janeiro, sem fim, Categoria Um;
 * - Fixo B: despesa, Conta Corrente, R$ 50,00, de janeiro a fevereiro, Categoria Um;
 * - Fixo C: despesa, Cartão Roxo, R$ 70,00, desde abril, Categoria Um;
 * - Entrada A: receita, Conta Corrente, R$ 1.000,00, desde janeiro, sem categoria;
 * - Gasto A: avulso de março, Cartão Roxo, R$ 20,00, Categoria Um;
 * - Gasto B: avulso de março cancelado, Conta Corrente, R$ 30,00, Categoria Um;
 * - Gasto C: avulso de abril, Conta Corrente, R$ 40,00, Categoria Um.
 *
 * Mais "Categoria Dois", sem uso, "Categoria Antiga", arquivada, e os meios
 * "conta Azul" e "Rótulo Âmbar", sem uso.
 *
 * Em março, "Categoria Um" tem 1 fixo (A) e 2 lançamentos (a ocorrência de A
 * e o Gasto A). B termina em fevereiro e C começa em abril, colados no mês
 * aberto dos dois lados; o Gasto B está cancelado e o Gasto C é de abril. A
 * ocorrência de A só existe se a tela materializar antes de contar.
 *
 * Layout se prova no navegador, com a caixa medida e o estilo computado,
 * depois de a página estar pronta. Nomes genéricos e valores redondos
 * (AD-009).
 */

const EMAIL_PERMITIDO = "pessoa-a@example.com";
const MARCO = "2026-03";
const CATEGORIAS = `/${MARCO}/cadastros/categorias`;
/** Cinquenta e nove caracteres, com a cor de texto mais larga: o que mais aperta a linha (L-045). */
const NOME_LONGO = "Categoria com nome longo de propósito, para apertar a linha";
const DICA = "Escolha uma categoria na lista para trocar a cor, renomear e ver onde ela aparece.";

let pool: Pool;
let base: CadastroBase;
let ids: { readonly dois: string; readonly antiga: string; readonly fixoA: string };

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
  base = await semearCadastroBase(pool);
  ids = await semearMarco();
  await entrar(page, EMAIL_PERMITIDO);
});

async function entrar(page: Page, email: string): Promise<void> {
  const csrf = await page.request.get("/api/auth/csrf");
  const { csrfToken } = (await csrf.json()) as { csrfToken: string };
  await page.request.post("/api/auth/callback/provedor-de-teste", {
    form: { csrfToken, email, callbackUrl: "/" },
  });
}

async function primeiroId(sql: string, valores: unknown[]): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(sql, valores);
  const id = rows[0]?.id;
  if (id === undefined) {
    throw new Error(`INSERT não devolveu id: ${sql}`);
  }
  return id;
}

async function inserirCategoria(nome: string, cor: string | null = null): Promise<string> {
  return primeiroId("INSERT INTO categoria (nome, cor) VALUES ($1, $2) RETURNING id", [nome, cor]);
}

async function inserirFixo(dados: {
  readonly descricao: string;
  readonly natureza: "DESPESA" | "RECEITA";
  readonly categoriaId: string | null;
  readonly meioId: string;
  readonly inicio: string;
  readonly fim: string | null;
  readonly centavos: number;
}): Promise<string> {
  const id = await primeiroId(
    `INSERT INTO recorrencia (descricao, natureza, categoria_id, usuario_id, meio_pagamento_id,
       competencia_inicio, competencia_fim, dia_vencimento)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 10) RETURNING id`,
    [
      dados.descricao,
      dados.natureza,
      dados.categoriaId,
      base.usuarioId,
      dados.meioId,
      `${dados.inicio}-01`,
      dados.fim === null ? null : `${dados.fim}-01`,
    ],
  );
  await pool.query(
    "INSERT INTO recorrencia_versao (recorrencia_id, vigente_desde, valor_previsto_centavos) VALUES ($1, $2, $3)",
    [id, `${dados.inicio}-01`, dados.centavos],
  );
  return id;
}

async function inserirGasto(dados: {
  readonly descricao: string;
  readonly meioId: string;
  readonly competencia: string;
  readonly centavos: number;
  readonly cancelado?: boolean;
}): Promise<void> {
  await pool.query(
    `INSERT INTO movimento (natureza, origem, descricao, competencia, data_evento, valor_centavos,
       usuario_id, meio_pagamento_id, categoria_id, cancelado_em)
     VALUES ('DESPESA', 'AVULSO', $1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      dados.descricao,
      `${dados.competencia}-01`,
      `${dados.competencia}-10`,
      dados.centavos,
      base.usuarioId,
      dados.meioId,
      base.categoriaId,
      dados.cancelado === true ? new Date() : null,
    ],
  );
}

async function semearMarco(): Promise<typeof ids> {
  const dois = await inserirCategoria("Categoria Dois");
  const antiga = await inserirCategoria("Categoria Antiga");
  await pool.query("UPDATE categoria SET arquivada_em = now() WHERE id = $1", [antiga]);
  await pool.query(
    `INSERT INTO meio_pagamento (nome, tipo, gera_fatura) VALUES
       ('conta Azul', 'CONTA_CORRENTE', false), ('Rótulo Âmbar', 'ROTULO', false)`,
  );
  const fixoA = await inserirFixo({
    descricao: "Fixo A",
    natureza: "DESPESA",
    categoriaId: base.categoriaId,
    meioId: base.contaId,
    inicio: "2026-01",
    fim: null,
    centavos: 10000,
  });
  await inserirFixo({
    descricao: "Fixo B",
    natureza: "DESPESA",
    categoriaId: base.categoriaId,
    meioId: base.contaId,
    inicio: "2026-01",
    fim: "2026-02",
    centavos: 5000,
  });
  await inserirFixo({
    descricao: "Fixo C",
    natureza: "DESPESA",
    categoriaId: base.categoriaId,
    meioId: base.cartaoId,
    inicio: "2026-04",
    fim: null,
    centavos: 7000,
  });
  await inserirFixo({
    descricao: "Entrada A",
    natureza: "RECEITA",
    categoriaId: null,
    meioId: base.contaId,
    inicio: "2026-01",
    fim: null,
    centavos: 100000,
  });
  await inserirGasto({
    descricao: "Gasto A",
    meioId: base.cartaoId,
    competencia: MARCO,
    centavos: 2000,
  });
  await inserirGasto({
    descricao: "Gasto B",
    meioId: base.contaId,
    competencia: MARCO,
    centavos: 3000,
    cancelado: true,
  });
  await inserirGasto({
    descricao: "Gasto C",
    meioId: base.contaId,
    competencia: "2026-04",
    centavos: 4000,
  });
  return { dois, antiga, fixoA };
}

/** Categorias a mais, para a tabela passar da altura da janela. */
async function semearCategoriasAMais(): Promise<void> {
  for (let indice = 1; indice <= 12; indice++) {
    await inserirCategoria(`Categoria Extra ${String(indice).padStart(2, "0")}`);
  }
}

async function abrir(page: Page, caminho: string): Promise<void> {
  await page.goto(caminho);
  await expect(page.getByRole("heading", { level: 1, name: "Cadastros" })).toBeVisible();
  await expect(tabela(page)).toBeVisible();
}

function navegacao(page: Page, area: string): Locator {
  return page
    .getByRole("navigation", { name: "Áreas do myBilling" })
    .getByRole("link", { name: area, exact: true });
}

function abas(page: Page): Locator {
  return page.getByRole("navigation", { name: "Cadastros" });
}

function aviso(page: Page): Locator {
  return page.locator('[aria-live="polite"]').getByRole("status");
}

function tabela(page: Page): Locator {
  return page.getByRole("table", { name: "Categorias" });
}

function botaoDaLinha(page: Page, nome: string): Locator {
  return tabela(page).getByRole("button", { name: nome, exact: true });
}

/** A linha de uma categoria; o `has` é procurado dentro de cada linha. */
function linha(page: Page, nome: string): Locator {
  return tabela(page)
    .getByRole("row")
    .filter({ has: page.getByRole("button", { name: nome, exact: true }) });
}

/** As células da linha: Categoria, Cor, Fixos e Lançamentos. */
function celula(page: Page, nome: string, indice: number): Locator {
  return linha(page, nome).getByRole("cell").nth(indice);
}

function pillDaLinha(page: Page, nome: string): Locator {
  return botaoDaLinha(page, nome).locator(":scope > span");
}

function painel(page: Page): Locator {
  return page.getByRole("complementary", { name: "Painel da categoria" });
}

function tituloDoPainel(page: Page): Locator {
  return painel(page).getByRole("heading", { level: 2 });
}

function botaoNova(page: Page): Locator {
  return page.getByRole("button", { name: "+ Nova categoria", exact: true });
}

async function caixa(
  alvo: Locator,
): Promise<{ x: number; y: number; width: number; height: number }> {
  const medida = await alvo.boundingBox();
  if (medida === null) {
    throw new Error("o elemento não está na tela");
  }
  return medida;
}

async function fundo(alvo: Locator): Promise<string> {
  return alvo.evaluate((elemento) => getComputedStyle(elemento).backgroundColor);
}

/** A cor que o navegador resolve para um token, no tema em vigor. */
async function corDoToken(page: Page, token: string): Promise<string> {
  return page.evaluate((nome) => {
    const amostra = document.createElement("div");
    amostra.style.backgroundColor = `var(${nome})`;
    document.body.append(amostra);
    const cor = getComputedStyle(amostra).backgroundColor;
    amostra.remove();
    return cor;
  }, token);
}

async function transbordoHorizontal(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

function parametro(page: Page, nome: string): string | null {
  return new URL(page.url()).searchParams.get(nome);
}

async function doisQuadros(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((pronto) =>
        requestAnimationFrame(() => requestAnimationFrame(() => pronto())),
      ),
  );
}

async function medirAlvo(alvo: Locator, nome: string): Promise<void> {
  const medida = await caixa(alvo);
  expect(medida.width, `largura de ${nome}`).toBeGreaterThanOrEqual(44);
  expect(medida.height, `altura de ${nome}`).toBeGreaterThanOrEqual(44);
}

/* ------------------------------------------------------------------------
 * A composição: o uso no mês, a materialização e a concordância com
 * Lançamentos (CADCOL-03; L-001, L-014).
 * ---------------------------------------------------------------------- */

test("abrindo Categorias de março antes de qualquer outra tela, as contagens vêm das ocorrências criadas ao abrir, e Ver em Lançamentos mostra o mesmo número (CADCOL-02, AC 5; CADCOL-03, ACs 1 a 5; CADCOL-04, ACs 11 e 12)", async ({
  page,
}) => {
  /* Nenhuma tela abriu março: a ocorrência de A em março ainda não existe. A
     entrada no app abre o mês corrente, que é outro. */
  const antes = await pool.query(
    "SELECT 1 FROM movimento WHERE recorrencia_id = $1 AND competencia = $2",
    [ids.fixoA, `${MARCO}-01`],
  );
  expect(antes.rowCount).toBe(0);
  await page.setViewportSize({ width: 1280, height: 900 });

  await abrir(page, CATEGORIAS);

  await expect(celula(page, "Categoria Um", 2)).toHaveText("1 fixo");
  await expect(celula(page, "Categoria Um", 3)).toHaveText("2 lançamentos");
  await expect(celula(page, "Categoria Dois", 2)).toHaveText("0 fixos");
  await expect(celula(page, "Categoria Dois", 3)).toHaveText("0 lançamentos");

  await botaoDaLinha(page, "Categoria Um").click();
  const secao = painel(page).getByRole("region", { name: "Onde ela aparece" });
  await expect(secao.locator("dd")).toHaveText(["1", "2"]);
  await secao.getByRole("link", { name: "Ver em Lançamentos" }).click();

  await expect(page).toHaveURL(
    new RegExp(`/${MARCO}/lancamentos\\?categoriaId=${base.categoriaId}$`),
  );
  await expect(page.locator("#cartao-de-filtros").getByRole("status")).toHaveText(
    /^2 lançamentos com 1 filtro\./,
  );
});

/* ------------------------------------------------------------------------
 * As abas (CADCOL-01).
 * ---------------------------------------------------------------------- */

test('o item "Cadastros" abre a aba Categorias, com o título "Cadastros", a aba marcada e o item ativo (CADCOL-01, ACs 1 a 5)', async ({
  page,
}) => {
  await page.goto(`/${MARCO}`);
  await navegacao(page, "Cadastros").click();

  await expect(page).toHaveURL(new RegExp(`${CATEGORIAS}$`));
  await expect(page.getByRole("heading", { level: 1, name: "Cadastros" })).toBeVisible();
  await expect(abas(page).getByRole("link", { name: "Categorias" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(abas(page).getByRole("link", { name: "Meios de pagamento" })).not.toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(abas(page).getByRole("link", { name: "Meios de pagamento" })).toHaveAttribute(
    "href",
    `/${MARCO}/cadastros/meios-de-pagamento`,
  );
  await expect(navegacao(page, "Cadastros")).toHaveAttribute("aria-current", "page");
  await expect(navegacao(page, "Visão geral")).not.toHaveAttribute("aria-current", "page");
});

/* ------------------------------------------------------------------------
 * Criar pelo painel (CADCOL-05).
 * ---------------------------------------------------------------------- */

test("criar pelo painel: a nova abre nele, com a Automática marcada; o nome de uma ativa abre a existente; o de uma arquivada a reativa (CADCOL-05, ACs 2 a 4)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await abrir(page, CATEGORIAS);

  async function criar(nome: string): Promise<void> {
    await botaoNova(page).click();
    await expect(tituloDoPainel(page)).toHaveText("Nova categoria");
    await painel(page).getByRole("textbox", { name: "Nome" }).fill(nome);
    await painel(page).getByRole("button", { name: "Criar categoria" }).click();
  }

  await criar("Categoria Nova");

  await expect(aviso(page)).toHaveText("Categoria criada.");
  await expect(aviso(page)).toBeInViewport();
  await expect(tituloDoPainel(page)).toHaveText("Categoria Nova");
  await expect(botaoDaLinha(page, "Categoria Nova")).toBeVisible();
  /* "Categoria Nova" é verde pela automática. */
  await expect(
    painel(page)
      .getByRole("group", { name: "Cor de Categoria Nova" })
      .getByRole("radio", { name: "Automática (Verde)" }),
  ).toBeChecked();
  const nova = await pool.query<{ id: string }>("SELECT id FROM categoria WHERE nome = $1", [
    "Categoria Nova",
  ]);
  await expect.poll(() => parametro(page, "categoria")).toBe(nova.rows[0]?.id);

  await criar("categoria um");

  await expect(aviso(page)).toHaveText("Essa categoria já existia.");
  await expect(tituloDoPainel(page)).toHaveText("Categoria Um");
  await expect(tabela(page).getByRole("button", { name: /^categoria um$/i })).toHaveCount(1);

  await criar("Categoria Antiga");

  await expect(aviso(page)).toHaveText("Categoria reativada.");
  await expect(tituloDoPainel(page)).toHaveText("Categoria Antiga");
  await expect(botaoDaLinha(page, "Categoria Antiga")).toBeVisible();
  await expect.poll(() => parametro(page, "categoria")).toBe(ids.antiga);
});

/* ------------------------------------------------------------------------
 * O endereço (CADCOL-11) e o teclado (CADCOL-10).
 * ---------------------------------------------------------------------- */

test("abrir põe `?categoria=<id>` sem recarregar e sem entrada no histórico; recarregar mostra a mesma aberta; um id inexistente deixa o painel fechado (CADCOL-11, ACs 1 a 3)", async ({
  page,
}) => {
  await abrir(page, CATEGORIAS);
  /* Um recarregamento apagaria o marcador. */
  await page.evaluate(() => {
    (window as unknown as { marcador?: string }).marcador = "sem recarregar";
  });
  const entradasNoHistorico = await page.evaluate(() => window.history.length);

  await botaoDaLinha(page, "Categoria Um").click();

  await expect.poll(() => parametro(page, "categoria")).toBe(base.categoriaId);
  expect(await page.evaluate(() => (window as unknown as { marcador?: string }).marcador)).toBe(
    "sem recarregar",
  );
  expect(await page.evaluate(() => window.history.length)).toBe(entradasNoHistorico);

  await page.reload();
  await expect(tituloDoPainel(page)).toHaveText("Categoria Um");

  await abrir(page, `${CATEGORIAS}?categoria=00000000-0000-4000-8000-000000000000`);
  await expect(painel(page)).toHaveCount(0);
  /* Dentro do `main`: o anunciador de rota do Next é um `alert` vazio fora dele. */
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
});

test("pelo teclado: Tab até a linha, Enter abre com o foco no título; Escape fecha, devolve o foco e tira o parâmetro; espaço também abre (CADCOL-10, ACs 1 a 4)", async ({
  page,
}) => {
  await abrir(page, CATEGORIAS);
  await botaoDaLinha(page, "Categoria Dois").focus();

  await page.keyboard.press("Tab");
  await expect(botaoDaLinha(page, "Categoria Um")).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(tituloDoPainel(page)).toHaveText("Categoria Um");
  await expect(tituloDoPainel(page)).toBeFocused();
  await expect.poll(() => parametro(page, "categoria")).toBe(base.categoriaId);

  await page.keyboard.press("Escape");

  await expect(painel(page)).toHaveCount(0);
  await expect(botaoDaLinha(page, "Categoria Um")).toBeFocused();
  await expect.poll(() => parametro(page, "categoria")).toBeNull();

  await page.keyboard.press("Shift+Tab");
  await expect(botaoDaLinha(page, "Categoria Dois")).toBeFocused();
  await page.keyboard.press(" ");
  await expect(tituloDoPainel(page)).toHaveText("Categoria Dois");
  await expect(tituloDoPainel(page)).toBeFocused();
});

/*
 * A corrida do endereço (L-058). Segura cada leitura de página (`_rsc`) por
 * 600 ms, como numa rede lenta: o servidor local responde antes do gesto
 * seguinte do Playwright, e sem o atraso a corrida não aconteceria no teste.
 */
async function redeLenta(page: Page): Promise<void> {
  await page.route(/_rsc=/, async (rota) => {
    await new Promise((pronto) => setTimeout(pronto, 600));
    await rota.continue();
  });
}

/** Acompanha as leituras de página (`_rsc`) pedidas daqui em diante. */
function vigiarLeituras(page: Page): { terminar: () => Promise<void> } {
  const pendentes = new Set<Pedido>();
  let vistas = 0;
  page.on("request", (pedido) => {
    if (pedido.url().includes("_rsc=")) {
      pendentes.add(pedido);
      vistas += 1;
    }
  });
  const fim = (pedido: Pedido) => {
    pendentes.delete(pedido);
  };
  page.on("requestfinished", fim);
  page.on("requestfailed", fim);
  return {
    /** Espera ao menos uma leitura, todas terminarem, e mais dois quadros para o commit. */
    terminar: async () => {
      await expect.poll(() => vistas).toBeGreaterThan(0);
      await expect.poll(() => pendentes.size).toBe(0);
      await doisQuadros(page);
    },
  };
}

test("abrir e logo fechar com Escape, sem esperar a URL, termina sem `?categoria=` (CADCOL-11, AC 4)", async ({
  page,
}) => {
  await abrir(page, CATEGORIAS);
  await redeLenta(page);
  const leituras = vigiarLeituras(page);

  await botaoDaLinha(page, "Categoria Um").click();
  await page.keyboard.press("Escape");

  await leituras.terminar();
  await expect(botaoDaLinha(page, "Categoria Um")).toHaveAttribute("aria-expanded", "false");
  expect(parametro(page, "categoria")).toBeNull();
});

test("com a aberta no endereço, fechar e logo reabrir, sem esperar a URL, termina com ela (CADCOL-11, AC 1)", async ({
  page,
}) => {
  await abrir(page, `${CATEGORIAS}?categoria=${base.categoriaId}`);
  await expect(tituloDoPainel(page)).toHaveText("Categoria Um");
  await tituloDoPainel(page).focus();
  await redeLenta(page);
  const leituras = vigiarLeituras(page);

  await page.keyboard.press("Escape");
  await botaoDaLinha(page, "Categoria Um").click();

  await leituras.terminar();
  await expect(tituloDoPainel(page)).toHaveText("Categoria Um");
  expect(parametro(page, "categoria")).toBe(base.categoriaId);
});

/* ------------------------------------------------------------------------
 * Cor e nome no painel, com a confirmação à vista (CADCOL-04, ACs 4 a 6;
 * L-057).
 * ---------------------------------------------------------------------- */

for (const janela of [
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
]) {
  test(`em ${janela.width} × ${janela.height}, trocar a cor e renomear no painel: a confirmação fica à vista, a pill da linha muda e o painel continua na categoria (CADCOL-04, ACs 4 a 6)`, async ({
    page,
  }) => {
    await page.setViewportSize(janela);
    await abrir(page, CATEGORIAS);
    await botaoDaLinha(page, "Categoria Um").click();

    await painel(page)
      .getByRole("group", { name: "Cor de Categoria Um" })
      .getByText("Verde", { exact: true })
      .click();

    await expect(aviso(page)).toHaveText("Cor trocada.");
    await expect(aviso(page)).toBeInViewport();
    const verde = await corDoToken(page, "--cat-verde-fundo");
    await expect.poll(() => fundo(pillDaLinha(page, "Categoria Um"))).toBe(verde);

    await painel(page).getByRole("textbox", { name: "Nome" }).fill("Categoria Dez");
    await painel(page).getByRole("button", { name: "Salvar" }).click();

    await expect(aviso(page)).toHaveText("Categoria renomeada.");
    await expect(aviso(page)).toBeInViewport();
    await expect(tituloDoPainel(page)).toHaveText("Categoria Dez");
    /* "Categoria Dez" vem antes de "Categoria Dois" na ordem do português. */
    await expect(tabela(page).getByRole("button")).toHaveText(["Categoria Dez", "Categoria Dois"]);
    await expect(botaoDaLinha(page, "Categoria Dez")).toHaveAttribute("aria-expanded", "true");
    expect(await fundo(pillDaLinha(page, "Categoria Dez"))).toBe(verde);
  });
}

/* ------------------------------------------------------------------------
 * Abaixo de 1.536 px: uma coluna só (CADCOL-09, ACs 5 e 6; CADCOL-10, AC 5;
 * CADCOL-04, AC 13; CADCOL-02, AC 7).
 * ---------------------------------------------------------------------- */

test("em 1.280 px, sem nada aberto não há painel; aberto, ele fica entre as abas e a tabela (CADCOL-09, ACs 5 e 6)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await abrir(page, CATEGORIAS);
  await expect(painel(page)).toHaveCount(0);
  await expect(page.getByText(DICA)).toBeHidden();

  await botaoDaLinha(page, "Categoria Um").click();
  await expect(tituloDoPainel(page)).toHaveText("Categoria Um");

  const caixaDasAbas = await caixa(abas(page));
  const caixaDoPainel = await caixa(painel(page));
  const caixaDaTabela = await caixa(tabela(page));
  expect(caixaDoPainel.y).toBeGreaterThanOrEqual(caixaDasAbas.y + caixaDasAbas.height);
  expect(caixaDaTabela.y).toBeGreaterThanOrEqual(caixaDoPainel.y + caixaDoPainel.height);
});

test("em 1.280 px, abrir a última linha, com a página rolada, traz o título do painel para dentro da janela (CADCOL-10, AC 5)", async ({
  page,
}) => {
  await semearCategoriasAMais();
  await page.setViewportSize({ width: 1280, height: 420 });
  await abrir(page, CATEGORIAS);
  const ultima = botaoDaLinha(page, "Categoria Um");
  await ultima.scrollIntoViewIfNeeded();
  /* O lugar do painel, logo abaixo das abas, está fora da janela. */
  await expect(abas(page)).not.toBeInViewport();

  await ultima.click();

  await expect(tituloDoPainel(page)).toHaveText("Categoria Um");
  await expect(tituloDoPainel(page)).toBeInViewport();
});

test("em 1.280 px, a linha aberta tem o fundo diferente de todas as outras (CADCOL-04, AC 13)", async ({
  page,
}) => {
  await semearCategoriasAMais();
  await page.setViewportSize({ width: 1280, height: 900 });
  await abrir(page, CATEGORIAS);
  await botaoDaLinha(page, "Categoria Dois").click();
  await expect(tituloDoPainel(page)).toHaveText("Categoria Dois");
  await page.mouse.move(0, 0);
  await doisQuadros(page);

  const fundos = await tabela(page)
    .locator("tbody tr")
    .evaluateAll((linhas) =>
      linhas.map((tr) => ({
        nome: tr.querySelector("button")?.textContent ?? "",
        fundo: getComputedStyle(tr).backgroundColor,
      })),
    );
  const aberta = fundos.find(({ nome }) => nome === "Categoria Dois");
  const outras = fundos.filter(({ nome }) => nome !== "Categoria Dois");
  expect(outras).toHaveLength(13);
  for (const outra of outras) {
    expect(outra.fundo, outra.nome).not.toBe(aberta?.fundo);
  }
});

test("em 1.280 px, com ponteiro fino, toda linha da tabela mede até 48 px, inclusive a de nome longo (CADCOL-02, AC 7)", async ({
  page,
}) => {
  await semearCategoriasAMais();
  await inserirCategoria(NOME_LONGO, "verde-agua");
  await page.setViewportSize({ width: 1280, height: 900 });
  await abrir(page, CATEGORIAS);
  expect(await page.evaluate(() => window.matchMedia("(pointer: fine)").matches)).toBe(true);

  const alturas = await tabela(page)
    .locator("tbody tr")
    .evaluateAll((linhas) =>
      linhas.map((tr) => ({
        nome: tr.querySelector("button")?.textContent ?? "",
        altura: tr.getBoundingClientRect().height,
      })),
    );
  /* Categoria Um, Dois, as doze a mais e a de nome longo: toda linha. */
  expect(alturas).toHaveLength(15);
  expect(alturas.map(({ nome }) => nome)).toContain(NOME_LONGO);
  for (const { nome, altura } of alturas) {
    expect(altura, nome).toBeLessThanOrEqual(48);
  }
});

/* ------------------------------------------------------------------------
 * O limiar de 768 px, dos dois lados (CADCOL-02, AC 8; CADCOL-10, AC 6;
 * L-029), e o ponteiro grosso acima dele (L-044).
 * ---------------------------------------------------------------------- */

test("em 767 px, nenhum cabeçalho à vista, o nome de cada contagem escrito e o botão de cada linha com 44 px; em 768 px, os cabeçalhos à vista, o nome só para leitor de tela e o botão mais baixo (CADCOL-02, AC 8; CADCOL-10, AC 6)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 767, height: 900 });
  await abrir(page, CATEGORIAS);
  await expect(tabela(page).getByRole("columnheader")).toHaveCount(0);
  for (const nome of ["Categoria Dois", "Categoria Um"]) {
    expect((await caixa(botaoDaLinha(page, nome))).height, nome).toBeGreaterThanOrEqual(44);
  }
  const nomeDaContagem = celula(page, "Categoria Um", 2).locator("span").last();
  expect((await caixa(nomeDaContagem)).width).toBeGreaterThan(10);

  await page.setViewportSize({ width: 768, height: 900 });
  await expect(tabela(page).getByRole("columnheader")).toHaveText([
    "Categoria",
    "Cor",
    "Fixos em Março",
    "Lançamentos em Março",
  ]);
  for (const nome of ["Categoria Dois", "Categoria Um"]) {
    expect((await caixa(botaoDaLinha(page, nome))).height, nome).toBeLessThan(44);
  }
  expect((await caixa(nomeDaContagem)).width).toBeLessThanOrEqual(1);
});

test.describe("com ponteiro grosso, em 1.280 px", () => {
  test.use({ hasTouch: true, viewport: { width: 1280, height: 900 } });

  test("o botão de cada linha mede ao menos 44 × 44 (CADCOL-10, AC 6)", async ({ page }) => {
    await abrir(page, CATEGORIAS);
    expect(await page.evaluate(() => window.matchMedia("(pointer: coarse)").matches)).toBe(true);

    const botoes = await tabela(page).getByRole("button").all();
    expect(botoes).toHaveLength(2);
    for (const botao of botoes) {
      await medirAlvo(botao, (await botao.textContent()) ?? "linha");
    }
  });
});

/* ------------------------------------------------------------------------
 * No celular (CADCOL-09, AC 7; CADCOL-02, AC 8; CADCOL-10, AC 7).
 * ---------------------------------------------------------------------- */

test("em 400 px, com Categoria Um aberta: sem rolagem lateral, as contagens abaixo da pill e todo alvo do painel, das abas e da ação com 44 × 44 (CADCOL-09, AC 7; CADCOL-02, AC 8; CADCOL-10, AC 7)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 400, height: 900 });
  await abrir(page, CATEGORIAS);
  await botaoDaLinha(page, "Categoria Um").click();
  await expect(tituloDoPainel(page)).toHaveText("Categoria Um");

  expect(await transbordoHorizontal(page)).toBe(0);

  /* Duas linhas de texto: a pill em cima; a cor e as contagens embaixo, na mesma linha. */
  const pill = await caixa(botaoDaLinha(page, "Categoria Um"));
  const cor = await caixa(celula(page, "Categoria Um", 1));
  const fixos = await caixa(celula(page, "Categoria Um", 2));
  const lancamentos = await caixa(celula(page, "Categoria Um", 3));
  for (const abaixo of [cor, fixos, lancamentos]) {
    expect(abaixo.y).toBeGreaterThanOrEqual(pill.y + pill.height);
  }
  expect(Math.abs(fixos.y - cor.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(lancamentos.y - cor.y)).toBeLessThanOrEqual(1);
  await expect(celula(page, "Categoria Um", 2)).toHaveText("1 fixo");

  const opcoes = painel(page).getByRole("group", { name: "Cor de Categoria Um" }).locator("label");
  await expect(opcoes).toHaveCount(11);
  for (const opcao of await opcoes.all()) {
    await medirAlvo(opcao, (await opcao.textContent()) ?? "opção");
  }
  for (const [nome, alvo] of [
    ["Salvar", painel(page).getByRole("button", { name: "Salvar" })],
    ["Fechar", painel(page).getByRole("button", { name: "Fechar" })],
    ["Ver em Lançamentos", painel(page).getByRole("link", { name: "Ver em Lançamentos" })],
    ["aba Categorias", abas(page).getByRole("link", { name: "Categorias" })],
    ["aba Meios de pagamento", abas(page).getByRole("link", { name: "Meios de pagamento" })],
    ["+ Nova categoria", botaoNova(page)],
  ] as const) {
    await medirAlvo(alvo, nome);
  }

  /* O formulário de criação, aberto pela ação, medido aberto (L-060). */
  await botaoNova(page).click();
  await expect(tituloDoPainel(page)).toHaveText("Nova categoria");
  expect(await transbordoHorizontal(page)).toBe(0);
  for (const nome of ["Criar categoria", "Cancelar", "Fechar"]) {
    await medirAlvo(painel(page).getByRole("button", { name: nome }), nome);
  }
});
