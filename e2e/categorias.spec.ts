import { expect, type Locator, type Page, test } from "@playwright/test";
import type { Pool } from "pg";
import { CORES_DE_CATEGORIA } from "@/domain";
import {
  type CadastroBase,
  criarPoolDeTeste,
  limparDados,
  recriarBancoDeTeste,
  semearCadastroBase,
} from "@/infrastructure/db/testing/banco-de-teste";

/**
 * **A tela de Categorias e a cor nas quatro telas, de ponta a ponta** (COR-02
 * a COR-04).
 *
 * A cor sai do banco, passa por `corDaCategoria` em três páginas e chega a
 * quatro componentes. Cada elo tem teste próprio; aqui a cor é conferida no
 * fim da composição, pelo `backgroundColor` que o navegador calculou, e não
 * pelo nome da classe (lições L-001 e L-014). O contraste também é medido no
 * navegador, a partir das cores computadas, nos dois temas.
 *
 * **Nenhum hex é copiado para cá.** A cor esperada de um token é lida pondo o
 * próprio token num elemento e pedindo ao navegador a cor que ele resolve,
 * com o `light-dark()` do tema em vigor.
 *
 * O tema escuro é o do sistema, por `emulateMedia`: sem `data-tema`, o
 * `color-scheme: light dark` do `:root` segue o sistema e o `light-dark()`
 * resolve pelo lado escuro. O tema é trocado **antes** de abrir a página, para
 * que nenhuma transição de cor esteja no meio quando a cor é lida.
 *
 * As cores automáticas: "Categoria Um" é ciano, "Categoria Dois" é rosa,
 * "Categoria Três" é verde e "Categoria Dez" é vermelho. Nomes e valores
 * genéricos (AD-009).
 */

const EMAIL_PERMITIDO = "pessoa-a@example.com";
const MARCO = "2026-03";
const ABRIL = "2026-04";
const CATEGORIAS = `/${MARCO}/cadastros/categorias`;

let pool: Pool;
let base: CadastroBase;
let categoriaDois: string;

declare global {
  interface Window {
    /** As contas de cor da WCAG, instaladas em toda página antes do script dela. */
    medidasDeCor: {
      contraste(a: string, b: string): number;
      luminancia(cor: string): number;
      fundoEfetivo(elemento: Element): string;
    };
  }
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  pool = criarPoolDeTeste();
  await recriarBancoDeTeste(pool);
  await limparDados(pool);
  base = await semearCadastroBase(pool);
  categoriaDois = await inserirCategoria("Categoria Dois");
  await inserirCategoria("Categoria Três");
  await inserirFixo("Fixo A", base.categoriaId, 10000);
  await inserirFixo("Fixo B", categoriaDois, 5000);
  await inserirGasto("Gasto A", base.categoriaId, MARCO, 2000);
});

test.afterAll(async () => {
  await pool.end();
});

test.beforeEach(async ({ page }) => {
  await entrar(page, EMAIL_PERMITIDO);
  await page.addInitScript(instalarMedidas);
});

async function entrar(page: Page, email: string): Promise<void> {
  const csrf = await page.request.get("/api/auth/csrf");
  const { csrfToken } = (await csrf.json()) as { csrfToken: string };
  await page.request.post("/api/auth/callback/provedor-de-teste", {
    form: { csrfToken, email, callbackUrl: "/" },
  });
}

/**
 * Roda no navegador. Luminância e contraste da WCAG 2.x a partir da cor
 * computada (`rgb(r, g, b)` ou `rgba(r, g, b, a)`), e o fundo efetivo de um
 * elemento: o próprio fundo composto sobre o de cada ancestral, até o
 * primeiro opaco. É assim que o trilho translúcido do escuro vira a cor que a
 * tela mostra.
 */
function instalarMedidas(): void {
  type Rgba = [number, number, number, number];
  const ler = (cor: string): Rgba => {
    const numeros = cor.match(/[\d.]+/g)?.map(Number) ?? [];
    if (!cor.startsWith("rgb") || numeros.length < 3) {
      throw new Error(`cor computada ilegível: ${cor}`);
    }
    const [r = 0, g = 0, b = 0, a = 1] = numeros;
    return [r, g, b, a];
  };
  const luminancia = (cor: string): number => {
    const [r, g, b] = ler(cor);
    const canal = (valor: number): number => {
      const v = valor / 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
  };
  window.medidasDeCor = {
    luminancia,
    contraste(a, b) {
      const [clara, escura] = [luminancia(a), luminancia(b)].sort((x, y) => y - x) as [
        number,
        number,
      ];
      return (clara + 0.05) / (escura + 0.05);
    },
    fundoEfetivo(elemento) {
      const camadas: Rgba[] = [];
      for (let no: Element | null = elemento; no !== null; no = no.parentElement) {
        const camada = ler(getComputedStyle(no).backgroundColor);
        if (camada[3] > 0) {
          camadas.push(camada);
        }
        if (camada[3] === 1) {
          break;
        }
      }
      const opaca = camadas.pop();
      if (opaca === undefined || opaca[3] !== 1) {
        throw new Error("nenhum ancestral opaco embaixo do elemento");
      }
      let [r, g, b] = opaca;
      for (const [cr, cg, cb, ca] of camadas.reverse()) {
        r = ca * cr + (1 - ca) * r;
        g = ca * cg + (1 - ca) * g;
        b = ca * cb + (1 - ca) * b;
      }
      return `rgb(${r}, ${g}, ${b})`;
    },
  };
}

async function inserirCategoria(nome: string, cor: string | null = null): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    "INSERT INTO categoria (nome, cor) VALUES ($1, $2) RETURNING id",
    [nome, cor],
  );
  const linha = rows[0];
  if (!linha) {
    throw new Error("INSERT de categoria não devolveu id");
  }
  return linha.id;
}

/** Fixo só de março, em Conta Corrente: a materialização o cria ao abrir o mês. */
async function inserirFixo(descricao: string, categoriaId: string, centavos: number) {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO recorrencia (descricao, natureza, categoria_id, usuario_id, meio_pagamento_id,
       competencia_inicio, competencia_fim, dia_vencimento)
     VALUES ($1, 'DESPESA', $2, $3, $4, $5, $5, 10) RETURNING id`,
    [descricao, categoriaId, base.usuarioId, base.contaId, `${MARCO}-01`],
  );
  await pool.query(
    "INSERT INTO recorrencia_versao (recorrencia_id, vigente_desde, valor_previsto_centavos) VALUES ($1, $2, $3)",
    [rows[0]?.id, `${MARCO}-01`, centavos],
  );
}

async function inserirGasto(
  descricao: string,
  categoriaId: string,
  competencia: string,
  centavos: number,
) {
  await pool.query(
    `INSERT INTO movimento (natureza, origem, descricao, competencia, data_evento, valor_centavos,
       usuario_id, meio_pagamento_id, categoria_id)
     VALUES ('DESPESA', 'AVULSO', $1, $2, $3, $4, $5, $6, $7)`,
    [
      descricao,
      `${competencia}-01`,
      `${competencia}-10`,
      centavos,
      base.usuarioId,
      base.contaId,
      categoriaId,
    ],
  );
}

function navegacao(page: Page, area: string): Locator {
  return page
    .getByRole("navigation", { name: "Áreas do myBilling" })
    .getByRole("link", { name: area, exact: true });
}

function aviso(page: Page): Locator {
  return page.locator('[aria-live="polite"]').getByRole("status");
}

function listaDeCategorias(page: Page): Locator {
  return page.getByRole("list", { name: "Categorias" });
}

/** A linha de uma categoria na tela de Categorias, pelo título dela, que é a pill. */
function linhaDaCategoria(page: Page, nome: string): Locator {
  return listaDeCategorias(page)
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: nome, exact: true }) });
}

function pillDaLinha(linha: Locator): Locator {
  return linha.getByRole("heading").locator(":scope > span");
}

/** A pill de categoria de um fixo em "Todo mês", dentro do cartão dele. */
function pillDoFixo(page: Page, descricao: string, categoria: string): Locator {
  return page
    .getByRole("listitem")
    .filter({ hasText: descricao })
    .getByText(categoria, { exact: true });
}

function chipDeFiltro(page: Page, categoria: string): Locator {
  return page
    .locator("#cartao-de-filtros")
    .getByRole("list", { name: "Categoria" })
    .getByRole("button", { name: new RegExp(`^${categoria} · `) });
}

/** A barra de uma categoria em "Gastos por categoria": o preenchimento dentro do trilho. */
function trilhoDaCategoria(page: Page, categoria: string): Locator {
  return page
    .getByRole("list", { name: "Gastos por categoria, ordenados do maior para o menor" })
    .getByRole("link", { name: new RegExp(`^${categoria} `) })
    .locator(".bg-grafico-trilho");
}

function barraDaCategoria(page: Page, categoria: string): Locator {
  return trilhoDaCategoria(page, categoria).locator(":scope > div");
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

/** Texto sobre o próprio fundo, das cores computadas. */
async function contrasteDoTexto(alvo: Locator): Promise<number> {
  return alvo.evaluate((elemento) => {
    const estilo = getComputedStyle(elemento);
    return window.medidasDeCor.contraste(estilo.color, estilo.backgroundColor);
  });
}

/** A barra contra o trilho composto sobre o que está embaixo, e contra o fundo do gráfico. */
async function contrastesDaBarra(
  page: Page,
  categoria: string,
): Promise<{ trilho: number; superficie: number }> {
  const barra = await fundo(barraDaCategoria(page, categoria));
  return trilhoDaCategoria(page, categoria).evaluate(
    (trilho, corDaBarra) => ({
      trilho: window.medidasDeCor.contraste(corDaBarra, window.medidasDeCor.fundoEfetivo(trilho)),
      superficie: window.medidasDeCor.contraste(
        corDaBarra,
        window.medidasDeCor.fundoEfetivo(trilho.parentElement as Element),
      ),
    }),
    barra,
  );
}

async function transbordoHorizontal(page: Page): Promise<number> {
  return page.evaluate(() =>
    Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
  );
}

/** Abre a página já no tema pedido. */
async function abrirNoTema(page: Page, tema: "light" | "dark", caminho: string): Promise<void> {
  await page.emulateMedia({ colorScheme: tema });
  await page.goto(caminho);
  /* O ponteiro fica onde o último clique o deixou. Em cima de uma barra, o
     hover pintaria a linha e mudaria o que está embaixo do trilho. */
  await page.mouse.move(0, 0);
  /* Prova de que o tema virou: o canvas é quase branco num e quase preto no
     outro. Sem ela, medir "os dois temas" poderia medir o claro duas vezes. */
  const canvas = await page.evaluate(() =>
    window.medidasDeCor.luminancia(getComputedStyle(document.body).backgroundColor),
  );
  if (tema === "light") {
    expect(canvas).toBeGreaterThan(0.9);
  } else {
    expect(canvas).toBeLessThan(0.01);
  }
}

test("Cadastros, pela navegação, abre a tela com as categorias em ordem alfabética (COR-04, ACs 1 e 2)", async ({
  page,
}) => {
  await page.goto(`/${MARCO}`);
  await navegacao(page, "Cadastros").click();

  await expect(page).toHaveURL(new RegExp(`${CATEGORIAS}$`));
  await expect(page.getByRole("heading", { level: 1, name: "Categorias" })).toBeVisible();
  await expect(navegacao(page, "Cadastros")).toHaveAttribute("aria-current", "page");
  await expect(navegacao(page, "Visão geral")).not.toHaveAttribute("aria-current", "page");

  /* A base cria "Categoria Um" primeiro; a tela ordena pelo nome. */
  await expect(listaDeCategorias(page).getByRole("heading")).toHaveText([
    "Categoria Dois",
    "Categoria Três",
    "Categoria Um",
  ]);

  /* Cada pill na cor automática do nome, vinda do banco com `cor` nula. */
  expect(await fundo(pillDaLinha(linhaDaCategoria(page, "Categoria Dois")))).toBe(
    await corDoToken(page, "--cat-rosa-fundo"),
  );
  expect(await fundo(pillDaLinha(linhaDaCategoria(page, "Categoria Três")))).toBe(
    await corDoToken(page, "--cat-verde-fundo"),
  );
  expect(await fundo(pillDaLinha(linhaDaCategoria(page, "Categoria Um")))).toBe(
    await corDoToken(page, "--cat-ciano-fundo"),
  );
});

test("Verde para Categoria Um: o mesmo fundo na pill de Todo mês, no seletor e no chip, e a barra verde na Visão geral (COR-03, ACs 1, 2, 4 e 5; COR-04, ACs 4 e 9)", async ({
  page,
}) => {
  await page.goto(CATEGORIAS);
  const linha = linhaDaCategoria(page, "Categoria Um");
  const grupo = linha.getByRole("group", { name: "Cor de Categoria Um" });

  /* O toque é no rótulo escrito, que é o alvo; o radio fica em `sr-only`. */
  await grupo.getByText("Verde", { exact: true }).click();

  await expect(aviso(page)).toHaveText("Cor trocada.");
  await expect(grupo.getByRole("radio", { name: "Verde", exact: true })).toBeChecked();
  const verde = await corDoToken(page, "--cat-verde-fundo");
  const barraVerde = await corDoToken(page, "--cat-verde-barra");
  expect(await fundo(pillDaLinha(linha))).toBe(verde);

  /* Cada tela é aberta pela navegação, sem recarregar (COR-04, AC 9). */
  await navegacao(page, "Todo mês").click();
  await expect(page).toHaveURL(new RegExp(`/${MARCO}/fixos$`));
  const pill = pillDoFixo(page, "Fixo A", "Categoria Um");
  await expect(pill).toBeVisible();
  const corDaPill = await fundo(pill);

  await navegacao(page, "Lançamentos").click();
  await expect(page).toHaveURL(new RegExp(`/${MARCO}/lancamentos$`));
  const seletor = page.getByRole("combobox", { name: "Categoria de Gasto A" });
  await expect(seletor.locator("option:checked")).toHaveText("Categoria Um");
  const corDoSeletor = await fundo(seletor);
  const chip = chipDeFiltro(page, "Categoria Um");
  await expect(chip).toHaveAttribute("aria-pressed", "false");
  const corDoChip = await fundo(chip);

  expect(corDaPill).toBe(verde);
  expect(corDoSeletor).toBe(corDaPill);
  expect(corDoChip).toBe(corDaPill);

  await navegacao(page, "Visão geral").click();
  await expect(page).toHaveURL(new RegExp(`/${MARCO}$`));
  await expect(barraDaCategoria(page, "Categoria Um")).toBeVisible();
  expect(await fundo(barraDaCategoria(page, "Categoria Um"))).toBe(barraVerde);
  /* O trilho continua neutro. */
  expect(await fundo(trilhoDaCategoria(page, "Categoria Um"))).toBe(
    await corDoToken(page, "--grafico-trilho"),
  );
});

test("renomear mantém a cor em uso, e o nome de outra categoria é recusado com o motivo junto do campo (COR-04, ACs 6, 7 e 9)", async ({
  page,
}) => {
  await page.goto(CATEGORIAS);
  const rosa = await corDoToken(page, "--cat-rosa-fundo");
  /* "Categoria Dez" seria vermelho pela automática: a prova só vale se forem diferentes. */
  expect(await corDoToken(page, "--cat-vermelho-fundo")).not.toBe(rosa);

  const linhaDois = linhaDaCategoria(page, "Categoria Dois");
  await linhaDois.getByRole("button", { name: "Renomear" }).click();
  await linhaDois.getByRole("textbox", { name: "Novo nome" }).fill("Categoria Dez");
  await linhaDois.getByRole("button", { name: "Salvar" }).click();

  await expect(aviso(page)).toHaveText("Categoria renomeada.");
  await expect(listaDeCategorias(page).getByRole("heading")).toHaveText([
    "Categoria Dez",
    "Categoria Três",
    "Categoria Um",
  ]);
  const linhaDez = linhaDaCategoria(page, "Categoria Dez");
  expect(await fundo(pillDaLinha(linhaDez))).toBe(rosa);
  await expect(
    linhaDez
      .getByRole("group", { name: "Cor de Categoria Dez" })
      .getByRole("radio", { name: "Rosa", exact: true }),
  ).toBeChecked();

  /* O nome e a cor chegam a "Todo mês" na próxima visita. */
  await navegacao(page, "Todo mês").click();
  const pill = pillDoFixo(page, "Fixo B", "Categoria Dez");
  await expect(pill).toBeVisible();
  expect(await fundo(pill)).toBe(rosa);

  /* O nome de outra, em outra caixa: recusado, e nada muda. O aviso do
     renomear de antes some primeiro, para a ausência de aviso depois valer. */
  await navegacao(page, "Cadastros").click();
  await expect(aviso(page)).toHaveCount(0, { timeout: 8_000 });
  await linhaDez.getByRole("button", { name: "Renomear" }).click();
  await linhaDez.getByRole("textbox", { name: "Novo nome" }).fill("categoria três");
  await linhaDez.getByRole("button", { name: "Salvar" }).click();

  const formulario = linhaDez.getByRole("form", { name: "Renomear Categoria Dez" });
  await expect(formulario.getByRole("alert")).toHaveText(
    "Já existe outra categoria com esse nome.",
  );
  await expect(formulario.getByRole("textbox", { name: "Novo nome" })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(pillDaLinha(linhaDez)).toHaveText("Categoria Dez");
  await expect(listaDeCategorias(page).getByRole("heading")).toHaveText([
    "Categoria Dez",
    "Categoria Três",
    "Categoria Um",
  ]);
  await expect(aviso(page)).toHaveCount(0);
});

test("em 400 px, a tela e a navegação de quatro itens cabem sem rolagem horizontal, e cada opção de cor tem alvo de 44 × 44 (COR-04, AC 10)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 400, height: 900 });
  await page.goto(CATEGORIAS);
  await expect(listaDeCategorias(page).getByRole("listitem")).toHaveCount(3);

  expect(await transbordoHorizontal(page)).toBe(0);

  const nav = page.getByRole("navigation", { name: "Áreas do myBilling" });
  await expect(nav.getByRole("link")).toHaveText([
    "Visão geral",
    "Lançamentos",
    "Todo mês",
    "Cadastros",
  ]);
  const itens = await nav.getByRole("link").evaluateAll((links) =>
    links.map((link) => {
      const { left, right, height } = link.getBoundingClientRect();
      return { left, right, altura: height, transborda: link.scrollWidth > link.clientWidth };
    }),
  );
  for (const item of itens) {
    expect(item.left).toBeGreaterThanOrEqual(0);
    expect(item.right).toBeLessThanOrEqual(400);
    expect(item.transborda).toBe(false);
  }
  /* Os quatro rótulos numa linha só: um que quebrasse deixaria o item dele
     mais alto que os outros. */
  expect(new Set(itens.map((item) => item.altura)).size).toBe(1);

  /* O alvo é o rótulo inteiro, que é o que o dedo toca. */
  const alvos = await listaDeCategorias(page)
    .getByRole("radio")
    .evaluateAll((radios) =>
      radios.map((radio) => {
        const { width, height } = (radio.closest("label") as Element).getBoundingClientRect();
        return { nome: radio.closest("label")?.textContent, largura: width, altura: height };
      }),
    );
  expect(alvos).toHaveLength(3 * 11);
  for (const { nome, largura, altura } of alvos) {
    expect(largura, `largura de ${nome}`).toBeGreaterThanOrEqual(44);
    expect(altura, `altura de ${nome}`).toBeGreaterThanOrEqual(44);
  }
  for (const botao of await listaDeCategorias(page)
    .getByRole("button", { name: "Renomear" })
    .all()) {
    const caixa = await botao.boundingBox();
    expect(caixa?.height).toBeGreaterThanOrEqual(44);
    expect(caixa?.width).toBeGreaterThanOrEqual(44);
  }
});

test("com uma categoria de cada cor, nos temas claro e escuro, todo texto de pill passa de 4,5:1 e toda barra passa de 3:1 contra o trilho e o fundo do gráfico (COR-02, ACs 2 e 3)", async ({
  page,
}) => {
  /* Dez categorias, uma por cor, cada uma com um gasto de abril de valor
     diferente: o gráfico de abril tem uma barra de cada cor. */
  for (const [indice, cor] of CORES_DE_CATEGORIA.entries()) {
    const id = await inserirCategoria(`Tom ${String(indice + 1).padStart(2, "0")}`, cor);
    await inserirGasto(`Gasto de tom ${indice + 1}`, id, ABRIL, (20 - indice) * 100);
  }
  const TONS = CORES_DE_CATEGORIA.map((_, indice) => `Tom ${String(indice + 1).padStart(2, "0")}`);

  for (const tema of ["light", "dark"] as const) {
    /* As pills da tela de Categorias: a de cada linha e as onze opções. */
    await abrirNoTema(page, tema, CATEGORIAS);
    const pills = listaDeCategorias(page).locator("h2 > span, label > span");
    expect(await pills.count()).toBe(13 + 13 * 11);
    for (const pill of await pills.all()) {
      expect(
        await contrasteDoTexto(pill),
        `${tema}: ${await pill.textContent()}`,
      ).toBeGreaterThanOrEqual(4.5);
    }

    /* A pill de "Todo mês" e o seletor de cada linha de Lançamentos. */
    await abrirNoTema(page, tema, `/${MARCO}/fixos`);
    for (const { fixo, categoria } of [
      { fixo: "Fixo A", categoria: "Categoria Um" },
      { fixo: "Fixo B", categoria: "Categoria Dez" },
    ]) {
      const pill = pillDoFixo(page, fixo, categoria);
      expect(await contrasteDoTexto(pill), `${tema}: ${categoria}`).toBeGreaterThanOrEqual(4.5);
    }

    await abrirNoTema(page, tema, `/${ABRIL}/lancamentos`);
    const seletores = page.getByRole("combobox", { name: /^Categoria de Gasto de tom / });
    await expect(seletores).toHaveCount(10);
    const fundosDosSeletores = new Set<string>();
    for (const seletor of await seletores.all()) {
      fundosDosSeletores.add(await fundo(seletor));
      expect(await contrasteDoTexto(seletor), `${tema}: seletor`).toBeGreaterThanOrEqual(4.5);
    }
    /* Uma cor por seletor: são as dez da paleta, e não a mesma dez vezes. */
    expect(fundosDosSeletores.size).toBe(10);
    for (const chip of await page
      .locator("#cartao-de-filtros")
      .getByRole("list", { name: "Categoria" })
      .locator('button[aria-pressed="false"]')
      .all()) {
      expect(await contrasteDoTexto(chip), `${tema}: chip`).toBeGreaterThanOrEqual(4.5);
    }

    /* Uma barra de cada cor. */
    await abrirNoTema(page, tema, `/${ABRIL}`);
    const fundosDasBarras = new Set<string>();
    for (const tom of TONS) {
      fundosDasBarras.add(await fundo(barraDaCategoria(page, tom)));
      const { trilho, superficie } = await contrastesDaBarra(page, tom);
      expect(trilho, `${tema}: barra de ${tom} contra o trilho`).toBeGreaterThanOrEqual(3);
      expect(superficie, `${tema}: barra de ${tom} contra o fundo`).toBeGreaterThanOrEqual(3);
    }
    expect(fundosDasBarras.size).toBe(10);
  }
});
