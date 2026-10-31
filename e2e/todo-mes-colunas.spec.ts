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
 * **Todo mês em linhas, com o fixo aberto no painel, de ponta a ponta**
 * (FIXCOL-01 a FIXCOL-09).
 *
 * Março de 2026, semeado pelo banco antes de cada teste, com os fixos do
 * design:
 * - Fixo A: despesa, dia 5, vigências de R$ 90,00 (janeiro), R$ 100,00
 *   (fevereiro) e R$ 110,00 (maio); a ocorrência de março entra gravada,
 *   confirmada em R$ 105,00 sobre R$ 100,00;
 * - Fixo B: despesa, dia 10, R$ 50,00, sem ocorrência: a tela a cria;
 * - Fixo C: despesa, dia 10, encerrado com fim em fevereiro; a ocorrência de
 *   março entra paga, R$ 30,00;
 * - Fixo D: despesa, dia 1, começa em junho, R$ 70,00;
 * - Entrada A: receita, dia 5, R$ 1.000,00, sem ocorrência.
 *
 * Em março, as saídas somam R$ 185,00 (105 + 50 + 30), na ordem D, A, B e C:
 * D vem primeiro pelo dia, embora seja o último no alfabeto. As entradas somam
 * R$ 1.000,00.
 *
 * Layout se prova no navegador, com a caixa medida e o estilo computado,
 * depois de a página estar pronta. As medidas de altura e de largura juntam o
 * fixo confirmado a uma descrição longa em cada tabela, o conteúdo que aperta
 * as outras colunas (L-045). Nomes genéricos e valores redondos (AD-009).
 */

const EMAIL_PERMITIDO = "pessoa-a@example.com";
const MARCO = "2026-03";
/** Longas o bastante para quebrar linha na tabela em toda largura medida. */
const SAIDA_LONGA =
  "Fixo L com uma descrição longa de propósito, que não cabe numa linha só da tabela e quebra para a linha de baixo";
const ENTRADA_LONGA =
  "Entrada L com uma descrição longa de propósito, que não cabe numa linha só da tabela e quebra para a linha de baixo";

let pool: Pool;
let base: CadastroBase;
let ids: { readonly a: string; readonly b: string };

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

interface DadosDoFixo {
  readonly descricao: string;
  readonly natureza?: "DESPESA" | "RECEITA";
  readonly dia: number;
  readonly inicio: string;
  readonly fim?: string;
  readonly encerrado?: boolean;
  readonly categoriaId?: string | null;
  /** `[competência, centavos]`, uma por vigência. */
  readonly vigencias: ReadonlyArray<readonly [string, number]>;
}

async function semearFixo(dados: DadosDoFixo): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO recorrencia (descricao, natureza, categoria_id, usuario_id, meio_pagamento_id,
       competencia_inicio, competencia_fim, dia_vencimento, encerrada_em)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [
      dados.descricao,
      dados.natureza ?? "DESPESA",
      dados.categoriaId === undefined ? base.categoriaId : dados.categoriaId,
      base.usuarioId,
      base.contaId,
      `${dados.inicio}-01`,
      dados.fim === undefined ? null : `${dados.fim}-01`,
      dados.dia,
      dados.encerrado === true ? new Date() : null,
    ],
  );
  const id = rows[0]?.id;
  if (id === undefined) {
    throw new Error(`${dados.descricao} não foi gravado`);
  }
  for (const [desde, centavos] of dados.vigencias) {
    await pool.query(
      "INSERT INTO recorrencia_versao (recorrencia_id, vigente_desde, valor_previsto_centavos) VALUES ($1, $2, $3)",
      [id, `${desde}-01`, centavos],
    );
  }
  return id;
}

/** A ocorrência de março de um fixo, gravada antes de a tela abrir o mês. */
async function semearOcorrencia(
  recorrenciaId: string,
  dados: {
    readonly descricao: string;
    readonly dia: number;
    readonly categoriaId: string | null;
    readonly valor: number;
    readonly previsto: number;
    readonly pago: boolean;
  },
): Promise<void> {
  const data = `${MARCO}-${String(dados.dia).padStart(2, "0")}`;
  await pool.query(
    `INSERT INTO movimento (natureza, origem, descricao, competencia, data_evento, valor_centavos,
       valor_previsto_centavos, pago_em, categoria_id, usuario_id, meio_pagamento_id, recorrencia_id)
     VALUES ('DESPESA', 'RECORRENCIA', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      dados.descricao,
      `${MARCO}-01`,
      data,
      dados.valor,
      dados.previsto,
      dados.pago ? data : null,
      dados.categoriaId,
      base.usuarioId,
      base.contaId,
      recorrenciaId,
    ],
  );
}

async function semearMarco(): Promise<{ a: string; b: string }> {
  const a = await semearFixo({
    descricao: "Fixo A",
    dia: 5,
    inicio: "2026-01",
    vigencias: [
      ["2026-01", 9000],
      ["2026-02", 10000],
      ["2026-05", 11000],
    ],
  });
  await semearOcorrencia(a, {
    descricao: "Fixo A",
    dia: 5,
    categoriaId: base.categoriaId,
    valor: 10500,
    previsto: 10000,
    pago: false,
  });
  const b = await semearFixo({
    descricao: "Fixo B",
    dia: 10,
    inicio: MARCO,
    vigencias: [[MARCO, 5000]],
  });
  const c = await semearFixo({
    descricao: "Fixo C",
    dia: 10,
    inicio: "2026-01",
    fim: "2026-02",
    encerrado: true,
    categoriaId: null,
    vigencias: [["2026-01", 3000]],
  });
  await semearOcorrencia(c, {
    descricao: "Fixo C",
    dia: 10,
    categoriaId: null,
    valor: 3000,
    previsto: 3000,
    pago: true,
  });
  await semearFixo({
    descricao: "Fixo D",
    dia: 1,
    inicio: "2026-06",
    vigencias: [["2026-06", 7000]],
  });
  await semearFixo({
    descricao: "Entrada A",
    natureza: "RECEITA",
    dia: 5,
    inicio: MARCO,
    categoriaId: null,
    vigencias: [[MARCO, 100000]],
  });
  return { a, b };
}

/** Uma descrição longa em cada tabela, para medir com o conteúdo que aperta (L-045). */
async function semearDescricoesLongas(): Promise<void> {
  await semearFixo({ descricao: SAIDA_LONGA, dia: 20, inicio: MARCO, vigencias: [[MARCO, 2000]] });
  await semearFixo({
    descricao: ENTRADA_LONGA,
    natureza: "RECEITA",
    dia: 20,
    inicio: MARCO,
    categoriaId: null,
    vigencias: [[MARCO, 2000]],
  });
}

/**
 * Com ponteiro fino, toda linha das duas tabelas mede até 48 px, e só as de
 * descrição longa crescem (FIXCOL-01, AC 10; edge case "Descrição longa").
 * Percorre todas as linhas (L-030).
 */
async function linhasDeAte48(page: Page): Promise<void> {
  expect(await page.evaluate(() => window.matchMedia("(pointer: fine)").matches)).toBe(true);
  const alturas = await page.locator("table tbody tr").evaluateAll((linhas) =>
    linhas.map((tr) => ({
      nome: tr.querySelector("button")?.firstChild?.textContent ?? "",
      altura: tr.getBoundingClientRect().height,
    })),
  );
  const longas = [SAIDA_LONGA, ENTRADA_LONGA];
  const curtas = alturas.filter(({ nome }) => !longas.includes(nome));
  /* Entrada A, Fixo D, Fixo A, Fixo B e Fixo C. */
  expect(curtas.map(({ nome }) => nome).sort()).toEqual([
    "Entrada A",
    "Fixo A",
    "Fixo B",
    "Fixo C",
    "Fixo D",
  ]);
  for (const { nome, altura } of curtas) {
    expect(altura, nome).toBeLessThanOrEqual(48);
  }
  const crescidas = alturas.filter(({ nome }) => longas.includes(nome));
  expect(crescidas).toHaveLength(2);
  for (const { nome, altura } of crescidas) {
    expect(altura, nome).toBeGreaterThan(48);
  }
}

/** Abre a tela e espera o título e as linhas, antes de medir qualquer coisa. */
async function abrir(page: Page, caminho: string): Promise<void> {
  await page.goto(caminho);
  await expect(page.getByRole("heading", { level: 1, name: "Todo mês" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Saídas fixas" })).toBeVisible();
}

/** O botão da linha: o nome dele leva também os selos, como "Fixo C Encerrado". */
function botaoDaLinha(page: Page, descricao: string): Locator {
  return page.getByRole("button", { name: new RegExp(`^${descricao}( |$)`) });
}

function linha(page: Page, descricao: string): Locator {
  return page.getByRole("row").filter({ has: botaoDaLinha(page, descricao) });
}

/** A última célula da linha é a do valor do mês. */
function valorDaLinha(page: Page, descricao: string): Locator {
  return linha(page, descricao).getByRole("cell").last();
}

function painel(page: Page): Locator {
  return page.getByRole("complementary", { name: "Painel do fixo" });
}

function tituloDoPainel(page: Page): Locator {
  return painel(page).getByRole("heading", { level: 2 });
}

/** O dado do painel lido pelo termo: o `dd` logo depois do `dt` com esse texto. */
function dadoDoPainel(page: Page, termo: string): Locator {
  return painel(page)
    .locator("dt")
    .filter({ hasText: new RegExp(`^${termo}$`) })
    .locator("xpath=following-sibling::dd[1]");
}

/** O total do alto: a definição do par cujo termo é `termo`. */
function total(page: Page, termo: string): Locator {
  return page
    .locator("dl > div")
    .filter({ has: page.locator("dt", { hasText: termo }) })
    .locator("dd");
}

/** As descrições das linhas de uma seção, na ordem da tela. */
async function descricoesDa(page: Page, secao: string): Promise<string[]> {
  return page
    .getByRole("region", { name: secao })
    .locator("tbody tr")
    .evaluateAll((linhas) =>
      linhas.map((tr) => tr.querySelector("button")?.firstChild?.textContent ?? ""),
    );
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

async function transbordoHorizontal(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

test("abrindo Todo mês de março antes de qualquer outra tela, as linhas e os totais vêm das ocorrências, e Lançamentos mostra o mesmo total (FIXCOL-02, AC 3; FIXCOL-03, ACs 1 a 3)", async ({
  page,
}) => {
  /* Nenhuma tela abriu março: a ocorrência de B em março ainda não existe. A
     entrada no app abre o mês corrente, que é outro. */
  const antes = await pool.query(
    "SELECT 1 FROM movimento WHERE recorrencia_id = $1 AND competencia = $2",
    [ids.b, `${MARCO}-01`],
  );
  expect(antes.rowCount).toBe(0);

  await abrir(page, `/${MARCO}/fixos`);

  await expect(valorDaLinha(page, "Fixo B")).toHaveText("R$ 50,00");
  await expect(valorDaLinha(page, "Entrada A")).toHaveText("R$ 1.000,00");
  await expect(total(page, "Saídas fixas em Março de 2026")).toHaveText("R$ 185,00");
  await expect(total(page, "Entradas fixas em Março de 2026")).toHaveText("R$ 1.000,00");

  /* O mesmo número no título do bloco "Fixos": A, B e C, com A e B a pagar (L-014). */
  await page.goto(`/${MARCO}/lancamentos`);
  await expect(
    page.getByRole("region", { name: "Fixos" }).getByText("3 · R$ 185,00 · 2 a pagar", {
      exact: true,
    }),
  ).toBeVisible();
});

test('"Entradas fixas" antes de "Saídas fixas", as saídas pelo dia e depois pelo nome, e o título de cada seção com a contagem e o total (FIXCOL-01, ACs 1 a 4; FIXCOL-03, AC 5)', async ({
  page,
}) => {
  await abrir(page, `/${MARCO}/fixos`);

  const entradas = page.getByRole("region", { name: "Entradas fixas" });
  const saidas = page.getByRole("region", { name: "Saídas fixas" });
  expect((await caixa(entradas)).y).toBeLessThan((await caixa(saidas)).y);
  await expect(saidas.getByRole("columnheader")).toHaveText([
    "Descrição",
    "Categoria",
    "Vence",
    "Meio",
    "Valor em Março",
  ]);
  await expect(entradas.getByRole("columnheader")).toHaveText([
    "Descrição",
    "Categoria",
    "Cai",
    "Onde cai",
    "Valor em Março",
  ]);

  expect(await descricoesDa(page, "Saídas fixas")).toEqual([
    "Fixo D",
    "Fixo A",
    "Fixo B",
    "Fixo C",
  ]);
  expect(await descricoesDa(page, "Entradas fixas")).toEqual(["Entrada A"]);
  await expect(saidas.getByText("4 · R$ 185,00", { exact: true })).toBeVisible();
  await expect(entradas.getByText("1 · R$ 1.000,00", { exact: true })).toBeVisible();
});

test('cada linha mostra o que o mês tem: A "confirmado" em R$ 105,00, C "Encerrado" em R$ 30,00, D com "—" e "Começa em Junho de 2026", e B e Entrada A, que começam em março, sem o selo (FIXCOL-01, ACs 8 e 9; FIXCOL-02, ACs 1, 2 e 4; FIXCOL-04, ACs 2 e 3)', async ({
  page,
}) => {
  await abrir(page, `/${MARCO}/fixos`);

  /* "confirmado" à esquerda do valor, e nada mais na célula. */
  await expect(valorDaLinha(page, "Fixo A")).toHaveText(/^confirmado\s*R\$ 105,00$/);
  await expect(valorDaLinha(page, "Fixo A").getByText("confirmado", { exact: true })).toBeVisible();
  await expect(valorDaLinha(page, "Fixo B").getByText("confirmado")).toHaveCount(0);

  await expect(botaoDaLinha(page, "Fixo C").getByText("Encerrado", { exact: true })).toBeVisible();
  await expect(valorDaLinha(page, "Fixo C")).toHaveText("R$ 30,00");

  await expect(valorDaLinha(page, "Fixo D")).toHaveText("—");
  await expect(
    botaoDaLinha(page, "Fixo D").getByText("Começa em Junho de 2026", { exact: true }),
  ).toBeVisible();

  /* Começar no próprio mês aberto não é começar depois: B e Entrada A começam
     em março e ficam sem o selo, na linha e no painel (o lado colado do
     limiar, L-029). */
  for (const descricao of ["Fixo B", "Entrada A"]) {
    await expect(botaoDaLinha(page, descricao)).toBeVisible();
    await expect(botaoDaLinha(page, descricao).getByText(/^Começa em/)).toHaveCount(0);
  }
  await botaoDaLinha(page, "Fixo B").click();
  await expect(tituloDoPainel(page)).toHaveText("Fixo B");
  await expect(painel(page).getByText("em Março de 2026", { exact: true })).toBeVisible();
  await expect(dadoDoPainel(page, "Começou em")).toHaveText("Março de 2026");
  await expect(
    painel(page)
      .locator("dt")
      .filter({ hasText: /^Começa em$/ }),
  ).toHaveCount(0);
});

test('o painel de A mostra "confirmado · previa R$ 100,00", os dados do fixo lidos pelo termo e as três vigências na ordem, com "vale em Março" na de fevereiro; o de Entrada A, "Onde o dinheiro cai" (FIXCOL-04, ACs 1 a 4)', async ({
  page,
}) => {
  /* Uma segunda pessoa, dona do Fixo A: com uma pessoa só, o nome certo
     coincidiria com o de qualquer pessoa (L-024). */
  const { rows } = await pool.query<{ id: string }>(
    "INSERT INTO usuario (nome, email) VALUES ($1, $2) RETURNING id",
    ["Pessoa B", "pessoa-b@example.com"],
  );
  const pessoaB = rows[0]?.id;
  await pool.query("UPDATE recorrencia SET usuario_id = $1 WHERE id = $2", [pessoaB, ids.a]);
  await pool.query("UPDATE movimento SET usuario_id = $1 WHERE recorrencia_id = $2", [
    pessoaB,
    ids.a,
  ]);
  await abrir(page, `/${MARCO}/fixos`);

  await botaoDaLinha(page, "Fixo A").click();

  await expect(tituloDoPainel(page)).toHaveText("Fixo A");
  await expect(painel(page).getByText("Saída fixa · vence dia 5", { exact: true })).toBeVisible();
  await expect(painel(page).getByText("confirmado · previa R$ 100,00")).toBeVisible();
  /* O que a página monta para o painel, cada dado lido pelo termo (AC 3, L-014). */
  await expect(dadoDoPainel(page, "Categoria")).toHaveText("Categoria Um");
  await expect(dadoDoPainel(page, "Meio de pagamento")).toHaveText("Conta Corrente");
  await expect(dadoDoPainel(page, "De quem é")).toHaveText("Pessoa B");
  await expect(dadoDoPainel(page, "Começou em")).toHaveText("Janeiro de 2026");
  await expect(dadoDoPainel(page, "Termina em")).toHaveText("Sem fim");
  const historico = painel(page)
    .getByRole("region", { name: "Valor ao longo dos meses" })
    .getByRole("listitem");
  await expect(historico).toHaveText([
    /^desde Janeiro de 2026\s*R\$ 90,00$/,
    /^desde Fevereiro de 2026\s*vale em Março\s*R\$ 100,00$/,
    /^desde Maio de 2026\s*R\$ 110,00$/,
  ]);
  await expect(historico.getByText("vale em Março")).toHaveCount(1);

  /* Numa entrada, o meio é "Onde o dinheiro cai" (AD-015), e a pessoa é a dela. */
  await botaoDaLinha(page, "Entrada A").click();
  await expect(tituloDoPainel(page)).toHaveText("Entrada A");
  await expect(dadoDoPainel(page, "Onde o dinheiro cai")).toHaveText("Conta Corrente");
  await expect(dadoDoPainel(page, "De quem é")).toHaveText("Pessoa A");
});

test("mudar o valor de B para R$ 60,00 a partir de abril põe a vigência no histórico, e a linha de março segue em R$ 50,00 (FIXCOL-05, ACs 1 e 2)", async ({
  page,
}) => {
  await abrir(page, `/${MARCO}/fixos`);
  await botaoDaLinha(page, "Fixo B").click();

  await painel(page).getByRole("button", { name: "Mudar valor" }).click();
  /* O foco vai ao título do controle: o botão que o abriu sumiu (nota da T8). */
  await expect(painel(page).getByRole("heading", { name: "Mudar o valor" })).toBeFocused();
  await expect(painel(page).getByLabel("Vale a partir de")).toHaveValue(MARCO);
  await painel(page).getByLabel("Novo valor (R$)").fill("60,00");
  await painel(page).getByLabel("Vale a partir de").fill("2026-04");
  await painel(page).getByRole("button", { name: "Registrar" }).click();

  const historico = painel(page)
    .getByRole("region", { name: "Valor ao longo dos meses" })
    .getByRole("listitem");
  await expect(historico).toHaveText([
    /^desde Março de 2026\s*vale em Março\s*R\$ 50,00$/,
    /^desde Abril de 2026\s*R\$ 60,00$/,
  ]);
  await expect(valorDaLinha(page, "Fixo B")).toHaveText("R$ 50,00");
});

test("encerrar a partir de março um fixo que vale em março: o painel diz que ele não aparece mais, e a linha some (FIXCOL-05, AC 8)", async ({
  page,
}) => {
  await semearFixo({
    descricao: "Fixo F",
    dia: 20,
    inicio: "2026-01",
    vigencias: [["2026-01", 4000]],
  });
  await abrir(page, `/${MARCO}/fixos`);
  await expect(linha(page, "Fixo F")).toHaveCount(1);
  await botaoDaLinha(page, "Fixo F").click();

  await painel(page).getByRole("button", { name: "Encerrar", exact: true }).click();
  await expect(painel(page).getByLabel("Encerrar a partir de")).toHaveValue(MARCO);
  await painel(page).getByRole("button", { name: "Encerrar mesmo assim" }).click();

  await expect(painel(page).getByText("Fixo F não aparece mais em Março de 2026.")).toBeVisible();
  await expect(painel(page).getByRole("button", { name: "Fechar" })).toBeVisible();
  await expect(linha(page, "Fixo F")).toHaveCount(0);
});

test('cadastrar "Fixo E" pelo painel mostra a linha nova com o formulário ainda aberto (FIXCOL-06, ACs 2 e 3)', async ({
  page,
}) => {
  await abrir(page, `/${MARCO}/fixos`);

  await page.getByRole("button", { name: "+ Novo fixo" }).click();
  await expect(tituloDoPainel(page)).toHaveText("Novo gasto fixo ou entrada");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const form = painel(page).getByRole("form", { name: "Gasto fixo ou entrada" });
  await form.getByLabel("Descrição").fill("Fixo E");
  await form.getByLabel(/De quanto costuma ser/).fill("20,00");
  await form.getByLabel("Dia de vencimento").fill("15");
  await form.getByRole("button", { name: "Cadastrar gasto fixo" }).click();

  await expect(form.getByRole("status")).toHaveText("Fixo E passa a aparecer em todo mês.");
  await expect(valorDaLinha(page, "Fixo E")).toHaveText("R$ 20,00");
  await expect(form).toBeVisible();
  await expect(form.getByLabel("Descrição")).toHaveValue("");
});

test("abrir A põe `?fixo=` na URL sem recarregar e sem entrada nova no histórico; recarregar mostra A aberto; um `?fixo=` que não é da lista deixa o painel fechado (FIXCOL-09, ACs 1 a 3)", async ({
  page,
}) => {
  await abrir(page, `/${MARCO}/fixos`);
  /* Um recarregamento apagaria o marcador. */
  await page.evaluate(() => {
    (window as unknown as { marcador?: string }).marcador = "sem recarregar";
  });
  const entradasNoHistorico = await page.evaluate(() => window.history.length);

  await botaoDaLinha(page, "Fixo A").click();

  await expect(tituloDoPainel(page)).toHaveText("Fixo A");
  await expect(page).toHaveURL(new RegExp(`/${MARCO}/fixos\\?fixo=${ids.a}$`));
  expect(await page.evaluate(() => (window as unknown as { marcador?: string }).marcador)).toBe(
    "sem recarregar",
  );
  expect(await page.evaluate(() => window.history.length)).toBe(entradasNoHistorico);

  await page.reload();
  await expect(tituloDoPainel(page)).toHaveText("Fixo A");
  await expect(botaoDaLinha(page, "Fixo A")).toHaveAttribute("aria-expanded", "true");

  await abrir(page, `/${MARCO}/fixos?fixo=00000000-0000-4000-8000-000000000000`);
  await expect(painel(page)).toHaveCount(0);
  /* Na tela, e não na página toda: o anúncio de rota do Next também é um
     `alert`, vazio, fora do `main`. */
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Saídas fixas" })).toBeVisible();
});

test("com o teclado: `Tab` até o Fixo B, `Enter` leva o foco ao título do painel, e `Escape` fecha, devolve o foco à linha e tira `?fixo=` (FIXCOL-08, ACs 1 a 4)", async ({
  page,
}) => {
  await abrir(page, `/${MARCO}/fixos`);
  const b = botaoDaLinha(page, "Fixo B");

  for (let vezes = 0; vezes < 60; vezes += 1) {
    if (await b.evaluate((botao) => botao === document.activeElement)) {
      break;
    }
    await page.keyboard.press("Tab");
  }
  await expect(b).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(tituloDoPainel(page)).toHaveText("Fixo B");
  await expect(tituloDoPainel(page)).toBeFocused();
  await expect(page).toHaveURL(/\?fixo=/);

  await page.keyboard.press("Escape");
  await expect(painel(page)).toHaveCount(0);
  await expect(b).toBeFocused();
  await expect(b).toHaveAttribute("aria-expanded", "false");
  await expect(page).toHaveURL(new RegExp(`/${MARCO}/fixos$`));

  /* O espaço também abre (AC 1, a outra tecla). */
  await page.keyboard.press("Shift+Tab");
  await expect(botaoDaLinha(page, "Fixo A")).toBeFocused();
  await page.keyboard.press(" ");
  await expect(tituloDoPainel(page)).toHaveText("Fixo A");
  await expect(tituloDoPainel(page)).toBeFocused();
});

test.describe("em 1.280 px", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("sem nada aberto não há painel; com um fixo ou o cadastro aberto, o painel fica entre os totais e as seções (FIXCOL-07, ACs 5 e 6)", async ({
    page,
  }) => {
    await abrir(page, `/${MARCO}/fixos`);
    await expect(painel(page)).toHaveCount(0);

    const totais = page.locator("dl").filter({ hasText: "Saídas fixas em Março de 2026" });
    const entradas = page.getByRole("region", { name: "Entradas fixas" });
    for (const abrirPainel of [
      () => botaoDaLinha(page, "Fixo B").click(),
      () => page.getByRole("button", { name: "+ Novo fixo" }).click(),
    ]) {
      await abrirPainel();
      await expect(painel(page)).toBeVisible();
      const doPainel = await caixa(painel(page));
      const dosTotais = await caixa(totais);
      expect(doPainel.y).toBeGreaterThanOrEqual(dosTotais.y + dosTotais.height);
      expect(doPainel.y + doPainel.height).toBeLessThanOrEqual((await caixa(entradas)).y);
    }
  });

  test("a linha aberta tem fundo diferente das outras e um filete de 2 px na cor primária à esquerda (FIXCOL-04, AC 7)", async ({
    page,
  }) => {
    await abrir(page, `/${MARCO}/fixos`);
    await botaoDaLinha(page, "Fixo B").click();
    await expect(botaoDaLinha(page, "Fixo B")).toHaveAttribute("aria-expanded", "true");

    const estilo = (alvo: Locator) =>
      alvo.evaluate((tr) => ({
        fundo: getComputedStyle(tr).backgroundColor,
        filete: getComputedStyle(tr.querySelector("td") as HTMLElement).boxShadow,
      }));
    /* A cor primária é o fundo do "+ Novo fixo". */
    const primaria = await page
      .getByRole("button", { name: "+ Novo fixo" })
      .evaluate((botao) => getComputedStyle(botao).backgroundColor);

    /* O Tailwind compõe a sombra com as camadas transparentes do anel: o
       filete é uma das camadas da lista. */
    const filete = `${primaria} 2px 0px 0px 0px inset`;
    const aberta = await estilo(linha(page, "Fixo B"));
    expect(aberta.filete).toContain(filete);
    for (const outra of ["Fixo D", "Fixo A", "Fixo C", "Entrada A"]) {
      const fechada = await estilo(linha(page, outra));
      expect(fechada.fundo, outra).not.toBe(aberta.fundo);
      expect(fechada.filete, outra).not.toContain(primaria);
    }
  });

  test("com ponteiro fino, toda linha das duas tabelas mede até 48 px, inclusive a encerrada, a que começa depois e a confirmada; só as de descrição longa crescem (FIXCOL-01, AC 10)", async ({
    page,
  }) => {
    await semearDescricoesLongas();
    await abrir(page, `/${MARCO}/fixos`);

    await linhasDeAte48(page);
  });

  test("abrir a última linha, com a página rolada, traz o título do painel para dentro da janela (FIXCOL-08, AC 5)", async ({
    page,
  }) => {
    await semearDescricoesLongas();
    await page.setViewportSize({ width: 1280, height: 420 });
    await abrir(page, `/${MARCO}/fixos`);
    const ultima = botaoDaLinha(page, SAIDA_LONGA.slice(0, 6));
    await ultima.scrollIntoViewIfNeeded();
    /* O lugar do painel, logo abaixo dos totais, está fora da janela. */
    await expect(page.locator("dl").filter({ hasText: "Saídas fixas em" })).not.toBeInViewport();

    await ultima.click();

    await expect(tituloDoPainel(page)).toHaveText(SAIDA_LONGA);
    await expect(tituloDoPainel(page)).toBeInViewport();
  });
});

/*
 * O que mais alarga as tabelas: o fixo confirmado, com "confirmado" junto do
 * valor, e uma descrição longa em cada uma. Abaixo de 1.536 px a tela é uma
 * coluna de até 1.024 px, e nenhuma tabela sai dela (FIXCOL-07, AC 5; L-045,
 * L-049).
 */
for (const largura of [1024, 1280, 1440]) {
  test(`em ${largura} px, com o fixo confirmado e as descrições longas, toda tabela termina dentro da sua seção, a coluna mede até 1.024 px e a página não rola de lado (FIXCOL-07, AC 5)`, async ({
    page,
  }) => {
    await semearDescricoesLongas();
    await page.setViewportSize({ width: largura, height: 900 });
    await abrir(page, `/${MARCO}/fixos`);
    await expect(valorDaLinha(page, "Fixo A")).toHaveText(/^confirmado\s*R\$ 105,00$/);

    for (const nome of ["Entradas fixas", "Saídas fixas"]) {
      const secao = await caixa(page.getByRole("region", { name: nome }));
      const tabela = await caixa(page.getByRole("region", { name: nome }).getByRole("table"));
      expect(secao.width, nome).toBeLessThanOrEqual(1024);
      expect(tabela.x, `começo da tabela ${nome}`).toBeGreaterThanOrEqual(secao.x - 0.5);
      expect(tabela.x + tabela.width, `fim da tabela ${nome}`).toBeLessThanOrEqual(
        secao.x + secao.width + 0.5,
      );
    }
    expect(await transbordoHorizontal(page)).toBe(0);
  });
}

/** Mede a caixa de cada alvo e confere os 44 × 44 de TOQUE-01. */
async function alvosDeToque(page: Page): Promise<void> {
  const alvos: Array<[string, Locator]> = [
    ...(["Fixo D", "Fixo A", "Fixo B", "Fixo C", "Entrada A"] as const).map(
      (descricao) => [`linha ${descricao}`, botaoDaLinha(page, descricao)] as [string, Locator],
    ),
    ["Fechar", painel(page).getByRole("button", { name: "Fechar", exact: true })],
    ["Mudar valor", painel(page).getByRole("button", { name: "Mudar valor", exact: true })],
    ["Editar", painel(page).getByRole("button", { name: "Editar", exact: true })],
    ["Encerrar", painel(page).getByRole("button", { name: "Encerrar", exact: true })],
  ];
  for (const [nome, alvo] of alvos) {
    const medida = await caixa(alvo);
    expect(medida.width, nome).toBeGreaterThanOrEqual(44);
    expect(medida.height, nome).toBeGreaterThanOrEqual(44);
  }
}

test.describe("em 400 px, com A aberto", () => {
  test.use({ viewport: { width: 400, height: 800 } });

  test("não há rolagem lateral; cada fixo vem em duas linhas, a descrição e o valor em cima, a categoria, o dia e o meio embaixo, sem cabeçalho; e os alvos medem 44 × 44 (FIXCOL-07, AC 9; FIXCOL-01, AC 11; FIXCOL-08, AC 6)", async ({
    page,
  }) => {
    await abrir(page, `/${MARCO}/fixos`);
    await botaoDaLinha(page, "Fixo A").click();
    await expect(tituloDoPainel(page)).toHaveText("Fixo A");

    expect(await transbordoHorizontal(page)).toBe(0);
    await cabecalhosEscondidos(page);
    await duasLinhasPorFixo(page);
    await alvosDeToque(page);
  });
});

/** Os dez cabeçalhos das duas tabelas existem, e nenhum aparece. */
async function cabecalhosEscondidos(page: Page): Promise<void> {
  const cabecalhos = page.locator("thead th");
  await expect(cabecalhos).toHaveCount(10);
  for (const cabecalho of await cabecalhos.all()) {
    await expect(cabecalho).toBeHidden();
  }
}

/** Em cada linha: descrição e valor na mesma faixa; categoria, dia e meio na faixa de baixo. */
async function duasLinhasPorFixo(page: Page): Promise<void> {
  const linhas = await page.locator("table tbody tr").all();
  expect(linhas).toHaveLength(5);
  for (const tr of linhas) {
    const [descricao, categoria, dia, meio, valor] = await Promise.all(
      [0, 1, 2, 3, 4].map((n) => caixa(tr.locator("td").nth(n))),
    );
    if (!descricao || !categoria || !dia || !meio || !valor) {
      throw new Error("a linha não tem as cinco células");
    }
    const nome = await tr.locator("button").innerText();
    expect(valor.y, `${nome}: valor na faixa da descrição`).toBeLessThan(
      descricao.y + descricao.height,
    );
    expect(valor.y + valor.height, `${nome}: valor na faixa da descrição`).toBeGreaterThan(
      descricao.y,
    );
    for (const [rotulo, embaixo] of [
      ["categoria", categoria],
      ["dia", dia],
      ["meio", meio],
    ] as const) {
      expect(embaixo.y, `${nome}: ${rotulo} embaixo`).toBeGreaterThanOrEqual(
        descricao.y + descricao.height - 0.5,
      );
      expect(embaixo.y, `${nome}: ${rotulo} na faixa da categoria`).toBeLessThan(
        categoria.y + categoria.height,
      );
    }
  }
}

/*
 * O limiar de 768 px, dos dois lados (L-029, L-048): em 767 px, com o ponteiro
 * fino, cada fixo ainda é o cartão de duas linhas, sem cabeçalho, e os alvos
 * têm 44 px; em 768 px, a tabela com os cabeçalhos.
 */
test("em 767 px, com ponteiro fino, o cartão de duas linhas e os alvos de 44 px; em 768 px, a tabela com cabeçalhos (FIXCOL-01, AC 11; FIXCOL-08, AC 6)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 767, height: 900 });
  await abrir(page, `/${MARCO}/fixos`);
  expect(await page.evaluate(() => window.matchMedia("(pointer: fine)").matches)).toBe(true);
  await botaoDaLinha(page, "Fixo A").click();
  await expect(tituloDoPainel(page)).toHaveText("Fixo A");

  await cabecalhosEscondidos(page);
  await duasLinhasPorFixo(page);
  await alvosDeToque(page);

  await page.setViewportSize({ width: 768, height: 900 });
  const cabecalhos = page.locator("thead th");
  await expect(cabecalhos).toHaveCount(10);
  for (const cabecalho of await cabecalhos.all()) {
    await expect(cabecalho).toBeVisible();
  }
  await expect(
    page.getByRole("region", { name: "Saídas fixas" }).getByRole("columnheader"),
  ).toHaveText(["Descrição", "Categoria", "Vence", "Meio", "Valor em Março"]);
});

/*
 * Com ponteiro grosso, a linha e as ações não ficam densas nem no monitor: os
 * alvos continuam com 44 px (TOQUE-01). Medir só abaixo de 768 px não separa a
 * largura da janela do tipo de ponteiro (L-044).
 */
test.describe("com ponteiro grosso, em 1.280 px", () => {
  test.use({ hasTouch: true, viewport: { width: 1280, height: 900 } });

  test('o botão da linha, o "Fechar" e as ações do painel medem ao menos 44 × 44 (FIXCOL-08, AC 6; TOQUE-01)', async ({
    page,
  }) => {
    await abrir(page, `/${MARCO}/fixos`);
    expect(await page.evaluate(() => window.matchMedia("(pointer: coarse)").matches)).toBe(true);
    await botaoDaLinha(page, "Fixo A").tap();
    await expect(tituloDoPainel(page)).toHaveText("Fixo A");

    await alvosDeToque(page);
  });
});

/** O invólucro do painel: a coluna da direita a partir de 1.536 px. */
function coluna(page: Page): Locator {
  return painel(page).locator("xpath=..");
}

async function rolarAteOFim(page: Page): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
}

/* O limiar da coluna, dos dois lados, com o painel aberto e sem nada aberto
   (FIXCOL-07, ACs 1, 3, 5 e 6; L-029). */
test("em 1.535 px o painel aberto fica acima das seções e, sem nada aberto, não aparece; em 1.536 px fica à direita e, sem nada aberto, mostra a dica (FIXCOL-07, ACs 1, 3, 5 e 6)", async ({
  page,
}) => {
  const entradas = page.getByRole("region", { name: "Entradas fixas" });
  const dica =
    "Escolha um fixo na lista para ver o valor ao longo dos meses e para mudar o valor, editar ou encerrar.";

  await page.setViewportSize({ width: 1535, height: 900 });
  await abrir(page, `/${MARCO}/fixos`);
  await expect(painel(page)).toHaveCount(0);
  await expect(page.getByText(dica)).toBeHidden();

  await botaoDaLinha(page, "Fixo B").click();
  await expect(tituloDoPainel(page)).toHaveText("Fixo B");
  const acima = await caixa(painel(page));
  expect(acima.y + acima.height).toBeLessThanOrEqual((await caixa(entradas)).y);

  await page.setViewportSize({ width: 1536, height: 900 });
  const aDireita = await caixa(painel(page));
  const lista = await caixa(entradas);
  expect(aDireita.x).toBeGreaterThanOrEqual(lista.x + lista.width);

  /* Sem nada aberto, a coluna fica com a dica, à direita da lista. */
  await abrir(page, `/${MARCO}/fixos`);
  await expect(tituloDoPainel(page)).toHaveText("Nenhum fixo aberto");
  await expect(painel(page).getByText(dica)).toBeVisible();
  expect((await caixa(painel(page))).x).toBeGreaterThanOrEqual(
    (await caixa(entradas)).x + (await caixa(entradas)).width,
  );

  await page.setViewportSize({ width: 1535, height: 900 });
  await expect(painel(page)).toHaveCount(0);
  await expect(page.getByText(dica)).toBeHidden();
});

test("em 1.535 px, com um fixo aberto, o título, os totais, o painel e as seções medem até 1.024 px (FIXCOL-07, AC 5)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1535, height: 900 });
  await abrir(page, `/${MARCO}/fixos`);
  await botaoDaLinha(page, "Fixo A").click();
  await expect(tituloDoPainel(page)).toHaveText("Fixo A");

  for (const [nome, alvo] of [
    ["título", page.getByRole("heading", { level: 1 }).locator("xpath=..")],
    ["totais", page.locator("dl").filter({ hasText: "Saídas fixas em Março de 2026" })],
    ["painel", painel(page)],
    ["Entradas fixas", page.getByRole("region", { name: "Entradas fixas" })],
    ["Saídas fixas", page.getByRole("region", { name: "Saídas fixas" })],
  ] as const) {
    expect((await caixa(alvo)).width, nome).toBeLessThanOrEqual(1024);
  }
});

/* A coluna e a lista centrada, colada no limiar e longe dele (L-029). */
for (const largura of [1536, 1920]) {
  test(`em ${largura} px, a coluna mede 384 px, com a linha fina à esquerda, e o título, os totais e as seções medem até 1.100 px, centrados entre o menu e a coluna (FIXCOL-07, ACs 1 e 4)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: largura, height: 900 });
    await abrir(page, `/${MARCO}/fixos`);
    await botaoDaLinha(page, "Fixo A").click();
    await expect(tituloDoPainel(page)).toHaveText("Fixo A");

    const daColuna = await caixa(coluna(page));
    expect(Math.abs(daColuna.width - 384)).toBeLessThanOrEqual(1);
    const linhaFina = await coluna(page).evaluate((elemento) => {
      const estilo = getComputedStyle(elemento);
      return { largura: estilo.borderLeftWidth, tipo: estilo.borderLeftStyle };
    });
    expect(linhaFina).toEqual({ largura: "1px", tipo: "solid" });

    const menu = await caixa(page.getByRole("complementary", { name: "Menu do myBilling" }));
    for (const [nome, alvo] of [
      ["título", page.getByRole("heading", { level: 1 }).locator("xpath=..")],
      ["totais", page.locator("dl").filter({ hasText: "Saídas fixas em Março de 2026" })],
      ["Entradas fixas", page.getByRole("region", { name: "Entradas fixas" })],
      ["Saídas fixas", page.getByRole("region", { name: "Saídas fixas" })],
    ] as const) {
      const medida = await caixa(alvo);
      expect(medida.width, nome).toBeLessThanOrEqual(1100);
      const folgaEsquerda = medida.x - (menu.x + menu.width);
      const folgaDireita = daColuna.x - (medida.x + medida.width);
      expect(Math.abs(folgaEsquerda - folgaDireita), nome).toBeLessThanOrEqual(1);
    }
  });

  test(`em ${largura} px, com ponteiro fino, toda linha das duas tabelas mede até 48 px, e só as de descrição longa crescem (FIXCOL-01, AC 10)`, async ({
    page,
  }) => {
    await semearDescricoesLongas();
    await page.setViewportSize({ width: largura, height: 900 });
    await abrir(page, `/${MARCO}/fixos`);

    await linhasDeAte48(page);
  });

  test(`rolando até o fim em ${largura} × 480, o título do painel continua à vista (FIXCOL-07, AC 2)`, async ({
    page,
  }) => {
    await semearDescricoesLongas();
    await page.setViewportSize({ width: largura, height: 480 });
    await abrir(page, `/${MARCO}/fixos`);
    await botaoDaLinha(page, "Fixo A").click();
    await expect(tituloDoPainel(page)).toHaveText("Fixo A");

    await rolarAteOFim(page);

    await expect(tituloDoPainel(page)).toBeInViewport();
  });
}

/* Edge case "O formulário de edição é mais alto que a janela, a partir de
   1.536 px": a coluna fica presa no alto e rola por conta própria. */
test("em 1.920 × 480, a edição mais alta que a janela rola dentro da coluna, que continua presa no alto", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 480 });
  await abrir(page, `/${MARCO}/fixos`);
  await botaoDaLinha(page, "Fixo A").click();
  await painel(page).getByRole("button", { name: "Editar", exact: true }).click();
  const salvar = painel(page).getByRole("button", { name: "Salvar alterações" });
  await expect(salvar).toBeAttached();

  const rolagem = await painel(page).evaluate((aside) => ({
    altura: aside.clientHeight,
    conteudo: aside.scrollHeight,
    estouro: getComputedStyle(aside).overflowY,
  }));
  expect(rolagem.altura).toBeLessThanOrEqual(480);
  expect(rolagem.conteudo).toBeGreaterThan(rolagem.altura);
  expect(rolagem.estouro).toBe("auto");

  await rolarAteOFim(page);
  await expect(tituloDoPainel(page)).toBeInViewport();
  /* O fim do formulário chega rolando a coluna, e não a página. */
  await salvar.scrollIntoViewIfNeeded();
  await expect(salvar).toBeInViewport();
  expect(await painel(page).evaluate((aside) => aside.scrollTop)).toBeGreaterThan(0);
});

/**
 * Os três pares de campos do formulário (FIXCOL-07, ACs 7 e 8): valor e dia,
 * início e fim, meio e categoria. Para cada par, se o segundo campo fica ao
 * lado do primeiro, na mesma faixa, ou embaixo dele.
 */
async function paresDoFormulario(
  form: Locator,
): Promise<Array<{ readonly par: string; readonly aoLado: boolean; readonly embaixo: boolean }>> {
  const pares: Array<[string, Locator, Locator]> = [
    ["valor e dia", form.getByLabel(/De quanto costuma ser/), form.getByLabel("Dia de vencimento")],
    [
      "início e fim",
      form.getByLabel("Começa em", { exact: true }),
      form.getByLabel("Termina em (opcional)"),
    ],
    [
      "meio e categoria",
      form.getByLabel("Meio de pagamento", { exact: true }),
      form.getByLabel("Categoria", { exact: true }),
    ],
  ];
  const resultado = [];
  for (const [par, primeiro, segundo] of pares) {
    const a = await caixa(primeiro);
    const b = await caixa(segundo);
    resultado.push({
      par,
      aoLado: b.x >= a.x + a.width - 0.5 && Math.abs(b.y - a.y) <= 1,
      embaixo: b.y >= a.y + a.height,
    });
  }
  return resultado;
}

const EMPILHADOS = [
  { par: "valor e dia", aoLado: false, embaixo: true },
  { par: "início e fim", aoLado: false, embaixo: true },
  { par: "meio e categoria", aoLado: false, embaixo: true },
];
const LADO_A_LADO = [
  { par: "valor e dia", aoLado: true, embaixo: false },
  { par: "início e fim", aoLado: true, embaixo: false },
  { par: "meio e categoria", aoLado: true, embaixo: false },
];

/** O formulário do painel: o de cadastro, pelo "+ Novo fixo", ou o da edição de A. */
async function abrirFormulario(page: Page, modo: "cadastro" | "edição"): Promise<Locator> {
  if (modo === "cadastro") {
    await page.getByRole("button", { name: "+ Novo fixo" }).click();
    return painel(page).getByRole("form", { name: "Gasto fixo ou entrada" });
  }
  await botaoDaLinha(page, "Fixo A").click();
  await painel(page).getByRole("button", { name: "Editar", exact: true }).click();
  return painel(page)
    .getByRole("region", { name: "Editar gasto fixo" })
    .getByRole("form", { name: "Gasto fixo ou entrada" });
}

/* Na coluna de 384 px o formulário tem menos de 448 px: um campo por linha,
   no cadastro e na edição, colado no limiar da coluna e longe dele. */
for (const largura of [1536, 1920]) {
  for (const modo of ["cadastro", "edição"] as const) {
    test(`em ${largura} px, na coluna, o formulário de ${modo} mostra um campo por linha (FIXCOL-07, AC 7)`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: largura, height: 1080 });
      await abrir(page, `/${MARCO}/fixos`);
      const form = await abrirFormulario(page, modo);
      await expect(form).toBeVisible();

      expect((await caixa(form)).width).toBeLessThan(448);
      expect(await paresDoFormulario(form)).toEqual(EMPILHADOS);
    });
  }
}

/* Em 1.280 px o painel tem a largura toda da coluna de 1.024 px, e os pares
   ficam lado a lado, como antes da fatia. */
for (const modo of ["cadastro", "edição"] as const) {
  test(`em 1.280 px, com o painel na largura toda, o formulário de ${modo} mostra os três pares lado a lado (FIXCOL-07, AC 8)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 1080 });
    await abrir(page, `/${MARCO}/fixos`);
    const form = await abrirFormulario(page, modo);
    await expect(form).toBeVisible();

    expect((await caixa(form)).width).toBeGreaterThanOrEqual(448);
    expect(await paresDoFormulario(form)).toEqual(LADO_A_LADO);
  });
}

/*
 * O limiar é a largura do formulário, e não a da janela (L-029, L-050): as
 * duas janelas deixam o formulário com 447 e com 448 px. O teste mede a
 * largura antes de conferir os pares, para o limiar continuar colado se o
 * respiro em volta mudar.
 */
test("com o formulário em 447 px, um campo por linha; em 448 px, os pares lado a lado (FIXCOL-07, ACs 7 e 8)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 777, height: 1080 });
  await abrir(page, `/${MARCO}/fixos`);
  const form = await abrirFormulario(page, "cadastro");
  await expect(form).toBeVisible();
  const estreito = (await caixa(form)).width;
  expect(estreito).toBeLessThan(448);
  expect(estreito).toBeGreaterThanOrEqual(447);
  expect(await paresDoFormulario(form)).toEqual(EMPILHADOS);

  await page.setViewportSize({ width: 778, height: 1080 });
  await expect.poll(async () => (await caixa(form)).width).toBeGreaterThanOrEqual(448);
  expect((await caixa(form)).width).toBeLessThan(449);
  expect(await paresDoFormulario(form)).toEqual(LADO_A_LADO);
});

/*
 * A confirmação de salvar fica à vista, junto do botão que a pessoa clicou, e
 * a tela não vai ao título do painel (FIXCOL-05, AC 5; FIXCOL-06, AC 3; a
 * escolha do dono em 2026-10-31). O foco fica na confirmação, e o `Escape`
 * continua fechando o painel (FIXCOL-08, ACs 3 e 4). `toBeVisible()` não olha
 * a janela: a prova é `toBeInViewport` (L-057).
 *
 * A medida vale depois da página relida, e não só no instante da confirmação:
 * a página relida chega uns 200 ms depois, e o Next rolava a janela até o alto
 * quando o `?fixo=` tinha mudado desde a carga. Por isso a edição abre o fixo
 * pelo clique, e o cadastro parte de uma carga com `?fixo=`: nos dois, o
 * endereço mudou antes de salvar.
 */

/**
 * Vigia o título do painel durante a gravação e marca se ele entra na janela
 * depois de estar fora dela. Espera a primeira leitura do observador, para a
 * marca não depender de quem chega primeiro.
 */
async function vigiarOTitulo(page: Page): Promise<void> {
  await tituloDoPainel(page).evaluate(
    (titulo) =>
      new Promise<void>((pronto) => {
        const janela = window as unknown as { tituloEntrou?: boolean };
        janela.tituloEntrou = false;
        let visivel: boolean | null = null;
        new IntersectionObserver((registros) => {
          for (const registro of registros) {
            if (visivel === false && registro.isIntersecting) {
              janela.tituloEntrou = true;
            }
            visivel = registro.isIntersecting;
          }
          pronto();
        }).observe(titulo);
      }),
  );
}

async function oTituloEntrou(page: Page): Promise<boolean> {
  return page.evaluate(
    () => (window as unknown as { tituloEntrou?: boolean }).tituloEntrou === true,
  );
}

/** Dois quadros: o observador entrega o que mudou no quadro seguinte ao da mudança. */
async function doisQuadros(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((pronto) =>
        requestAnimationFrame(() => requestAnimationFrame(() => pronto())),
      ),
  );
}

const GRAVACOES = [
  {
    modo: "edição",
    /** A carga sem `?fixo=`: o clique na linha o põe no endereço. */
    endereco: () => `/${MARCO}/fixos`,
    botao: "Salvar alterações",
    confirmacao: "Alterações salvas.",
    preencher: (form: Locator) => form.getByLabel("Descrição").fill("Fixo A2"),
    /** A linha que só existe na página relida, e para onde o `Escape` devolve o foco. */
    linhaNova: (page: Page) => botaoDaLinha(page, "Fixo A2"),
    origem: (page: Page) => botaoDaLinha(page, "Fixo A2"),
  },
  {
    modo: "cadastro",
    /** A carga com A aberto: o "+ Novo fixo" tira o `?fixo=` do endereço. */
    endereco: () => `/${MARCO}/fixos?fixo=${ids.a}`,
    botao: "Cadastrar gasto fixo",
    confirmacao: "Fixo E passa a aparecer em todo mês.",
    preencher: async (form: Locator) => {
      await form.getByLabel("Descrição").fill("Fixo E");
      await form.getByLabel(/De quanto costuma ser/).fill("20,00");
    },
    linhaNova: (page: Page) => botaoDaLinha(page, "Fixo E"),
    origem: (page: Page) => page.getByRole("button", { name: "+ Novo fixo" }),
  },
] as const;

for (const [largura, altura] of [
  [1280, 720],
  [1920, 1080],
] as const) {
  for (const { modo, endereco, botao, confirmacao, preencher, linhaNova, origem } of GRAVACOES) {
    test(`em ${largura} × ${altura}, depois de "${botao}" e da página relida, a confirmação fica inteira na janela, com o foco nela, e a tela não vai ao título do painel (FIXCOL-05, AC 5; FIXCOL-06, AC 3)`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: largura, height: altura });
      await abrir(page, endereco());
      const form = await abrirFormulario(page, modo);
      await preencher(form);
      const enviar = form.getByRole("button", { name: botao });
      await enviar.scrollIntoViewIfNeeded();
      await vigiarOTitulo(page);

      await enviar.click();

      const status = form.getByRole("status");
      await expect(status).toHaveText(confirmacao);
      await expect(linhaNova(page)).toBeAttached();
      await doisQuadros(page);
      await expect(status).toBeInViewport({ ratio: 1 });
      await expect(status).toBeFocused();
      expect(await oTituloEntrou(page)).toBe(false);

      await page.keyboard.press("Escape");
      await expect(origem(page)).toBeFocused();
      await expect(origem(page)).toHaveAttribute("aria-expanded", "false");
    });
  }
}

/*
 * A mesma guarda servia ao "Registrar": recusado, o alerta aparece abaixo dos
 * botões, e a tela que ia ao título o deixava fora da janela em 400 × 800
 * (FIXCOL-05, AC 7).
 */
test.describe("em 400 × 800", () => {
  test.use({ viewport: { width: 400, height: 800 } });

  test('"Registrar" recusado deixa o alerta inteiro na janela, e o `Escape` fecha o painel (FIXCOL-05, AC 7)', async ({
    page,
  }) => {
    await abrir(page, `/${MARCO}/fixos`);
    await botaoDaLinha(page, "Fixo B").click();
    await painel(page).getByRole("button", { name: "Mudar valor" }).click();
    await painel(page).getByLabel("Novo valor (R$)").fill("60,00");
    /* Sem o mês, a action recusa. */
    await painel(page).getByLabel("Vale a partir de").fill("");

    await painel(page).getByRole("button", { name: "Registrar" }).click();

    const alerta = painel(page).getByRole("alert");
    await expect(alerta).toHaveText("Informe o mês no formato AAAA-MM.");
    await expect(alerta).toBeInViewport({ ratio: 1 });
    await page.keyboard.press("Escape");
    await expect(painel(page)).toHaveCount(0);
  });
});
