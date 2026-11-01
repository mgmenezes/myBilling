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

interface CaixaDeTexto {
  readonly topo: number;
  readonly base: number;
}

/**
 * As caixas do texto à vista nos elementos: uma por linha de cada nó de
 * texto, como o navegador as desenha. O texto escondido não tem caixa.
 */
async function caixasDoTexto(alvos: Locator): Promise<CaixaDeTexto[]> {
  return alvos.evaluateAll((elementos) => {
    const caixas: Array<{ topo: number; base: number }> = [];
    for (const elemento of elementos) {
      const andarilho = document.createTreeWalker(elemento, NodeFilter.SHOW_TEXT);
      for (let no = andarilho.nextNode(); no !== null; no = andarilho.nextNode()) {
        if ((no.textContent ?? "").trim() === "") {
          continue;
        }
        const trecho = document.createRange();
        trecho.selectNodeContents(no);
        for (const retangulo of trecho.getClientRects()) {
          if (retangulo.width > 0 && retangulo.height > 0) {
            caixas.push({ topo: retangulo.top, base: retangulo.bottom });
          }
        }
      }
    }
    return caixas;
  });
}

/** Quantas linhas de texto as caixas ocupam: as que se sobrepõem na vertical são uma linha só. */
function linhasDeTexto(caixas: ReadonlyArray<CaixaDeTexto>): number {
  let linhas = 0;
  let baseDaLinha = Number.NEGATIVE_INFINITY;
  for (const { topo, base } of [...caixas].sort((a, b) => a.topo - b.topo)) {
    if (topo >= baseDaLinha - 1) {
      linhas++;
      baseDaLinha = base;
    } else {
      baseDaLinha = Math.max(baseDaLinha, base);
    }
  }
  return linhas;
}

/**
 * De 400 a 767 px, o nome sozinho na primeira linha de texto e o resto da
 * linha da tabela embaixo dele (CADCOL-02 e CADCOL-06, AC 8). Devolve as
 * caixas do nome e as do resto, para contar as linhas.
 */
async function nomeSozinhoEmCima(
  linhaDaTabela: Locator,
  rotulo: string,
): Promise<{ nome: CaixaDeTexto[]; resto: CaixaDeTexto[] }> {
  const nome = await caixasDoTexto(linhaDaTabela.locator("td").first().getByRole("button"));
  const resto = await caixasDoTexto(linhaDaTabela.locator("td:not(:first-child)"));
  expect(nome.length, `${rotulo}: caixas do nome`).toBeGreaterThan(0);
  expect(resto.length, `${rotulo}: caixas do resto`).toBeGreaterThan(0);
  const topoDoNome = Math.min(...nome.map(({ topo }) => topo));
  const baseDoNome = Math.max(...nome.map(({ base }) => base));
  for (const { topo, base } of resto) {
    expect(base <= topoDoNome || topo >= baseDoNome, `${rotulo}: caixa na faixa do nome`).toBe(
      true,
    );
    expect(topo, `${rotulo}: caixa abaixo do nome`).toBeGreaterThanOrEqual(baseDoNome);
  }
  return { nome, resto };
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
  /* O rótulo do mês é montado pela página, e não pelo componente (L-054). */
  await expect(secao.locator("dt")).toHaveText([
    "Fixos em Março de 2026",
    "Lançamentos em Março de 2026",
  ]);
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
  /* A regra do AC 8 colada no limiar (L-063): a pill sozinha na primeira
     linha de texto e, embaixo, a cor e as contagens, que aqui cabem numa
     linha só. */
  for (const nome of ["Categoria Dois", "Categoria Um"]) {
    const { resto } = await nomeSozinhoEmCima(linha(page, nome), nome);
    expect(linhasDeTexto(resto), nome).toBe(1);
  }

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

  /* A pill sozinha na primeira linha de texto e, embaixo, a cor e as
     contagens, que quebram só quando não cabem. Aqui cabem: duas linhas,
     contadas pelas caixas do texto (CADCOL-02, AC 8). */
  const categoriaUm = await nomeSozinhoEmCima(linha(page, "Categoria Um"), "Categoria Um");
  expect(linhasDeTexto([...categoriaUm.nome, ...categoriaUm.resto])).toBe(2);

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

/* ========================================================================
 * A aba Meios de pagamento (T20). A mesma fixture de março: "Conta
 * Corrente" tem 2 fixos (A e Entrada A; B terminou em fevereiro) e 2
 * lançamentos (as ocorrências de A e de Entrada A; o Gasto B está cancelado
 * e o Gasto C é de abril); "Cartão Roxo" tem 0 fixos (C começa em abril) e 1
 * lançamento (o Gasto A). "conta Azul" e "Rótulo Âmbar" não têm uso.
 * ====================================================================== */

const MEIOS = `/${MARCO}/cadastros/meios-de-pagamento`;
/** Quarenta caracteres, o limite do nome, num cartão de dias com dois algarismos (L-045). */
const MEIO_LONGO = "Cartão com nome longo para apertar linha";
const DICA_DO_MEIO =
  "Escolha um meio na lista para renomear, corrigir os dias do cartão e ver onde ele aparece.";
/** A ordem do português: sem caixa e sem acento. */
const ORDEM_DOS_MEIOS = ["Cartão Roxo", "conta Azul", "Conta Corrente", "Rótulo Âmbar"];

async function inserirMeio(
  nome: string,
  tipo: "CARTAO_CREDITO" | "CONTA_CORRENTE" | "ROTULO",
  dias: { readonly fechamento: number; readonly vencimento: number } | null = null,
): Promise<string> {
  return dias === null
    ? primeiroId(
        "INSERT INTO meio_pagamento (nome, tipo, gera_fatura) VALUES ($1, $2, false) RETURNING id",
        [nome, tipo],
      )
    : primeiroId(
        `INSERT INTO meio_pagamento (nome, tipo, gera_fatura, dia_fechamento, dia_vencimento)
         VALUES ($1, $2, true, $3, $4) RETURNING id`,
        [nome, tipo, dias.fechamento, dias.vencimento],
      );
}

async function idDoMeio(nome: string): Promise<string> {
  return primeiroId("SELECT id FROM meio_pagamento WHERE nome = $1", [nome]);
}

/** Meios a mais, para a tabela passar da altura da janela. */
async function semearMeiosAMais(): Promise<void> {
  for (let indice = 1; indice <= 12; indice++) {
    await inserirMeio(`Rótulo Extra ${String(indice).padStart(2, "0")}`, "ROTULO");
  }
}

async function abrirMeios(page: Page, caminho: string): Promise<void> {
  await page.goto(caminho);
  await expect(page.getByRole("heading", { level: 1, name: "Cadastros" })).toBeVisible();
  await expect(tabelaDeMeios(page)).toBeVisible();
}

function tabelaDeMeios(page: Page): Locator {
  return page.getByRole("table", { name: "Meios de pagamento" });
}

function botaoDoMeio(page: Page, nome: string): Locator {
  return tabelaDeMeios(page).getByRole("button", { name: nome, exact: true });
}

/** A linha de um meio; o `has` é procurado dentro de cada linha. */
function linhaDoMeio(page: Page, nome: string): Locator {
  return tabelaDeMeios(page)
    .getByRole("row")
    .filter({ has: page.getByRole("button", { name: nome, exact: true }) });
}

/** As células da linha: Meio, Tipo, Fecha, Vence, Fixos e Lançamentos. */
function celulaDoMeio(page: Page, nome: string, indice: number): Locator {
  return linhaDoMeio(page, nome).getByRole("cell").nth(indice);
}

/**
 * A mesma célula pela posição no DOM. Abaixo de 768 px o "—" da conta some da
 * tela e da árvore de acessibilidade, e a posição pelo papel muda.
 */
function tdDoMeio(page: Page, nome: string, indice: number): Locator {
  return linhaDoMeio(page, nome).locator("td").nth(indice);
}

function painelDoMeio(page: Page): Locator {
  return page.getByRole("complementary", { name: "Painel do meio de pagamento" });
}

function tituloDoPainelDoMeio(page: Page): Locator {
  return painelDoMeio(page).getByRole("heading", { level: 2 });
}

/** O subtítulo, logo abaixo do título: o tipo e, no cartão, os dias. */
function subtituloDoMeio(page: Page): Locator {
  return tituloDoPainelDoMeio(page).locator("xpath=following-sibling::p[1]");
}

function formularioDoMeio(page: Page, nome: string): Locator {
  return painelDoMeio(page).getByRole("form", { name: `Editar ${nome}` });
}

function formularioDeNovoMeio(page: Page): Locator {
  return painelDoMeio(page).getByRole("form", { name: "Novo meio de pagamento" });
}

function botaoNovoMeio(page: Page): Locator {
  return page.getByRole("button", { name: "+ Novo meio", exact: true });
}

/** A mensagem junto do campo: o `alert` no bloco dele, e o campo marcado. */
async function erroJuntoDo(campo: Locator): Promise<Locator> {
  await expect(campo).toHaveAttribute("aria-invalid", "true");
  return campo.locator("xpath=..").getByRole("alert");
}

test.describe("a aba Meios de pagamento", () => {
  /* ------------------------------------------------------------------------
   * A composição: o uso no mês e a concordância com Lançamentos (CADCOL-03;
   * CADCOL-06, AC 5; CADCOL-07, AC 13; L-001, L-014).
   * ---------------------------------------------------------------------- */

  test("abrindo Meios de pagamento de março antes de qualquer outra tela, as contagens vêm das ocorrências criadas ao abrir, e Ver em Lançamentos mostra o mesmo número (CADCOL-03, ACs 1 a 6; CADCOL-06, AC 5; CADCOL-07, AC 13)", async ({
    page,
  }) => {
    const antes = await pool.query(
      "SELECT 1 FROM movimento WHERE recorrencia_id = $1 AND competencia = $2",
      [ids.fixoA, `${MARCO}-01`],
    );
    expect(antes.rowCount).toBe(0);
    await page.setViewportSize({ width: 1280, height: 900 });

    await abrirMeios(page, MEIOS);

    await expect(celulaDoMeio(page, "Conta Corrente", 4)).toHaveText("2 fixos");
    await expect(celulaDoMeio(page, "Conta Corrente", 5)).toHaveText("2 lançamentos");
    await expect(celulaDoMeio(page, "Cartão Roxo", 4)).toHaveText("0 fixos");
    await expect(celulaDoMeio(page, "Cartão Roxo", 5)).toHaveText("1 lançamento");
    await expect(celulaDoMeio(page, "conta Azul", 4)).toHaveText("0 fixos");
    await expect(celulaDoMeio(page, "conta Azul", 5)).toHaveText("0 lançamentos");

    await botaoDoMeio(page, "Conta Corrente").click();
    const secao = painelDoMeio(page).getByRole("region", { name: "Onde ele aparece" });
    await expect(secao.locator("dd")).toHaveText(["2", "2"]);
    /* O rótulo do mês é montado pela página, e não pelo componente (L-054). */
    await expect(secao.locator("dt")).toHaveText([
      "Fixos em Março de 2026",
      "Lançamentos em Março de 2026",
    ]);
    await secao.getByRole("link", { name: "Ver em Lançamentos" }).click();

    await expect(page).toHaveURL(
      new RegExp(`/${MARCO}/lancamentos\\?meioPagamentoId=${base.contaId}$`),
    );
    await expect(page.locator("#cartao-de-filtros").getByRole("status")).toHaveText(
      /^2 lançamentos com 1 filtro\./,
    );
  });

  /* ------------------------------------------------------------------------
   * A aba, a ordem e as colunas (CADCOL-01; CADCOL-06, ACs 2 a 4).
   * ---------------------------------------------------------------------- */

  test('a aba "Meios de pagamento" leva à rota do mesmo mês, marcada, com "Cadastros" ativo (CADCOL-01, ACs 2, 3 e 5)', async ({
    page,
  }) => {
    await abrir(page, CATEGORIAS);

    await abas(page).getByRole("link", { name: "Meios de pagamento" }).click();

    await expect(page).toHaveURL(new RegExp(`${MEIOS}$`));
    await expect(tabelaDeMeios(page)).toBeVisible();
    await expect(abas(page).getByRole("link", { name: "Meios de pagamento" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(abas(page).getByRole("link", { name: "Categorias" })).not.toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(navegacao(page, "Cadastros")).toHaveAttribute("aria-current", "page");
    await expect(botaoNovoMeio(page)).toBeVisible();
  });

  test("os meios na ordem do português, que difere da do banco e da do código de caractere, com o tipo e os dias lidos dentro de cada linha (CADCOL-06, ACs 2 a 4)", async ({
    page,
  }) => {
    /* A fixture discrimina (L-001, L-036): o banco e o código de caractere põem
     "conta Azul" em outro lugar. */
    const doBanco = await pool.query<{ nome: string }>(
      "SELECT nome FROM meio_pagamento WHERE arquivado_em IS NULL ORDER BY nome",
    );
    expect(doBanco.rows.map(({ nome }) => nome)).not.toEqual(ORDEM_DOS_MEIOS);
    expect([...ORDEM_DOS_MEIOS].sort()).not.toEqual(ORDEM_DOS_MEIOS);

    await abrirMeios(page, MEIOS);

    await expect(tabelaDeMeios(page).getByRole("button")).toHaveText(ORDEM_DOS_MEIOS);
    /* "fecha" e "vence" são o nome do dia, escrito para quem não vê o cabeçalho. */
    await expect(celulaDoMeio(page, "Cartão Roxo", 1)).toHaveText("Cartão de crédito");
    await expect(celulaDoMeio(page, "Cartão Roxo", 2)).toHaveText("fecha dia 25");
    await expect(celulaDoMeio(page, "Cartão Roxo", 3)).toHaveText("vence dia 5");
    for (const [nome, tipo] of [
      ["conta Azul", "Conta corrente"],
      ["Conta Corrente", "Conta corrente"],
      ["Rótulo Âmbar", "Rótulo"],
    ] as const) {
      await expect(celulaDoMeio(page, nome, 1), nome).toHaveText(tipo);
      await expect(celulaDoMeio(page, nome, 2), nome).toHaveText("—");
      await expect(celulaDoMeio(page, nome, 3), nome).toHaveText("—");
    }
  });

  /* ------------------------------------------------------------------------
   * Editar pelo painel, com a confirmação à vista (CADCOL-07, ACs 5, 6 e 14;
   * L-057).
   * ---------------------------------------------------------------------- */

  for (const janela of [
    { width: 1280, height: 720 },
    { width: 1920, height: 1080 },
  ]) {
    test(`em ${janela.width} × ${janela.height}, corrigir os dias de Cartão Roxo para 10 e 17: o aviso, os dias novos na linha e no subtítulo, e o botão e o subtítulo à vista (CADCOL-07, AC 5)`, async ({
      page,
    }) => {
      await page.setViewportSize(janela);
      await abrirMeios(page, MEIOS);
      await botaoDoMeio(page, "Cartão Roxo").click();
      const form = formularioDoMeio(page, "Cartão Roxo");
      await form.getByRole("textbox", { name: "Dia de fechamento" }).fill("10");
      await form.getByRole("textbox", { name: "Dia de vencimento" }).fill("17");
      const salvar = form.getByRole("button", { name: "Salvar alterações" });

      await salvar.click();

      await expect(aviso(page)).toHaveText("Meio de pagamento salvo.");
      /* A linha muda quando a página relida chega, depois da resposta. */
      await expect(celulaDoMeio(page, "Cartão Roxo", 2)).toHaveText("fecha dia 10");
      await expect(celulaDoMeio(page, "Cartão Roxo", 3)).toHaveText("vence dia 17");
      await expect(subtituloDoMeio(page)).toHaveText(
        "Cartão de crédito · fecha dia 10 · vence dia 17",
      );
      await doisQuadros(page);
      await expect(salvar).toBeInViewport({ ratio: 1 });
      await expect(subtituloDoMeio(page)).toBeInViewport({ ratio: 1 });
      const gravado = await pool.query<{ dia_fechamento: number; dia_vencimento: number }>(
        "SELECT dia_fechamento, dia_vencimento FROM meio_pagamento WHERE id = $1",
        [base.cartaoId],
      );
      expect(gravado.rows[0]).toEqual({ dia_fechamento: 10, dia_vencimento: 17 });
    });
  }

  test('renomear Cartão Roxo para "conta azul" é recusado junto do campo, e nada muda na linha (CADCOL-07, AC 6)', async ({
    page,
  }) => {
    await abrirMeios(page, MEIOS);
    await botaoDoMeio(page, "Cartão Roxo").click();
    const form = formularioDoMeio(page, "Cartão Roxo");
    const nome = form.getByRole("textbox", { name: "Nome" });
    await nome.fill("conta azul");

    await form.getByRole("button", { name: "Salvar alterações" }).click();

    await expect(await erroJuntoDo(nome)).toHaveText(
      "Já existe outro meio de pagamento com esse nome.",
    );
    await expect(aviso(page)).toHaveCount(0);
    await expect(tabelaDeMeios(page).getByRole("button")).toHaveText(ORDEM_DOS_MEIOS);
    await expect(tituloDoPainelDoMeio(page)).toHaveText("Cartão Roxo");
    const gravado = await pool.query<{ nome: string }>(
      "SELECT nome FROM meio_pagamento WHERE id = $1",
      [base.cartaoId],
    );
    expect(gravado.rows[0]?.nome).toBe("Cartão Roxo");
  });

  test('renomear Cartão Roxo para "Cartão Lilás": a linha muda de lugar, e Lançamentos, aberto pela navegação sem recarregar, já tem o nome novo no filtro de meio (CADCOL-07, ACs 5 e 14)', async ({
    page,
  }) => {
    /* Entre "Cartão Lilás" e "Cartão Roxo" na ordem, para a linha mudar de lugar. */
    await inserirMeio("Cartão Marrom", "CONTA_CORRENTE");
    await page.setViewportSize({ width: 1280, height: 900 });
    await abrirMeios(page, MEIOS);
    await expect(tabelaDeMeios(page).getByRole("button").nth(1)).toHaveText("Cartão Roxo");
    await page.evaluate(() => {
      (window as unknown as { marcador?: string }).marcador = "sem recarregar";
    });
    await botaoDoMeio(page, "Cartão Roxo").click();
    const form = formularioDoMeio(page, "Cartão Roxo");
    await form.getByRole("textbox", { name: "Nome" }).fill("Cartão Lilás");

    await form.getByRole("button", { name: "Salvar alterações" }).click();

    await expect(aviso(page)).toHaveText("Meio de pagamento salvo.");
    await expect(tabelaDeMeios(page).getByRole("button")).toHaveText([
      "Cartão Lilás",
      "Cartão Marrom",
      "conta Azul",
      "Conta Corrente",
      "Rótulo Âmbar",
    ]);
    await expect(botaoDoMeio(page, "Cartão Lilás")).toHaveAttribute("aria-expanded", "true");
    await expect(tituloDoPainelDoMeio(page)).toHaveText("Cartão Lilás");

    await navegacao(page, "Lançamentos").click();

    await expect(page).toHaveURL(new RegExp(`/${MARCO}/lancamentos$`));
    const filtroDeMeio = page.locator("#cartao-de-filtros search").getByLabel("Meio de pagamento");
    await expect(filtroDeMeio.locator("option", { hasText: "Cartão Lilás" })).toHaveCount(1);
    await expect(filtroDeMeio.locator("option", { hasText: "Cartão Roxo" })).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { marcador?: string }).marcador)).toBe(
      "sem recarregar",
    );
  });

  /* ------------------------------------------------------------------------
   * Criar pelo painel (CADCOL-08, ACs 4 e 5; L-057).
   * ---------------------------------------------------------------------- */

  for (const janela of [
    { width: 1280, height: 720 },
    { width: 1920, height: 1080 },
  ]) {
    test(`em ${janela.width} × ${janela.height}, criar "Cartão Novo", com fechamento 3 e vencimento 10: a linha aparece e o painel abre nele, à vista; criar "conta corrente" é recusado junto do campo (CADCOL-08, ACs 4 e 5)`, async ({
      page,
    }) => {
      await page.setViewportSize(janela);
      await abrirMeios(page, MEIOS);

      await botaoNovoMeio(page).click();
      await expect(tituloDoPainelDoMeio(page)).toHaveText("Novo meio de pagamento");
      const form = formularioDeNovoMeio(page);
      await form.getByRole("textbox", { name: "Nome" }).fill("Cartão Novo");
      await form.getByRole("textbox", { name: "Dia de fechamento" }).fill("3");
      await form.getByRole("textbox", { name: "Dia de vencimento" }).fill("10");
      await form.getByRole("button", { name: "Criar meio" }).click();

      await expect(aviso(page)).toHaveText("Meio de pagamento criado.");
      await expect(tituloDoPainelDoMeio(page)).toHaveText("Cartão Novo");
      await expect(subtituloDoMeio(page)).toHaveText(
        "Cartão de crédito · fecha dia 3 · vence dia 10",
      );
      await expect(botaoDoMeio(page, "Cartão Novo")).toHaveAttribute("aria-expanded", "true");
      await expect(tituloDoPainelDoMeio(page)).toBeFocused();
      await doisQuadros(page);
      await expect(tituloDoPainelDoMeio(page)).toBeInViewport({ ratio: 1 });
      await expect(subtituloDoMeio(page)).toBeInViewport({ ratio: 1 });
      const criado = await idDoMeio("Cartão Novo");
      await expect.poll(() => parametro(page, "meio")).toBe(criado);

      await botaoNovoMeio(page).click();
      const outro = formularioDeNovoMeio(page);
      await outro.getByRole("combobox", { name: "Tipo" }).selectOption({ label: "Conta corrente" });
      const nome = outro.getByRole("textbox", { name: "Nome" });
      await nome.fill("conta corrente");
      await outro.getByRole("button", { name: "Criar meio" }).click();

      await expect(await erroJuntoDo(nome)).toHaveText(
        "Já existe um meio de pagamento com esse nome.",
      );
      await expect(tabelaDeMeios(page).getByRole("button")).toHaveCount(5);
      const contas = await pool.query("SELECT 1 FROM meio_pagamento WHERE lower(nome) = $1", [
        "conta corrente",
      ]);
      expect(contas.rowCount).toBe(1);
    });
  }

  /* ------------------------------------------------------------------------
   * O endereço (CADCOL-11) e o teclado (CADCOL-10).
   * ---------------------------------------------------------------------- */

  test("abrir põe `?meio=<id>` sem recarregar e sem entrada no histórico; recarregar mostra o mesmo aberto; um id inexistente deixa o painel fechado (CADCOL-11, ACs 1 a 3)", async ({
    page,
  }) => {
    await abrirMeios(page, MEIOS);
    await page.evaluate(() => {
      (window as unknown as { marcador?: string }).marcador = "sem recarregar";
    });
    const entradasNoHistorico = await page.evaluate(() => window.history.length);

    await botaoDoMeio(page, "Cartão Roxo").click();

    await expect.poll(() => parametro(page, "meio")).toBe(base.cartaoId);
    expect(await page.evaluate(() => (window as unknown as { marcador?: string }).marcador)).toBe(
      "sem recarregar",
    );
    expect(await page.evaluate(() => window.history.length)).toBe(entradasNoHistorico);

    await page.reload();
    await expect(tituloDoPainelDoMeio(page)).toHaveText("Cartão Roxo");

    await abrirMeios(page, `${MEIOS}?meio=00000000-0000-4000-8000-000000000000`);
    await expect(painelDoMeio(page)).toHaveCount(0);
    /* Dentro do `main`: o anunciador de rota do Next é um `alert` vazio fora dele. */
    await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  });

  test("pelo teclado: Tab até a linha, Enter abre com o foco no título; Escape fecha, devolve o foco e tira o parâmetro; espaço também abre (CADCOL-10, ACs 1 a 4)", async ({
    page,
  }) => {
    const contaAzul = await idDoMeio("conta Azul");
    await abrirMeios(page, MEIOS);
    await botaoDoMeio(page, "Cartão Roxo").focus();

    await page.keyboard.press("Tab");
    await expect(botaoDoMeio(page, "conta Azul")).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(tituloDoPainelDoMeio(page)).toHaveText("conta Azul");
    await expect(tituloDoPainelDoMeio(page)).toBeFocused();
    await expect.poll(() => parametro(page, "meio")).toBe(contaAzul);

    await page.keyboard.press("Escape");

    await expect(painelDoMeio(page)).toHaveCount(0);
    await expect(botaoDoMeio(page, "conta Azul")).toBeFocused();
    await expect.poll(() => parametro(page, "meio")).toBeNull();

    await page.keyboard.press("Shift+Tab");
    await expect(botaoDoMeio(page, "Cartão Roxo")).toBeFocused();
    await page.keyboard.press(" ");
    await expect(tituloDoPainelDoMeio(page)).toHaveText("Cartão Roxo");
    await expect(tituloDoPainelDoMeio(page)).toBeFocused();
  });

  test("abrir e logo fechar com Escape, sem esperar a URL, termina sem `?meio=` (CADCOL-11, AC 4)", async ({
    page,
  }) => {
    await abrirMeios(page, MEIOS);
    await redeLenta(page);
    const leituras = vigiarLeituras(page);

    await botaoDoMeio(page, "Cartão Roxo").click();
    await page.keyboard.press("Escape");

    await leituras.terminar();
    await expect(botaoDoMeio(page, "Cartão Roxo")).toHaveAttribute("aria-expanded", "false");
    expect(parametro(page, "meio")).toBeNull();
  });

  test("com o meio aberto no endereço, fechar e logo reabrir, sem esperar a URL, termina com ele (CADCOL-11, AC 1)", async ({
    page,
  }) => {
    await abrirMeios(page, `${MEIOS}?meio=${base.cartaoId}`);
    await expect(tituloDoPainelDoMeio(page)).toHaveText("Cartão Roxo");
    await tituloDoPainelDoMeio(page).focus();
    await redeLenta(page);
    const leituras = vigiarLeituras(page);

    await page.keyboard.press("Escape");
    await botaoDoMeio(page, "Cartão Roxo").click();

    await leituras.terminar();
    await expect(tituloDoPainelDoMeio(page)).toHaveText("Cartão Roxo");
    expect(parametro(page, "meio")).toBe(base.cartaoId);
  });

  /* ------------------------------------------------------------------------
   * Os dois dias pela largura do formulário, colados em 448 px (FPC-01;
   * L-060, L-061). Cada formulário é aberto pela ação dele: a edição pela
   * linha, a criação pelo "+ Novo meio".
   * ---------------------------------------------------------------------- */

  async function diasLadoALado(form: Locator): Promise<boolean> {
    const fechamento = await caixa(form.getByRole("textbox", { name: "Dia de fechamento" }));
    const vencimento = await caixa(form.getByRole("textbox", { name: "Dia de vencimento" }));
    if (Math.abs(fechamento.y - vencimento.y) <= 1 && vencimento.x > fechamento.x) {
      return true;
    }
    expect(vencimento.y, "o vencimento abaixo do fechamento").toBeGreaterThanOrEqual(
      fechamento.y + fechamento.height,
    );
    return false;
  }

  for (const modo of ["edição", "criação"] as const) {
    test(`com o formulário de ${modo} em 447 px, um dia embaixo do outro; em 448 px, lado a lado (FPC-01; L-061)`, async ({
      page,
    }) => {
      async function abrirFormulario(): Promise<Locator> {
        if (modo === "criação") {
          await botaoNovoMeio(page).click();
          return formularioDeNovoMeio(page);
        }
        await botaoDoMeio(page, "Cartão Roxo").click();
        return formularioDoMeio(page, "Cartão Roxo");
      }

      await page.setViewportSize({ width: 777, height: 1080 });
      await abrirMeios(page, MEIOS);
      const form = await abrirFormulario();
      await expect(form).toBeVisible();
      const estreito = (await caixa(form)).width;
      expect(estreito).toBeLessThan(448);
      expect(estreito).toBeGreaterThanOrEqual(447);
      expect(await diasLadoALado(form)).toBe(false);

      await page.setViewportSize({ width: 778, height: 1080 });
      await expect.poll(async () => (await caixa(form)).width).toBeGreaterThanOrEqual(448);
      expect((await caixa(form)).width).toBeLessThan(449);
      expect(await diasLadoALado(form)).toBe(true);
    });
  }

  /* ------------------------------------------------------------------------
   * Abaixo de 1.536 px: uma coluna só (CADCOL-09, ACs 5 e 6; CADCOL-10, AC 5;
   * CADCOL-07, AC 15; CADCOL-06, AC 7).
   * ---------------------------------------------------------------------- */

  test("em 1.280 px, sem nada aberto não há painel; aberto, ele fica entre as abas e a tabela (CADCOL-09, ACs 5 e 6)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await abrirMeios(page, MEIOS);
    await expect(painelDoMeio(page)).toHaveCount(0);
    await expect(page.getByText(DICA_DO_MEIO)).toBeHidden();

    await botaoDoMeio(page, "Cartão Roxo").click();
    await expect(tituloDoPainelDoMeio(page)).toHaveText("Cartão Roxo");

    const caixaDasAbas = await caixa(abas(page));
    const caixaDoPainel = await caixa(painelDoMeio(page));
    const caixaDaTabela = await caixa(tabelaDeMeios(page));
    expect(caixaDoPainel.y).toBeGreaterThanOrEqual(caixaDasAbas.y + caixaDasAbas.height);
    expect(caixaDaTabela.y).toBeGreaterThanOrEqual(caixaDoPainel.y + caixaDoPainel.height);
  });

  test("em 1.280 px, abrir a última linha, com a página rolada, traz o título do painel para dentro da janela (CADCOL-10, AC 5)", async ({
    page,
  }) => {
    await semearMeiosAMais();
    await page.setViewportSize({ width: 1280, height: 420 });
    await abrirMeios(page, MEIOS);
    const ultima = botaoDoMeio(page, "Rótulo Extra 12");
    await ultima.scrollIntoViewIfNeeded();
    await expect(abas(page)).not.toBeInViewport();

    await ultima.click();

    await expect(tituloDoPainelDoMeio(page)).toHaveText("Rótulo Extra 12");
    await expect(tituloDoPainelDoMeio(page)).toBeInViewport();
  });

  test("em 1.280 px, a linha aberta tem o fundo diferente de todas as outras (CADCOL-07, AC 15)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await abrirMeios(page, MEIOS);
    await botaoDoMeio(page, "conta Azul").click();
    await expect(tituloDoPainelDoMeio(page)).toHaveText("conta Azul");
    await page.mouse.move(0, 0);
    await doisQuadros(page);

    const fundos = await tabelaDeMeios(page)
      .locator("tbody tr")
      .evaluateAll((linhas) =>
        linhas.map((tr) => ({
          nome: tr.querySelector("button")?.textContent ?? "",
          fundo: getComputedStyle(tr).backgroundColor,
        })),
      );
    const aberto = fundos.find(({ nome }) => nome === "conta Azul");
    const outros = fundos.filter(({ nome }) => nome !== "conta Azul");
    expect(outros).toHaveLength(3);
    for (const outro of outros) {
      expect(outro.fundo, outro.nome).not.toBe(aberto?.fundo);
    }
  });

  test("em 1.280 px, com ponteiro fino, toda linha da tabela mede até 48 px, inclusive a de nome com 40 caracteres (CADCOL-06, AC 7)", async ({
    page,
  }) => {
    await semearMeiosAMais();
    await inserirMeio(MEIO_LONGO, "CARTAO_CREDITO", { fechamento: 28, vencimento: 28 });
    await page.setViewportSize({ width: 1280, height: 900 });
    await abrirMeios(page, MEIOS);
    expect(await page.evaluate(() => window.matchMedia("(pointer: fine)").matches)).toBe(true);

    const alturas = await tabelaDeMeios(page)
      .locator("tbody tr")
      .evaluateAll((linhas) =>
        linhas.map((tr) => ({
          nome: tr.querySelector("button")?.textContent ?? "",
          altura: tr.getBoundingClientRect().height,
        })),
      );
    /* Os quatro de março, os doze a mais e o de nome longo: toda linha. */
    expect(alturas).toHaveLength(17);
    expect(alturas.map(({ nome }) => nome)).toContain(MEIO_LONGO);
    for (const { nome, altura } of alturas) {
      expect(altura, nome).toBeLessThanOrEqual(48);
    }
  });

  /* ------------------------------------------------------------------------
   * O limiar de 768 px, dos dois lados (CADCOL-06, AC 8; CADCOL-10, AC 6;
   * L-029), e o ponteiro grosso acima dele (L-044).
   * ---------------------------------------------------------------------- */

  test("em 767 px, nenhum cabeçalho à vista, o nome de cada dia e de cada contagem escrito e o botão de cada linha com 44 px; em 768 px, os seis cabeçalhos à vista, os nomes só para leitor de tela, o botão mais baixo e nenhuma rolagem lateral, com o nome de 40 caracteres (CADCOL-06, AC 8; CADCOL-10, AC 6)", async ({
    page,
  }) => {
    await inserirMeio(MEIO_LONGO, "CARTAO_CREDITO", { fechamento: 28, vencimento: 28 });
    await page.setViewportSize({ width: 767, height: 900 });
    await abrirMeios(page, MEIOS);
    await expect(tabelaDeMeios(page).getByRole("columnheader")).toHaveCount(0);
    expect(await transbordoHorizontal(page)).toBe(0);
    for (const nome of ORDEM_DOS_MEIOS) {
      expect((await caixa(botaoDoMeio(page, nome))).height, nome).toBeGreaterThanOrEqual(44);
    }
    const nomeDoDia = celulaDoMeio(page, "Cartão Roxo", 2).locator("span").first();
    const nomeDaContagem = celulaDoMeio(page, "Cartão Roxo", 5).locator("span").last();
    expect((await caixa(nomeDoDia)).width).toBeGreaterThan(10);
    expect((await caixa(nomeDaContagem)).width).toBeGreaterThan(10);
    /* A regra do AC 8 colada no limiar (L-063): o nome sozinho na primeira
       linha de texto e, embaixo, o tipo, os dias e as contagens, que aqui
       cabem numa linha só, no cartão também. */
    for (const nome of ORDEM_DOS_MEIOS) {
      const { resto } = await nomeSozinhoEmCima(linhaDoMeio(page, nome), nome);
      expect(linhasDeTexto(resto), nome).toBe(1);
    }

    await page.setViewportSize({ width: 768, height: 900 });
    await expect(tabelaDeMeios(page).getByRole("columnheader")).toHaveText([
      "Meio de pagamento",
      "Tipo",
      "Fecha",
      "Vence",
      "Fixos em Março",
      "Lançamentos em Março",
    ]);
    expect(await transbordoHorizontal(page)).toBe(0);
    for (const nome of ORDEM_DOS_MEIOS) {
      expect((await caixa(botaoDoMeio(page, nome))).height, nome).toBeLessThan(44);
    }
    expect((await caixa(nomeDoDia)).width).toBeLessThanOrEqual(1);
    expect((await caixa(nomeDaContagem)).width).toBeLessThanOrEqual(1);
  });

  test.describe("com ponteiro grosso, em 1.280 px", () => {
    test.use({ hasTouch: true, viewport: { width: 1280, height: 900 } });

    test("o botão de cada linha mede ao menos 44 × 44 (CADCOL-10, AC 6)", async ({ page }) => {
      await abrirMeios(page, MEIOS);
      expect(await page.evaluate(() => window.matchMedia("(pointer: coarse)").matches)).toBe(true);

      const botoes = await tabelaDeMeios(page).getByRole("button").all();
      expect(botoes).toHaveLength(4);
      for (const botao of botoes) {
        await medirAlvo(botao, (await botao.textContent()) ?? "linha");
      }
    });
  });

  /* ------------------------------------------------------------------------
   * No celular (CADCOL-09, AC 7; CADCOL-06, AC 8; CADCOL-10, AC 7).
   * ---------------------------------------------------------------------- */

  test("em 400 px, com Cartão Roxo aberto: sem rolagem lateral, o nome em cima e o resto embaixo, e todo alvo do painel, das abas e da ação com 44 × 44; o formulário de criação também (CADCOL-09, AC 7; CADCOL-06, AC 8; CADCOL-10, AC 7)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 400, height: 900 });
    await abrirMeios(page, MEIOS);
    await botaoDoMeio(page, "Cartão Roxo").click();
    await expect(tituloDoPainelDoMeio(page)).toHaveText("Cartão Roxo");

    expect(await transbordoHorizontal(page)).toBe(0);

    /* O nome sozinho na primeira linha de texto e, embaixo, o tipo, os dias e
       as contagens, que quebram quando não cabem (CADCOL-06, AC 8): nenhuma
       caixa do texto deles na faixa do nome, e todas abaixo dele. Na conta,
       sem dias, cabem: duas linhas, contadas pelas caixas do texto. */
    await nomeSozinhoEmCima(linhaDoMeio(page, "Cartão Roxo"), "Cartão Roxo");
    const contaCorrente = await nomeSozinhoEmCima(
      linhaDoMeio(page, "Conta Corrente"),
      "Conta Corrente",
    );
    expect(linhasDeTexto([...contaCorrente.nome, ...contaCorrente.resto])).toBe(2);

    /* O nome em cima; o tipo, os dias e as contagens embaixo dele. Na conta,
     sem dias, o tipo e as contagens na mesma linha. */
    for (const [nome, visiveis] of [
      ["Cartão Roxo", [1, 2, 3, 4, 5]],
      ["Conta Corrente", [1, 4, 5]],
    ] as const) {
      const botao = await caixa(botaoDoMeio(page, nome));
      for (const indice of visiveis) {
        const celula = await caixa(tdDoMeio(page, nome, indice));
        expect(celula.y, `${nome}, coluna ${indice}`).toBeGreaterThanOrEqual(
          botao.y + botao.height,
        );
      }
    }
    const tipoDaConta = await caixa(tdDoMeio(page, "Conta Corrente", 1));
    const fixosDaConta = await caixa(tdDoMeio(page, "Conta Corrente", 4));
    const lancamentosDaConta = await caixa(tdDoMeio(page, "Conta Corrente", 5));
    expect(Math.abs(fixosDaConta.y - tipoDaConta.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(lancamentosDaConta.y - tipoDaConta.y)).toBeLessThanOrEqual(1);
    await expect(tdDoMeio(page, "Conta Corrente", 2)).toBeHidden();
    await expect(tdDoMeio(page, "Conta Corrente", 3)).toBeHidden();
    await expect(tdDoMeio(page, "Conta Corrente", 4)).toHaveText("2 fixos");
    await expect(tdDoMeio(page, "Cartão Roxo", 2)).toHaveText("fecha dia 25");

    const form = formularioDoMeio(page, "Cartão Roxo");
    for (const [nome, alvo] of [
      ["Dia de fechamento", form.getByRole("textbox", { name: "Dia de fechamento" })],
      ["Dia de vencimento", form.getByRole("textbox", { name: "Dia de vencimento" })],
      ["Salvar alterações", form.getByRole("button", { name: "Salvar alterações" })],
      ["Fechar", painelDoMeio(page).getByRole("button", { name: "Fechar" })],
      ["Ver em Lançamentos", painelDoMeio(page).getByRole("link", { name: "Ver em Lançamentos" })],
      ["aba Categorias", abas(page).getByRole("link", { name: "Categorias" })],
      ["aba Meios de pagamento", abas(page).getByRole("link", { name: "Meios de pagamento" })],
      ["+ Novo meio", botaoNovoMeio(page)],
    ] as const) {
      await medirAlvo(alvo, nome);
    }

    /* O formulário de criação, aberto pela ação, medido aberto (L-060). */
    await botaoNovoMeio(page).click();
    await expect(tituloDoPainelDoMeio(page)).toHaveText("Novo meio de pagamento");
    expect(await transbordoHorizontal(page)).toBe(0);
    const novo = formularioDeNovoMeio(page);
    for (const [nome, alvo] of [
      ["Dia de fechamento", novo.getByRole("textbox", { name: "Dia de fechamento" })],
      ["Dia de vencimento", novo.getByRole("textbox", { name: "Dia de vencimento" })],
      ["Criar meio", novo.getByRole("button", { name: "Criar meio" })],
      ["Cancelar", novo.getByRole("button", { name: "Cancelar" })],
      ["Fechar", painelDoMeio(page).getByRole("button", { name: "Fechar" })],
    ] as const) {
      await medirAlvo(alvo, nome);
    }
  });
});

/* ========================================================================
 * A coluna da direita a partir de 1.536 px, nas duas abas (T21; CADCOL-09,
 * ACs 1 a 6; CADCOL-02, AC 7; CADCOL-06, AC 7; CADCOL-10, ACs 6 e 7). O
 * limiar é medido colado dos dois lados: 1.535 e 1.536 px (L-029).
 * ====================================================================== */

interface AbaMedida {
  readonly aba: string;
  readonly caminho: string;
  readonly abrir: (page: Page, caminho: string) => Promise<void>;
  readonly tabela: (page: Page) => Locator;
  readonly painel: (page: Page) => Locator;
  readonly titulo: (page: Page) => Locator;
  readonly botao: (page: Page, nome: string) => Locator;
  readonly item: string;
  readonly vazio: string;
  readonly dica: string;
  readonly novo: (page: Page) => Locator;
  readonly semearAMais: () => Promise<void>;
  readonly ultimo: string;
}

const ABAS_MEDIDAS: ReadonlyArray<AbaMedida> = [
  {
    aba: "Categorias",
    caminho: CATEGORIAS,
    abrir,
    tabela,
    painel,
    titulo: tituloDoPainel,
    botao: botaoDaLinha,
    item: "Categoria Um",
    vazio: "Nenhuma categoria aberta",
    dica: DICA,
    novo: botaoNova,
    semearAMais: semearCategoriasAMais,
    ultimo: "Categoria Um",
  },
  {
    aba: "Meios de pagamento",
    caminho: MEIOS,
    abrir: abrirMeios,
    tabela: tabelaDeMeios,
    painel: painelDoMeio,
    titulo: tituloDoPainelDoMeio,
    botao: botaoDoMeio,
    item: "Cartão Roxo",
    vazio: "Nenhum meio aberto",
    dica: DICA_DO_MEIO,
    novo: botaoNovoMeio,
    semearAMais: semearMeiosAMais,
    ultimo: "Rótulo Extra 12",
  },
];

/** O invólucro do painel: a coluna da direita a partir de 1.536 px. */
function colunaDo(painelDaAba: Locator): Locator {
  return painelDaAba.locator("xpath=..");
}

/** O bloco do cabeçalho: o título, a ação e as abas. */
function cabecalho(page: Page): Locator {
  return abas(page).locator("xpath=..");
}

function menuDoApp(page: Page): Locator {
  return page.getByRole("complementary", { name: "Menu do myBilling" });
}

async function rolarAteOFim(page: Page): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
}

for (const a of ABAS_MEDIDAS) {
  test.describe(`a partir de 1.536 px, na aba ${a.aba}`, () => {
    test(`em 1.535 px o painel aberto fica entre as abas e a tabela e, sem nada aberto, não aparece; em 1.536 px fica à direita da tabela e, sem nada aberto, mostra "${a.vazio}" com a dica (CADCOL-09, ACs 1, 3, 5 e 6)`, async ({
      page,
    }) => {
      const vazio = page.getByRole("heading", { level: 2, name: a.vazio });

      await page.setViewportSize({ width: 1535, height: 900 });
      await a.abrir(page, a.caminho);
      await expect(a.painel(page)).toHaveCount(0);
      await expect(vazio).toBeHidden();
      await expect(page.getByText(a.dica)).toBeHidden();

      await a.botao(page, a.item).click();
      await expect(a.titulo(page)).toHaveText(a.item);
      const doCabecalho = await caixa(abas(page));
      const acima = await caixa(a.painel(page));
      expect(acima.y).toBeGreaterThanOrEqual(doCabecalho.y + doCabecalho.height);
      expect(acima.y + acima.height).toBeLessThanOrEqual((await caixa(a.tabela(page))).y);

      await page.setViewportSize({ width: 1536, height: 900 });
      const aDireita = await caixa(a.painel(page));
      const daTabela = await caixa(a.tabela(page));
      expect(aDireita.x).toBeGreaterThanOrEqual(daTabela.x + daTabela.width);

      await a.abrir(page, a.caminho);
      await expect(a.painel(page)).toHaveCount(0);
      await expect(vazio).toBeVisible();
      await expect(page.getByText(a.dica)).toBeVisible();
      const daTabelaSemNada = await caixa(a.tabela(page));
      expect((await caixa(vazio)).x).toBeGreaterThanOrEqual(
        daTabelaSemNada.x + daTabelaSemNada.width,
      );

      await page.setViewportSize({ width: 1535, height: 900 });
      await expect(vazio).toBeHidden();
      await expect(page.getByText(a.dica)).toBeHidden();
    });

    test("em 1.535 px, com o item aberto, o cabeçalho, o painel e a tabela medem até 1.024 px, centrados à direita do menu (CADCOL-09, AC 5)", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1535, height: 900 });
      await a.abrir(page, a.caminho);
      await a.botao(page, a.item).click();
      await expect(a.titulo(page)).toHaveText(a.item);

      const menu = await caixa(menuDoApp(page));
      for (const [nome, alvo] of [
        ["cabeçalho", cabecalho(page)],
        ["painel", a.painel(page)],
        ["tabela", a.tabela(page)],
      ] as const) {
        const medida = await caixa(alvo);
        expect(medida.width, nome).toBeLessThanOrEqual(1024);
        const folgaEsquerda = medida.x - (menu.x + menu.width);
        const folgaDireita = 1535 - (medida.x + medida.width);
        expect(Math.abs(folgaEsquerda - folgaDireita), nome).toBeLessThanOrEqual(1);
      }
    });

    for (const largura of [1536, 1920]) {
      test(`em ${largura} px, a coluna mede 384 px, com a linha fina à esquerda; o cabeçalho e a tabela medem até 1.100 px, centrados entre o menu e a coluna, sem vão entre os dois com o painel alto (CADCOL-09, ACs 1 e 4)`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: largura, height: 900 });
        await a.abrir(page, a.caminho);
        await a.botao(page, a.item).click();
        await expect(a.titulo(page)).toHaveText(a.item);

        const daColuna = await caixa(colunaDo(a.painel(page)));
        expect(Math.abs(daColuna.width - 384)).toBeLessThanOrEqual(1);
        expect(daColuna.x + daColuna.width).toBeLessThanOrEqual(largura);
        const linhaFina = await colunaDo(a.painel(page)).evaluate((elemento) => {
          const estilo = getComputedStyle(elemento);
          return { largura: estilo.borderLeftWidth, tipo: estilo.borderLeftStyle };
        });
        expect(linhaFina).toEqual({ largura: "1px", tipo: "solid" });

        const menu = await caixa(menuDoApp(page));
        for (const [nome, alvo] of [
          ["cabeçalho", cabecalho(page)],
          ["tabela", a.tabela(page)],
        ] as const) {
          const medida = await caixa(alvo);
          expect(medida.width, nome).toBeLessThanOrEqual(1100);
          const folgaEsquerda = medida.x - (menu.x + menu.width);
          const folgaDireita = daColuna.x - (medida.x + medida.width);
          expect(Math.abs(folgaEsquerda - folgaDireita), nome).toBeLessThanOrEqual(1);
        }

        /* O painel aberto é mais alto que o cabeçalho e a tabela juntos, e
           não abre vão entre os dois: a tabela vem logo abaixo do cabeçalho,
           com o respiro de 24 px dele. */
        const doCabecalho = await caixa(cabecalho(page));
        const daTabela = await caixa(a.tabela(page));
        expect((await caixa(a.painel(page))).height).toBeGreaterThan(
          daTabela.y + daTabela.height - doCabecalho.y,
        );
        expect(daTabela.y - (doCabecalho.y + doCabecalho.height)).toBeLessThanOrEqual(25);
      });

      test(`rolando até o fim em ${largura} × 480, com linhas a mais, o título do painel continua à vista (CADCOL-09, AC 2)`, async ({
        page,
      }) => {
        await a.semearAMais();
        await page.setViewportSize({ width: largura, height: 480 });
        await a.abrir(page, a.caminho);
        await a.botao(page, a.item).click();
        await expect(a.titulo(page)).toHaveText(a.item);

        await rolarAteOFim(page);

        await expect(a.botao(page, a.ultimo)).toBeInViewport();
        await expect(a.titulo(page)).toBeInViewport();
      });
    }
  });
}

/*
 * Toda linha das duas tabelas, com o nome que mais aperta cada uma (L-030,
 * L-045): 59 caracteres na categoria e 40 no meio, o limite dele. Ao lado do
 * painel a tabela tem 864 px em 1.536 px, e o nome longo pode quebrar: o
 * Edge Case "Nome longo: quebra linha, e só aquela linha fica mais alta". Toda
 * linha de nome curto mede até 48 px; e toda linha, a longa inclusive, mede só
 * o botão do nome mais o respiro da célula, então nenhuma cresce por outra
 * coluna, e o nome longo não faz crescer as outras linhas.
 */
for (const largura of [1536, 1920]) {
  test(`em ${largura} px, com ponteiro fino, toda linha de nome curto das duas tabelas mede até 48 px, e a de nome longo só cresce pelo nome (CADCOL-02, AC 7; CADCOL-06, AC 7; Edge Cases)`, async ({
    page,
  }) => {
    await semearCategoriasAMais();
    await inserirCategoria(NOME_LONGO, "verde-agua");
    await semearMeiosAMais();
    await inserirMeio(MEIO_LONGO, "CARTAO_CREDITO", { fechamento: 28, vencimento: 28 });
    await page.setViewportSize({ width: largura, height: 900 });
    expect(await page.evaluate(() => window.matchMedia("(pointer: fine)").matches)).toBe(true);

    for (const [aba, caminho, abrirAba, daTabela, longo, total] of [
      ["Categorias", CATEGORIAS, abrir, tabela, NOME_LONGO, 15],
      ["Meios de pagamento", MEIOS, abrirMeios, tabelaDeMeios, MEIO_LONGO, 17],
    ] as const) {
      await abrirAba(page, caminho);
      const linhas = await daTabela(page)
        .locator("tbody tr")
        .evaluateAll((trs) =>
          trs.map((tr) => {
            const botao = tr.querySelector("button");
            return {
              nome: botao?.textContent ?? "",
              altura: tr.getBoundingClientRect().height,
              doBotao: botao?.getBoundingClientRect().height ?? 0,
            };
          }),
        );
      expect(linhas, aba).toHaveLength(total);
      expect(linhas.map(({ nome }) => nome)).toContain(longo);
      for (const { nome, altura, doBotao } of linhas) {
        /* O respiro de 4 px em cima e embaixo e a linha fina de baixo. */
        expect(altura - doBotao, `${aba}: ${nome}`).toBeLessThanOrEqual(9.5);
        if (nome !== longo) {
          expect(altura, `${aba}: ${nome}`).toBeLessThanOrEqual(48);
        }
      }
    }
  });
}

/* O formulário de criação mais alto que a janela, a partir de 1.536 px: a
   coluna fica presa no alto e rola por conta própria (Edge Cases). */
test("em 1.920 × 480, o formulário de novo meio, mais alto que a janela, rola dentro da coluna, que continua presa no alto", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 480 });
  await abrirMeios(page, MEIOS);
  await botaoNovoMeio(page).click();
  const criar = formularioDeNovoMeio(page).getByRole("button", { name: "Criar meio" });
  await expect(criar).toBeAttached();

  const rolagem = await painelDoMeio(page).evaluate((aside) => ({
    altura: aside.clientHeight,
    conteudo: aside.scrollHeight,
    estouro: getComputedStyle(aside).overflowY,
  }));
  expect(rolagem.altura).toBeLessThanOrEqual(480);
  expect(rolagem.conteudo).toBeGreaterThan(rolagem.altura);
  expect(rolagem.estouro).toBe("auto");

  /* O fim do formulário chega rolando a coluna, e não a página. */
  await criar.scrollIntoViewIfNeeded();
  await expect(criar).toBeInViewport();
  await expect(tituloDoPainelDoMeio(page)).toHaveText("Novo meio de pagamento");
  expect(await painelDoMeio(page).evaluate((aside) => aside.scrollTop)).toBeGreaterThan(0);
});

/* No toque, em 1.920 px, com o painel aberto nas duas abas: todo alvo com 44
   × 44, e os formulários de criação abertos pela ação (CADCOL-10, ACs 6 e 7;
   L-044, L-060). */
test.describe("com ponteiro grosso, em 1.920 px", () => {
  test.use({ hasTouch: true, viewport: { width: 1920, height: 1080 } });

  test("o botão de cada linha, Fechar, as abas, as ações, as opções de cor e os botões dos formulários medem ao menos 44 × 44, nas duas abas (CADCOL-10, ACs 6 e 7)", async ({
    page,
  }) => {
    await abrir(page, CATEGORIAS);
    expect(await page.evaluate(() => window.matchMedia("(pointer: coarse)").matches)).toBe(true);
    for (const botao of await tabela(page).getByRole("button").all()) {
      await medirAlvo(botao, (await botao.textContent()) ?? "linha");
    }
    await botaoDaLinha(page, "Categoria Um").click();
    await expect(tituloDoPainel(page)).toHaveText("Categoria Um");
    const opcoes = painel(page)
      .getByRole("group", { name: "Cor de Categoria Um" })
      .locator("label");
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
    await botaoNova(page).click();
    await expect(tituloDoPainel(page)).toHaveText("Nova categoria");
    for (const nome of ["Criar categoria", "Cancelar"]) {
      await medirAlvo(painel(page).getByRole("button", { name: nome }), nome);
    }

    await abrirMeios(page, MEIOS);
    for (const botao of await tabelaDeMeios(page).getByRole("button").all()) {
      await medirAlvo(botao, (await botao.textContent()) ?? "linha");
    }
    await botaoDoMeio(page, "Cartão Roxo").click();
    await expect(tituloDoPainelDoMeio(page)).toHaveText("Cartão Roxo");
    for (const [nome, alvo] of [
      ["Salvar alterações", painelDoMeio(page).getByRole("button", { name: "Salvar alterações" })],
      ["Fechar", painelDoMeio(page).getByRole("button", { name: "Fechar" })],
      ["Ver em Lançamentos", painelDoMeio(page).getByRole("link", { name: "Ver em Lançamentos" })],
      ["aba Categorias", abas(page).getByRole("link", { name: "Categorias" })],
      ["aba Meios de pagamento", abas(page).getByRole("link", { name: "Meios de pagamento" })],
      ["+ Novo meio", botaoNovoMeio(page)],
    ] as const) {
      await medirAlvo(alvo, nome);
    }
    await botaoNovoMeio(page).click();
    await expect(tituloDoPainelDoMeio(page)).toHaveText("Novo meio de pagamento");
    for (const nome of ["Criar meio", "Cancelar"]) {
      await medirAlvo(painelDoMeio(page).getByRole("button", { name: nome }), nome);
    }
  });
});

/*
 * Com ponteiro fino a partir de 768 px, só o botão da linha baixa para 36 px:
 * todo outro alvo continua com 44 × 44, em qualquer largura e ponteiro
 * (CADCOL-10, AC 7; L-064). Medido colado no limiar, em 768 px, e na coluna
 * de 1.536 px, com o painel aberto e com os dois formulários de criação
 * abertos pela ação (L-060).
 */
for (const largura of [768, 1536]) {
  test(`em ${largura} px, com ponteiro fino, as abas, as ações, Fechar, os botões dos formulários, Ver em Lançamentos e as opções de cor medem ao menos 44 × 44, nas duas abas (CADCOL-10, AC 7)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: largura, height: 900 });
    await abrir(page, CATEGORIAS);
    expect(await page.evaluate(() => window.matchMedia("(pointer: fine)").matches)).toBe(true);

    await botaoDaLinha(page, "Categoria Um").click();
    await expect(tituloDoPainel(page)).toHaveText("Categoria Um");
    const opcoes = painel(page)
      .getByRole("group", { name: "Cor de Categoria Um" })
      .locator("label");
    await expect(opcoes).toHaveCount(11);
    for (const opcao of await opcoes.all()) {
      await medirAlvo(opcao, (await opcao.textContent()) ?? "opção");
    }
    for (const [nome, alvo] of [
      ["aba Categorias", abas(page).getByRole("link", { name: "Categorias" })],
      ["aba Meios de pagamento", abas(page).getByRole("link", { name: "Meios de pagamento" })],
      ["+ Nova categoria", botaoNova(page)],
      ["Fechar", painel(page).getByRole("button", { name: "Fechar" })],
      ["Salvar", painel(page).getByRole("button", { name: "Salvar" })],
      ["Ver em Lançamentos", painel(page).getByRole("link", { name: "Ver em Lançamentos" })],
    ] as const) {
      await medirAlvo(alvo, nome);
    }
    await botaoNova(page).click();
    await expect(tituloDoPainel(page)).toHaveText("Nova categoria");
    for (const nome of ["Criar categoria", "Cancelar", "Fechar"]) {
      await medirAlvo(painel(page).getByRole("button", { name: nome }), `${nome} da nova`);
    }

    await abrirMeios(page, MEIOS);
    await botaoDoMeio(page, "Cartão Roxo").click();
    await expect(tituloDoPainelDoMeio(page)).toHaveText("Cartão Roxo");
    for (const [nome, alvo] of [
      ["aba Categorias", abas(page).getByRole("link", { name: "Categorias" })],
      ["aba Meios de pagamento", abas(page).getByRole("link", { name: "Meios de pagamento" })],
      ["+ Novo meio", botaoNovoMeio(page)],
      ["Fechar", painelDoMeio(page).getByRole("button", { name: "Fechar" })],
      ["Salvar alterações", painelDoMeio(page).getByRole("button", { name: "Salvar alterações" })],
      ["Ver em Lançamentos", painelDoMeio(page).getByRole("link", { name: "Ver em Lançamentos" })],
    ] as const) {
      await medirAlvo(alvo, `${nome} na aba de meios`);
    }
    await botaoNovoMeio(page).click();
    await expect(tituloDoPainelDoMeio(page)).toHaveText("Novo meio de pagamento");
    for (const nome of ["Criar meio", "Cancelar", "Fechar"]) {
      await medirAlvo(painelDoMeio(page).getByRole("button", { name: nome }), `${nome} do novo`);
    }
  });
}

/* ========================================================================
 * Nenhuma largura rola de lado (CADCOL-09, AC 7; L-065), escolha do dono em
 * 2026-10-31. As fixtures apertam o que não quebra sozinho:
 * - "Categoria C", cuja cor automática é verde-água: "Automática
 *   (Verde-água)" é o rótulo mais largo da coluna Cor;
 * - um meio de 40 caracteres e uma categoria de 60, o limite de cada um,
 *   numa palavra só.
 * Elas entram só nestes testes, sem mudar o que os outros contam.
 * ====================================================================== */

/** Quarenta caracteres, o limite do nome do meio, numa palavra só. */
const MEIO_DE_UMA_PALAVRA = "CartaoComNomeDeQuarentaLetrasNumaPalavra";
/** Sessenta caracteres, o limite do nome da categoria, numa palavra só. */
const CATEGORIA_DE_UMA_PALAVRA = "CategoriaComNomeDeSessentaLetrasNumaPalavraSoParaApertarTudo";

async function semearPalavrasLongas(): Promise<void> {
  await inserirCategoria("Categoria C");
  await inserirCategoria(CATEGORIA_DE_UMA_PALAVRA);
  await inserirMeio(MEIO_DE_UMA_PALAVRA, "CARTAO_CREDITO", { fechamento: 28, vencimento: 28 });
}

/** O item de nome numa palavra só da aba e o título do formulário de criação dela. */
function extremosDa(a: AbaMedida): { readonly longo: string; readonly criacao: string } {
  return a.aba === "Categorias"
    ? { longo: CATEGORIA_DE_UMA_PALAVRA, criacao: "Nova categoria" }
    : { longo: MEIO_DE_UMA_PALAVRA, criacao: "Novo meio de pagamento" };
}

interface RolagemLateral {
  readonly onde: string;
  readonly pagina: number;
  readonly painel: number;
  /** Quanto o texto do nome numa palavra só passa da tabela; 0 quando cabe nela. */
  readonly nomeForaDaTabela: number;
  /**
   * Quanto o nome numa palavra só, no título do painel e em "Cor de <nome>",
   * passa do painel; 0 quando cabe nele e nos estados sem o item aberto.
   */
  readonly nomeForaDoPainel: number;
  /** As regiões que rolam de lado por conta própria, com o quanto cada uma rola. */
  readonly regioes: ReadonlyArray<string>;
}

/**
 * Quanto o texto à vista do alvo passa da caixa do contêiner dele, a tabela ou
 * o painel, pelo lado que mais passa: 0 quando cada caixa do texto, uma por
 * linha, fica dentro dela. A medida da página não vê o texto que vaza dentro de
 * um invólucro que rola por conta própria (observação 2 da rodada 2), e a do
 * painel não vê o texto cortado com reticências, que não rola (G10 da rodada 3;
 * L-069).
 */
async function textoForaDe(alvo: Locator, conteiner: "table" | "aside"): Promise<number> {
  const excessos = await alvo.evaluate((elemento, seletor) => {
    const caixaDoConteiner = elemento.closest(seletor);
    if (caixaDoConteiner === null) {
      return [];
    }
    const { left, right } = caixaDoConteiner.getBoundingClientRect();
    const medidos: number[] = [];
    const andarilho = document.createTreeWalker(elemento, NodeFilter.SHOW_TEXT);
    for (let no = andarilho.nextNode(); no !== null; no = andarilho.nextNode()) {
      const trecho = document.createRange();
      trecho.selectNodeContents(no);
      for (const retangulo of trecho.getClientRects()) {
        if (retangulo.width > 0 && retangulo.height > 0) {
          medidos.push(Math.max(0, left - retangulo.left, retangulo.right - right));
        }
      }
    }
    return medidos;
  }, conteiner);
  if (excessos.length === 0) {
    throw new Error(`o nome não tem texto à vista dentro de ${conteiner}`);
  }
  return Math.max(...excessos);
}

/**
 * Quanto o nome numa palavra só passa do painel do item aberto, pelo texto que
 * mais passa: o título e, na categoria, a legenda "Cor de <nome>".
 */
async function textoDoNomeForaDoPainel(a: AbaMedida, page: Page, nome: string): Promise<number> {
  const titulo = a.titulo(page);
  const cor = a.painel(page).getByRole("group", { name: `Cor de ${nome}` });
  const textos = a.aba === "Categorias" ? [titulo, cor.locator("legend")] : [titulo];
  const excessos: number[] = [];
  for (const texto of textos) {
    excessos.push(await textoForaDe(texto, "aside"));
  }
  return Math.max(...excessos);
}

/**
 * Todo elemento da página com `overflow-x` diferente de `visible` e o conteúdo
 * mais largo que a caixa, com o quanto ele rola: uma lista num invólucro que
 * rola por conta própria esconde da página e do painel uma tabela mais larga
 * que ele (G9 da rodada 3; L-068). Ficam fora:
 * - os campos de texto, que rolam o próprio valor, como todo `input`;
 * - o texto só para o leitor de tela (`sr-only`), numa caixa de 1 × 1 px que
 *   corta o texto de propósito: não há nada à vista para rolar.
 */
async function regioesQueRolamDeLado(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const achadas: string[] = [];
    for (const elemento of document.querySelectorAll("*")) {
      if (
        elemento instanceof HTMLInputElement ||
        elemento instanceof HTMLTextAreaElement ||
        (elemento.clientWidth <= 1 && elemento.clientHeight <= 1)
      ) {
        continue;
      }
      const excesso = elemento.scrollWidth - elemento.clientWidth;
      if (getComputedStyle(elemento).overflowX !== "visible" && excesso > 0) {
        achadas.push(`${elemento.tagName}.${[...elemento.classList].join(".")} +${excesso}`);
      }
    }
    return achadas;
  });
}

/**
 * Percorre, em cada aba, os três estados: nada aberto, o item de nome numa
 * palavra só aberto e o formulário de criação aberto pela ação. Em cada um,
 * mede em cada largura a rolagem lateral da página e a do painel, que a
 * partir de 1.536 px rola por conta própria, quanto o texto do nome numa
 * palavra só passa da tabela e, com o item aberto, do painel, e as regiões que
 * rolam de lado dentro da página.
 */
async function medirRolagemLateral(
  page: Page,
  larguras: ReadonlyArray<number>,
): Promise<RolagemLateral[]> {
  const medidas: RolagemLateral[] = [];
  for (const a of ABAS_MEDIDAS) {
    const { longo, criacao } = extremosDa(a);
    await a.abrir(page, a.caminho);
    const estados: ReadonlyArray<readonly [string, () => Promise<void>]> = [
      ["nada aberto", async () => {}],
      [
        "item aberto",
        async () => {
          await a.botao(page, longo).click();
          await expect(a.titulo(page)).toHaveText(longo);
        },
      ],
      [
        "formulário de criação",
        async () => {
          await a.novo(page).click();
          await expect(a.titulo(page)).toHaveText(criacao);
        },
      ],
    ];
    for (const [estado, preparar] of estados) {
      await preparar();
      for (const largura of larguras) {
        await page.setViewportSize({ width: largura, height: 900 });
        const painelDaAba = a.painel(page);
        medidas.push({
          onde: `${a.aba}, ${estado}, ${largura} px`,
          pagina: await transbordoHorizontal(page),
          painel:
            (await painelDaAba.count()) === 0
              ? 0
              : await painelDaAba.evaluate((aside) => aside.scrollWidth - aside.clientWidth),
          nomeForaDaTabela: await textoForaDe(a.botao(page, longo), "table"),
          nomeForaDoPainel:
            estado === "item aberto" ? await textoDoNomeForaDoPainel(a, page, longo) : 0,
          regioes: await regioesQueRolamDeLado(page),
        });
      }
    }
  }
  return medidas;
}

test("nas duas abas, de 400 a 1.920 px e colado em cada limiar, nada rola de lado e o nome numa palavra só fica dentro da tabela e do painel: sem nada aberto, com o item de nome numa palavra só aberto e com o formulário de criação (CADCOL-09, AC 7; Edge Cases)", async ({
  page,
}) => {
  await semearPalavrasLongas();
  await page.setViewportSize({ width: 1280, height: 900 });
  expect(await page.evaluate(() => window.matchMedia("(pointer: fine)").matches)).toBe(true);

  const medidas = await medirRolagemLateral(
    page,
    [400, 767, 768, 1023, 1024, 1279, 1280, 1535, 1536, 1920],
  );

  expect(medidas).toHaveLength(60);
  expect(
    medidas.filter(({ nomeForaDaTabela }) => nomeForaDaTabela > 1),
    "o nome numa palavra só fora da tabela",
  ).toEqual([]);
  expect(
    medidas.filter(({ nomeForaDoPainel }) => nomeForaDoPainel > 1),
    "o nome numa palavra só fora do painel",
  ).toEqual([]);
  expect(medidas.filter(({ pagina, painel }) => pagina > 0 || painel > 0)).toEqual([]);
  expect(
    medidas.filter(({ regioes }) => regioes.length > 0),
    "uma região que rola de lado",
  ).toEqual([]);
});

/* No toque, em 768 px, a tabela leva o respiro do toque, mais largo que o do
   mouse (L-065). */
test.describe("com ponteiro grosso, em 768 px", () => {
  test.use({ hasTouch: true, viewport: { width: 768, height: 900 } });

  test("nas duas abas, nada rola de lado e o nome numa palavra só fica dentro da tabela e do painel: sem nada aberto, com o item de nome numa palavra só aberto e com o formulário de criação (CADCOL-09, AC 7; Edge Cases)", async ({
    page,
  }) => {
    await semearPalavrasLongas();
    expect(await page.evaluate(() => window.matchMedia("(pointer: coarse)").matches)).toBe(true);

    const medidas = await medirRolagemLateral(page, [768]);

    expect(medidas).toHaveLength(6);
    expect(
      medidas.filter(({ nomeForaDaTabela }) => nomeForaDaTabela > 1),
      "o nome numa palavra só fora da tabela",
    ).toEqual([]);
    expect(
      medidas.filter(({ nomeForaDoPainel }) => nomeForaDoPainel > 1),
      "o nome numa palavra só fora do painel",
    ).toEqual([]);
    expect(medidas.filter(({ pagina, painel }) => pagina > 0 || painel > 0)).toEqual([]);
    expect(
      medidas.filter(({ regioes }) => regioes.length > 0),
      "uma região que rola de lado",
    ).toEqual([]);
  });
});

/*
 * "+ Nova categoria" e "+ Novo meio" ao lado do título, em todas as larguras
 * (CADCOL-01, AC 6; L-055): a ordem do DOM não prova o lugar na tela. Medido
 * no celular e colado no limiar em que a grade da coluna muda.
 */
for (const largura of [400, 1535, 1536]) {
  test(`em ${largura} px, "+ Nova categoria" e "+ Novo meio" ficam ao lado do título "Cadastros", na faixa vertical dele e à direita (CADCOL-01, AC 6)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: largura, height: 900 });
    for (const a of ABAS_MEDIDAS) {
      await a.abrir(page, a.caminho);
      const titulo = await caixa(page.getByRole("heading", { level: 1, name: "Cadastros" }));
      const acao = await caixa(a.novo(page));
      expect(acao.y, `${a.aba}: a ação começa acima da base do título`).toBeLessThan(
        titulo.y + titulo.height,
      );
      expect(
        acao.y + acao.height,
        `${a.aba}: a ação termina abaixo do topo do título`,
      ).toBeGreaterThan(titulo.y);
      expect(acao.x, `${a.aba}: a ação fica à direita do título`).toBeGreaterThanOrEqual(
        titulo.x + titulo.width,
      );
    }
  });
}

/* ========================================================================
 * A tela fica parada ao salvar (CADCOL-04, AC 16; CADCOL-07, AC 16), a
 * escolha do dono em 2026-10-31, como em Todo mês. Antes de salvar, a página
 * vai até o fim e volta até o controle: ela fica rolada, e uma rolagem até o
 * alto muda a medida (L-066). Abaixo de 1.536 px o painel fica acima da
 * tabela, e o controle começa fora da janela. Em 1.920 px o painel fica preso
 * e rola por conta própria, e o que se mede ali é também a rolagem dele.
 * ====================================================================== */

interface Gravacao {
  readonly caso: string;
  readonly abrirItem: (page: Page) => Promise<void>;
  readonly painel: (page: Page) => Locator;
  readonly controle: (page: Page) => Locator;
  readonly preencher: (page: Page) => Promise<void>;
  readonly aviso: string;
  /** Espera a página relida, com a linha já mudada. */
  readonly relida: (page: Page) => Promise<void>;
}

async function abrirCategoriaUm(page: Page): Promise<void> {
  await abrir(page, CATEGORIAS);
  await botaoDaLinha(page, "Categoria Um").click();
  await expect(tituloDoPainel(page)).toHaveText("Categoria Um");
}

async function abrirCartaoRoxo(page: Page): Promise<void> {
  await abrirMeios(page, MEIOS);
  await botaoDoMeio(page, "Cartão Roxo").click();
  await expect(tituloDoPainelDoMeio(page)).toHaveText("Cartão Roxo");
}

/*
 * Um caso por cláusula do AC, e não por controle (L-067): o nome e os dias do
 * meio passam pelo mesmo "Salvar alterações", mas só o nome muda a ordem da
 * tabela e o título do painel.
 */
const GRAVACOES: ReadonlyArray<Gravacao> = [
  {
    caso: "a cor",
    abrirItem: abrirCategoriaUm,
    painel,
    controle: (page) =>
      painel(page)
        .getByRole("group", { name: "Cor de Categoria Um" })
        .getByText("Verde", { exact: true }),
    preencher: async () => {},
    aviso: "Cor trocada.",
    relida: async (page) => {
      const verde = await corDoToken(page, "--cat-verde-fundo");
      await expect.poll(() => fundo(pillDaLinha(page, "Categoria Um"))).toBe(verde);
    },
  },
  {
    caso: "o nome da categoria",
    abrirItem: abrirCategoriaUm,
    painel,
    controle: (page) => painel(page).getByRole("button", { name: "Salvar" }),
    preencher: async (page) => {
      await painel(page).getByRole("textbox", { name: "Nome" }).fill("Categoria Dez");
    },
    aviso: "Categoria renomeada.",
    relida: async (page) => {
      await expect(botaoDaLinha(page, "Categoria Dez")).toBeAttached();
    },
  },
  {
    caso: "os dias do meio",
    abrirItem: abrirCartaoRoxo,
    painel: painelDoMeio,
    controle: (page) =>
      formularioDoMeio(page, "Cartão Roxo").getByRole("button", { name: "Salvar alterações" }),
    preencher: async (page) => {
      const form = formularioDoMeio(page, "Cartão Roxo");
      await form.getByRole("textbox", { name: "Dia de fechamento" }).fill("10");
      await form.getByRole("textbox", { name: "Dia de vencimento" }).fill("17");
    },
    aviso: "Meio de pagamento salvo.",
    relida: async (page) => {
      await expect(celulaDoMeio(page, "Cartão Roxo", 2)).toHaveText("fecha dia 10");
    },
  },
  {
    caso: "o nome do meio",
    abrirItem: abrirCartaoRoxo,
    painel: painelDoMeio,
    /* Pelo painel, e não pelo formulário: ao renomear, ele passa a "Editar Cartão Lilás". */
    controle: (page) => painelDoMeio(page).getByRole("button", { name: "Salvar alterações" }),
    preencher: async (page) => {
      await formularioDoMeio(page, "Cartão Roxo")
        .getByRole("textbox", { name: "Nome" })
        .fill("Cartão Lilás");
    },
    aviso: "Meio de pagamento salvo.",
    relida: async (page) => {
      await expect(botaoDoMeio(page, "Cartão Lilás")).toBeAttached();
    },
  },
];

/** A rolagem da página e a da coluna do painel, que só rola a partir de 1.536 px. */
async function rolagens(
  page: Page,
  painelDaAba: Locator,
): Promise<{ pagina: number; coluna: number }> {
  return {
    pagina: await page.evaluate(() => window.scrollY),
    coluna: await painelDaAba.evaluate((aside) => aside.scrollTop),
  };
}

for (const [largura, altura] of [
  [400, 700],
  [1280, 480],
  [1920, 480],
] as const) {
  for (const g of GRAVACOES) {
    test(`em ${largura} × ${altura}, salvar ${g.caso} deixa a página e a coluna do painel onde estavam, com o controle inteiro à vista (CADCOL-04, AC 16; CADCOL-07, AC 16)`, async ({
      page,
    }) => {
      await semearCategoriasAMais();
      await semearMeiosAMais();
      await page.setViewportSize({ width: largura, height: altura });
      await g.abrirItem(page);
      await g.preencher(page);
      const controle = g.controle(page);
      await rolarAteOFim(page);
      if (largura < 1536) {
        await expect(controle).not.toBeInViewport();
      }
      await controle.evaluate((elemento) => elemento.scrollIntoView({ block: "center" }));
      const antes = await rolagens(page, g.painel(page));
      expect(antes.pagina, "a página rolada antes de salvar").toBeGreaterThan(0);

      await controle.click();

      await expect(aviso(page)).toHaveText(g.aviso);
      await g.relida(page);
      await doisQuadros(page);
      const depois = await rolagens(page, g.painel(page));
      expect(Math.abs(depois.pagina - antes.pagina), "rolagem da página").toBeLessThanOrEqual(1);
      expect(Math.abs(depois.coluna - antes.coluna), "rolagem da coluna").toBeLessThanOrEqual(1);
      await expect(controle).toBeInViewport({ ratio: 1 });
    });
  }
}
