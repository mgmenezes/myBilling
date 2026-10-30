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

  test("Lançamentos fica em até 1.024 px, centrado na área à direita do menu (TRES-01, AC 8)", async ({
    page,
  }) => {
    await page.goto(`/${MARCO}/lancamentos`);

    const area = await caixa(page.getByRole("main"));
    const cartao = await caixa(page.locator("#cartao-de-filtros"));
    expect(cartao.width).toBeLessThanOrEqual(1024);
    const folgaEsquerda = cartao.x - area.x;
    const folgaDireita = area.x + area.width - (cartao.x + cartao.width);
    expect(Math.abs(folgaEsquerda - folgaDireita)).toBeLessThanOrEqual(1);
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
