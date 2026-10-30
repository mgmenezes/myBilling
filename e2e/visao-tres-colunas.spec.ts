import { expect, type Locator, type Page, test } from "@playwright/test";
import type { Pool } from "pg";
import { CLASSES_DA_COR } from "@/components/cor-de-categoria";
import { corDaCategoria } from "@/domain";
import {
  type CadastroBase,
  criarPoolDeTeste,
  limparDados,
  recriarBancoDeTeste,
  semearCadastroBase,
} from "@/infrastructure/db/testing/banco-de-teste";

/**
 * **A moldura com o menu na borda e a Visão geral em colunas, de ponta a
 * ponta** (TRES-01 e TRES-02).
 *
 * Layout se prova no navegador, com a caixa medida de cada elemento, e não
 * pelo nome da classe. As consultas que situam um elemento ficam presas à
 * região dele (L-018): o importar "no pé do menu" é procurado dentro do menu.
 *
 * Os fixos de março existem só para a lista de Lançamentos ser longa o
 * bastante para a barra de filtros compacta aparecer. Nomes genéricos e valores
 * redondos (AD-009).
 */

const EMAIL_PERMITIDO = "pessoa-a@example.com";
const MARCO = "2026-03";
const FIXOS = 15;

/*
 * O app não fixa o relógio: "hoje" é o dia corrente no fuso da casa
 * (`hojeEm`). O teste resolve o mesmo dia do mesmo jeito e monta o mês
 * corrente em volta dele: dez avulsos de R$ 10,00, um por dia, de ontem para
 * trás ("Recente 01" é o de ontem), e um de amanhã ("Futuro A").
 */
const HOJE = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const ATUAL = HOJE.slice(0, 7);
const RECENTES = 10;

/** A data `'YYYY-MM-DD'` de `dias` antes de hoje; negativo é depois. */
function diasAntes(dias: number): string {
  const [ano, mes, dia] = HOJE.split("-").map(Number);
  return new Date(Date.UTC(ano ?? 0, (mes ?? 1) - 1, (dia ?? 1) - dias)).toISOString().slice(0, 10);
}

function recente(n: number): string {
  return `Recente ${String(n).padStart(2, "0")}`;
}

let pool: Pool;
let base: CadastroBase;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  pool = criarPoolDeTeste();
  await recriarBancoDeTeste(pool);
  await limparDados(pool);
  base = await semearCadastroBase(pool);
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
      "INSERT INTO recorrencia_versao (recorrencia_id, vigente_desde, valor_previsto_centavos) VALUES ($1, $2, 1000)",
      [rows[0]?.id, `${MARCO}-01`],
    );
  }
});

test.beforeAll(async () => {
  const avulso = (descricao: string, dataEvento: string) =>
    pool.query(
      `INSERT INTO movimento (natureza, origem, descricao, competencia, data_evento, valor_centavos,
         categoria_id, usuario_id, meio_pagamento_id)
       VALUES ('DESPESA', 'AVULSO', $1, $2, $3, 1000, $4, $5, $6)`,
      [descricao, `${ATUAL}-01`, dataEvento, base.categoriaId, base.usuarioId, base.contaId],
    );
  for (let n = 1; n <= RECENTES; n += 1) {
    await avulso(recente(n), diasAntes(n));
  }
  await avulso("Futuro A", diasAntes(-1));
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

function menu(page: Page): Locator {
  return page.getByRole("complementary", { name: "Menu do myBilling" });
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
  return page.evaluate(() =>
    Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
  );
}

test.describe("em 1.920 px", () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test("o menu encosta na borda esquerda, da altura da página, e não há pílula no topo (TRES-01, ACs 1 e 2)", async ({
    page,
  }) => {
    for (const caminho of [`/${MARCO}/lancamentos`, `/${MARCO}`]) {
      await page.goto(caminho);

      const medida = await caixa(menu(page));
      expect(medida.x).toBe(0);
      expect(medida.height).toBeGreaterThanOrEqual(1080);
      await expect(page.getByRole("banner")).toHaveCount(0);
    }
  });

  test("ao rolar até o fim da Visão geral, o menu continua no alto e o pé à vista (TRES-01, AC 1)", async ({
    page,
  }) => {
    await page.goto(`/${ATUAL}`);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

    /* Preso no alto: sem `sticky`, ele teria subido a altura inteira da rolagem.
       A folga de 1 px é o arredondamento de subpixel da rolagem. */
    expect(Math.abs((await caixa(menu(page))).y)).toBeLessThanOrEqual(1);
    await expect(menu(page).getByRole("button", { name: "Importar planilha" })).toBeInViewport();
  });

  test("na home do ano, o menu tem a marca e o pé, sem as áreas (TRES-01, AC 4)", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(menu(page).getByRole("link", { name: "myBilling" })).toHaveAttribute("href", "/");
    await expect(menu(page).getByText("Pessoa A", { exact: true })).toBeVisible();
    await expect(menu(page).getByRole("navigation", { name: "Áreas do myBilling" })).toHaveCount(0);
  });

  test("o pé do menu tem o nome, o tema e o importar, que abre o diálogo de importação em Lançamentos (TRES-01, ACs 5 e 6)", async ({
    page,
  }) => {
    await page.goto(`/${MARCO}/lancamentos`);

    await expect(menu(page).getByText("Pessoa A", { exact: true })).toBeVisible();
    await expect(menu(page).getByRole("group", { name: "Tema da interface" })).toBeVisible();
    await menu(page).getByRole("button", { name: "Importar planilha" }).click();

    const dialogo = page.getByRole("dialog", { name: "Importar planilha" });
    await expect(dialogo).toBeVisible();
    await expect(dialogo.getByText("Tudo entra em nome de Pessoa A")).toBeVisible();
  });

  test("o seletor de competência fica no topo da área à direita do menu, acima do conteúdo (TRES-01, AC 7)", async ({
    page,
  }) => {
    for (const caminho of [`/${MARCO}/lancamentos`, `/${MARCO}`]) {
      await page.goto(caminho);

      const seletor = await caixa(page.getByRole("navigation", { name: "Navegação entre meses" }));
      const titulo = await caixa(page.getByRole("heading", { level: 1 }));
      const lateral = await caixa(menu(page));
      expect(seletor.y + seletor.height).toBeLessThanOrEqual(titulo.y);
      expect(seletor.x).toBeGreaterThanOrEqual(lateral.x + lateral.width);
    }
  });

  /*
   * A área de conteúdo é o bloco, logo abaixo da moldura do mês, que contém o
   * título da tela. Sem a `AreaEstreita`, esse bloco seria a página inteira,
   * da largura da área à direita do menu.
   */
  test("Lançamentos, Todo mês e Categorias ficam em até 1.024 px, centrados na área à direita do menu (TRES-01, AC 8)", async ({
    page,
  }) => {
    for (const caminho of [
      `/${MARCO}/lancamentos`,
      `/${MARCO}/fixos`,
      `/${MARCO}/cadastros/categorias`,
    ]) {
      await page.goto(caminho);
      const titulo = page.getByRole("heading", { level: 1 });
      await expect(titulo).toBeVisible();

      const area = await caixa(page.getByRole("main"));
      const conteudo = await caixa(
        page.getByRole("main").locator(":scope > div > div").filter({ has: titulo }),
      );
      expect(conteudo.width, caminho).toBeLessThanOrEqual(1024);
      const folgaEsquerda = conteudo.x - area.x;
      const folgaDireita = area.x + area.width - (conteudo.x + conteudo.width);
      expect(Math.abs(folgaEsquerda - folgaDireita), caminho).toBeLessThanOrEqual(1);
    }
  });

  test("Próximos meses tem uma linha por mês, uma embaixo da outra, sem rolagem lateral (TRES-02, AC 4)", async ({
    page,
  }) => {
    await page.goto(`/${MARCO}`);

    const secao = page.getByRole("region", { name: "Próximos meses" });
    const linhas = secao.getByRole("listitem");
    await expect(linhas).toHaveCount(3);
    const caixas = await Promise.all([0, 1, 2].map((indice) => caixa(linhas.nth(indice))));
    for (const [anterior, atual] of [
      [caixas[0], caixas[1]],
      [caixas[1], caixas[2]],
    ]) {
      if (anterior === undefined || atual === undefined) {
        throw new Error("faltou uma linha");
      }
      expect(atual.x).toBe(anterior.x);
      expect(atual.y).toBeGreaterThanOrEqual(anterior.y + anterior.height - 1);
    }
    const rolaDeLado = await secao
      .getByRole("list")
      .evaluate((lista) => lista.scrollWidth > lista.clientWidth);
    expect(rolaDeLado).toBe(false);
  });

  test("a Visão geral não tem o importar fora do menu (TRES-02, AC 6)", async ({ page }) => {
    await page.goto(`/${MARCO}`);

    await expect(menu(page).getByRole("button", { name: "Importar planilha" })).toHaveCount(1);
    await expect(
      page.getByRole("main").getByRole("button", { name: "Importar planilha" }),
    ).toHaveCount(0);
  });
});

test.describe("a Visão geral em 1.920 px", () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test("o mês no centro, sem largura máxima, e a coluna de ação à direita, na mesma altura (TRES-02, ACs 1 a 3)", async ({
    page,
  }) => {
    await page.goto(`/${ATUAL}`);

    const titulo = await caixa(page.getByRole("heading", { level: 1 }));
    const alternador = await caixa(page.getByRole("navigation", { name: "Visão do mês" }));
    const grade = page.getByRole("link", { name: /Receitas do mês/ }).locator("xpath=..");
    for (const rotulo of [
      "Receitas do mês",
      "Despesas do mês",
      "Ainda não pago",
      "Saldo previsto",
    ]) {
      await expect(grade.getByText(rotulo, { exact: true })).toBeVisible();
    }
    const cards = await caixa(grade);
    const categorias = await caixa(page.getByRole("heading", { name: "Gastos por categoria" }));
    const proximos = await caixa(page.getByRole("heading", { name: "Próximos meses" }));
    const acao = await caixa(page.getByRole("region", { name: "Novo lançamento" }));

    /* O centro passou dos 1.024 px de antes. */
    expect(cards.width).toBeGreaterThan(1024);
    /* A coluna de ação à direita do centro, começando no alto, antes dos cards. */
    expect(acao.x).toBeGreaterThanOrEqual(cards.x + cards.width);
    expect(acao.y).toBeLessThan(cards.y);
    /* No centro, nesta ordem: título, alternador, cards e as duas seções. */
    expect(titulo.y).toBeLessThan(alternador.y);
    expect(alternador.y).toBeLessThan(cards.y);
    expect(cards.y + cards.height).toBeLessThanOrEqual(categorias.y);
    /* As duas seções lado a lado. */
    expect(Math.abs(proximos.y - categorias.y)).toBeLessThanOrEqual(1);
    expect(proximos.x).toBeGreaterThan(categorias.x + categorias.width);
  });

  /*
   * A busca e os últimos "na coluna de ação" (L-018): as caixas são medidas
   * contra a dos cards e a da região "Novo lançamento". Uma busca ou uma lista
   * que fosse parar no centro passaria numa consulta à página inteira.
   */
  test("a busca e os últimos ficam na coluna de ação, que uma linha fina separa do centro (TRES-02, AC 1; TRES-04, AC 1; TRES-05, AC 1)", async ({
    page,
  }) => {
    await page.goto(`/${ATUAL}`);
    const ultimos = page.getByRole("region", { name: "Últimos lançamentos" });
    await expect(ultimos).toBeVisible();

    const cards = await caixa(
      page.getByRole("link", { name: /Receitas do mês/ }).locator("xpath=.."),
    );
    const cadastro = page.getByRole("region", { name: "Novo lançamento" });
    const coluna = await caixa(cadastro);
    for (const alvo of [page.getByRole("search", { name: "Buscar lançamento" }), ultimos]) {
      const medida = await caixa(alvo);
      expect(medida.x).toBeGreaterThanOrEqual(cards.x + cards.width);
      expect(Math.abs(medida.x - coluna.x)).toBeLessThanOrEqual(24);
    }

    const linha = await cadastro.locator("xpath=..").evaluate((elemento) => {
      const estilo = getComputedStyle(elemento);
      return { largura: estilo.borderLeftWidth, tipo: estilo.borderLeftStyle };
    });
    expect(linha).toEqual({ largura: "1px", tipo: "solid" });
  });

  test("o cadastro está aberto na coluna de ação, sem diálogo, com as abas Avulso e Parcelado (TRES-03, AC 1)", async ({
    page,
  }) => {
    await page.goto(`/${ATUAL}`);

    const acao = page.getByRole("region", { name: "Novo lançamento" });
    const abas = acao.getByRole("tablist", { name: "Tipo de lançamento a cadastrar" });
    await expect(abas.getByRole("tab")).toHaveText(["Avulso", "Parcelado"]);
    await expect(acao.getByRole("form", { name: "Lançamento avulso" })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("os últimos lançamentos são os 8 mais recentes até hoje, sem o de amanhã (TRES-05, AC 1)", async ({
    page,
  }) => {
    await page.goto(`/${ATUAL}`);

    const ultimos = page.getByRole("region", { name: "Últimos lançamentos" });
    const linhas = ultimos.getByRole("listitem");
    await expect(linhas).toHaveCount(8);
    const esperadas = Array.from({ length: 8 }, (_, indice) => recente(indice + 1));
    for (const [indice, descricao] of esperadas.entries()) {
      await expect(linhas.nth(indice)).toContainText(descricao);
    }
    await expect(ultimos.getByText("Futuro A")).toHaveCount(0);
  });

  /*
   * A cor da pill atravessa a página (L-014): quem monta o mapa de cores é a
   * página, e o teste do componente recebe o mapa pronto. O esperado sai da
   * mesma regra do app: a cor da "Categoria Um" (automática, pelo nome) e as
   * classes da pill dela, aplicadas a um elemento de prova na mesma página.
   */
  test("a pill de cada linha dos últimos tem a cor da categoria, e não a neutra (TRES-05, AC 3)", async ({
    page,
  }) => {
    await page.goto(`/${ATUAL}`);
    const linha = page
      .getByRole("region", { name: "Últimos lançamentos" })
      .getByRole("listitem")
      .filter({ hasText: recente(1) });
    const pill = linha.getByText("Categoria Um", { exact: true });
    await expect(pill).toBeVisible();

    const fundoDe = (classe: string) =>
      page.evaluate((nome) => {
        const prova = document.createElement("span");
        prova.className = nome;
        document.body.append(prova);
        const cor = getComputedStyle(prova).backgroundColor;
        prova.remove();
        return cor;
      }, classe);
    const esperado = await fundoDe(
      CLASSES_DA_COR[corDaCategoria({ nome: "Categoria Um", cor: null })].pill,
    );
    const neutro = await fundoDe("bg-surface-strong");

    const fundoDaPill = await pill.evaluate(
      (elemento) => getComputedStyle(elemento).backgroundColor,
    );
    expect(fundoDaPill).toBe(esperado);
    expect(fundoDaPill).not.toBe(neutro);
  });

  test("lançar pela coluna aumenta Despesas do mês, entra em Gastos por categoria, põe o gasto no topo dos últimos e mantém o cadastro com a confirmação (TRES-03, ACs 2 e 3)", async ({
    page,
  }) => {
    await page.goto(`/${ATUAL}`);
    const despesas = page.getByRole("link", { name: /Despesas do mês/ });
    await expect(despesas).toContainText("R$ 110,00");
    const semCategoria = page
      .getByRole("list", { name: "Gastos por categoria, ordenados do maior para o menor" })
      .getByRole("listitem")
      .filter({ hasText: "Sem categoria" });
    await expect(semCategoria).toHaveCount(0);

    const form = page
      .getByRole("region", { name: "Novo lançamento" })
      .getByRole("form", { name: "Lançamento avulso" });
    await form.getByLabel("Descrição").fill("Item novo");
    await form.getByLabel("Valor (R$)").fill("100,00");
    await form.getByLabel("Meio de pagamento").selectOption({ label: "Conta Corrente" });
    await form.getByLabel("Categoria", { exact: true }).selectOption({ label: "Sem categoria" });
    await form.getByRole("button", { name: "Cadastrar lançamento" }).click();

    await expect(form.getByRole("status")).toContainText("Item novo");
    await expect(form).toBeVisible();
    await expect(despesas).toContainText("R$ 210,00");
    await expect(semCategoria).toContainText("R$ 100,00");
    await expect(
      page.getByRole("region", { name: "Últimos lançamentos" }).getByRole("listitem").first(),
    ).toContainText("Item novo");
  });

  /* "Próximos meses" também acompanha: a compra parcelada põe a 2ª parcela no mês seguinte. */
  test("lançar uma compra parcelada pela coluna aumenta o comprometido do mês seguinte em Próximos meses (TRES-03, AC 2)", async ({
    page,
  }) => {
    await page.goto(`/${ATUAL}`);
    const comprometidoDoSeguinte = page
      .getByRole("region", { name: "Próximos meses" })
      .getByRole("listitem")
      .first()
      .locator("dt", { hasText: "Comprometido" })
      .locator("xpath=following-sibling::dd[1]");
    await expect(comprometidoDoSeguinte).toHaveText("R$ 0,00");

    const cadastro = page.getByRole("region", { name: "Novo lançamento" });
    await cadastro.getByRole("tab", { name: "Parcelado" }).click();
    const form = cadastro.getByRole("form", { name: "Nova compra" });
    await form.getByLabel("Descrição", { exact: true }).fill("Compra A");
    await form.getByLabel("Valor total (R$)").fill("300,00");
    await form.getByLabel("Quantidade de parcelas").fill("3");
    await form.getByRole("button", { name: "Cadastrar compra" }).click();

    await expect(form.getByRole("status")).toContainText("Compra A");
    await expect(comprometidoDoSeguinte).toHaveText("R$ 100,00");
  });

  test("buscar um termo abre Lançamentos do mês com a busca preenchida e só o que casa (TRES-04, ACs 1 e 2)", async ({
    page,
  }) => {
    await page.goto(`/${ATUAL}`);

    const busca = page.getByRole("search", { name: "Buscar lançamento" });
    await busca.getByLabel("Buscar lançamento").fill("Recente 02");
    await busca.getByLabel("Buscar lançamento").press("Enter");

    await expect(page).toHaveURL(new RegExp(`/${ATUAL}/lancamentos\\?busca=Recente\\+02$`));
    await expect(
      page.locator("#cartao-de-filtros search").getByLabel("Buscar por descrição"),
    ).toHaveValue("Recente 02");
    await expect(page.getByRole("row", { name: /Recente 02/ })).toBeVisible();
    await expect(page.getByRole("row", { name: /Recente 03/ })).toHaveCount(0);
  });

  test("buscar vazio abre Lançamentos do mês sem filtro de busca (TRES-04, AC 3)", async ({
    page,
  }) => {
    await page.goto(`/${ATUAL}`);

    await page
      .getByRole("search", { name: "Buscar lançamento" })
      .getByRole("button", { name: "Buscar" })
      .click();

    await expect(page).toHaveURL(new RegExp(`/${ATUAL}/lancamentos\\?busca=$`));
    await expect(
      page.locator("#cartao-de-filtros search").getByLabel("Buscar por descrição"),
    ).toHaveValue("");
    await expect(page.getByRole("row", { name: /Recente 02/ })).toBeVisible();
    await expect(page.getByRole("row", { name: /Recente 03/ })).toBeVisible();
  });
});

/* Os pontos de virada que a spec fixa, provados dos dois lados (L-029). */
test("a coluna de ação fica ao lado do centro em 1.280 px e abaixo dele em 1.279 px (TRES-02, ACs 1 e 5)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`/${ATUAL}`);
  await expect(page.getByRole("region", { name: "Últimos lançamentos" })).toBeVisible();
  const cadastro = page.getByRole("region", { name: "Novo lançamento" });

  const cards = await caixa(
    page.getByRole("link", { name: /Receitas do mês/ }).locator("xpath=.."),
  );
  expect((await caixa(cadastro)).x).toBeGreaterThanOrEqual(cards.x + cards.width);

  await page.setViewportSize({ width: 1279, height: 900 });
  const proximos = await caixa(page.getByRole("region", { name: "Próximos meses" }));
  expect((await caixa(cadastro)).y).toBeGreaterThanOrEqual(proximos.y + proximos.height - 1);
});

test("em 768 px o menu já é a coluna da borda, presa ao rolar, com as áreas dentro e o importar à vista (TRES-01, AC 1)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto(`/${ATUAL}`);
  await expect(page.getByRole("region", { name: "Últimos lançamentos" })).toBeVisible();

  const coluna = await caixa(menu(page));
  expect(coluna.x).toBe(0);
  expect(coluna.width).toBeLessThanOrEqual(260);
  const areas = await caixa(
    menu(page).getByRole("navigation", { name: "Áreas do myBilling" }).getByRole("list"),
  );
  expect(areas.x + areas.width).toBeLessThanOrEqual(coluna.x + coluna.width);

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  expect(Math.abs((await caixa(menu(page))).y)).toBeLessThanOrEqual(1);
  await expect(menu(page).getByRole("button", { name: "Importar planilha" })).toBeInViewport();
});

test("em 767 px o menu é a barra do topo, da largura da janela, e as áreas ficam na base (TRES-01, AC 9)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 767, height: 900 });
  await page.goto(`/${MARCO}/lancamentos`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  const topo = await caixa(menu(page));
  expect(topo.y).toBe(0);
  expect(Math.abs(topo.width - 767)).toBeLessThanOrEqual(1);
  const areas = await caixa(
    page.getByRole("navigation", { name: "Áreas do myBilling" }).getByRole("list"),
  );
  expect(areas.y + areas.height).toBeGreaterThanOrEqual(899);
});

test("em 1.024 px, a coluna de ação fica abaixo do centro (TRES-02, AC 5)", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto(`/${ATUAL}`);

  const proximos = await caixa(page.getByRole("region", { name: "Próximos meses" }));
  const acao = await caixa(page.getByRole("region", { name: "Novo lançamento" }));
  expect(acao.y).toBeGreaterThanOrEqual(proximos.y + proximos.height - 1);
});

test("em 1.280 px, a barra de filtros compacta de Lançamentos começa depois do menu (TRES-01)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 600 });
  await page.goto(`/${MARCO}/lancamentos`);
  await expect(page.getByRole("row", { name: /Fixo 15/ })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));

  const barra = page.getByRole("search", { name: "Busca e filtros ativos" });
  await expect(barra).toBeVisible();
  const lateral = await caixa(menu(page));
  expect((await caixa(barra)).x).toBeGreaterThanOrEqual(lateral.x + lateral.width);
});

test.describe("em 400 px", () => {
  test.use({ viewport: { width: 400, height: 800 } });

  test("as áreas ficam na barra de baixo e o topo tem a marca, o importar, o tema e o nome (TRES-01, AC 9)", async ({
    page,
  }) => {
    await page.goto(`/${MARCO}/lancamentos`);

    const areas = await caixa(
      page.getByRole("navigation", { name: "Áreas do myBilling" }).getByRole("list"),
    );
    expect(areas.y + areas.height).toBeGreaterThanOrEqual(799);

    const topo = await caixa(menu(page));
    expect(topo.y).toBe(0);
    await expect(menu(page).getByRole("link", { name: "myBilling" })).toBeVisible();
    await expect(menu(page).getByRole("button", { name: "Importar planilha" })).toBeVisible();
    await expect(menu(page).getByRole("group", { name: "Tema da interface" })).toBeVisible();
    await expect(menu(page).getByText("Pessoa A", { exact: true })).toBeVisible();
  });

  test("nenhuma tela autenticada rola na horizontal (TRES-01, AC 10)", async ({ page }) => {
    for (const caminho of [
      "/",
      `/${MARCO}`,
      `/${MARCO}/lancamentos`,
      `/${MARCO}/fixos`,
      `/${MARCO}/cadastros/categorias`,
    ]) {
      await page.goto(caminho);
      await expect(menu(page)).toBeVisible();

      expect(await transbordoHorizontal(page), caminho).toBe(0);
    }
  });
});
