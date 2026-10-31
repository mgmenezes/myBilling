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
 * **Lançamentos em lista densa, de ponta a ponta** (DENS-01 a DENS-04).
 *
 * Março de 2026 já passou, então o que não foi pago aparece como "Vencido":
 * o mês tem, de propósito, uma linha de cada tipo que pode crescer. São elas
 * uma parcela de compra, um fixo com o valor confirmado, um fixo ainda
 * previsto, um avulso pago, um avulso vencido e uma entrada.
 *
 * Layout se prova no navegador, com a caixa medida e o estilo computado. Toda
 * medida espera a página pronta antes. Nomes genéricos e valores redondos
 * (AD-009).
 */

const EMAIL_PERMITIDO = "pessoa-a@example.com";
const MARCO = "2026-03";

let pool: Pool;
let base: CadastroBase;

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }, testInfo) => {
  pool = criarPoolDeTeste();
  await recriarBancoDeTeste(pool);
  await limparDados(pool);
  base = await semearCadastroBase(pool);

  /* Fixo A, confirmado: previa R$ 100,00, veio R$ 105,00. A ocorrência entra
     já gravada, e a materialização a reconhece pela restrição única. */
  const fixoA = await semearRecorrencia("Fixo A", 10000);
  await pool.query(
    `INSERT INTO movimento (natureza, origem, descricao, competencia, data_evento, valor_centavos,
       valor_previsto_centavos, categoria_id, usuario_id, meio_pagamento_id, recorrencia_id)
     VALUES ('DESPESA', 'RECORRENCIA', 'Fixo A', $1, $2, 10500, 10000, $3, $4, $5, $6)`,
    [`${MARCO}-01`, `${MARCO}-10`, base.categoriaId, base.usuarioId, base.contaId, fixoA],
  );
  /* Fixo B, ainda previsto: a materialização o cria ao abrir o mês. */
  await semearRecorrencia("Fixo B", 5000);
  await semearAvulso("Item A", "DESPESA", base.categoriaId, `${MARCO}-05`, `${MARCO}-05`, 2000);
  await semearAvulso("Item B", "DESPESA", base.categoriaId, `${MARCO}-08`, null, 3000);
  await semearAvulso("Entrada A", "RECEITA", null, `${MARCO}-02`, `${MARCO}-02`, 100000);
  await cadastrarCompraPelaInterface(browser, testInfo.project.use.baseURL);
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

async function semearRecorrencia(descricao: string, centavos: number): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO recorrencia (descricao, natureza, categoria_id, usuario_id, meio_pagamento_id,
       competencia_inicio, competencia_fim, dia_vencimento)
     VALUES ($1, 'DESPESA', $2, $3, $4, $5, $5, 10) RETURNING id`,
    [descricao, base.categoriaId, base.usuarioId, base.contaId, `${MARCO}-01`],
  );
  const id = rows[0]?.id;
  if (id === undefined) {
    throw new Error("a recorrência não foi gravada");
  }
  await pool.query(
    "INSERT INTO recorrencia_versao (recorrencia_id, vigente_desde, valor_previsto_centavos) VALUES ($1, $2, $3)",
    [id, `${MARCO}-01`, centavos],
  );
  return id;
}

async function semearAvulso(
  descricao: string,
  natureza: "DESPESA" | "RECEITA",
  categoriaId: string | null,
  dataEvento: string,
  pagoEm: string | null,
  centavos: number,
): Promise<void> {
  await pool.query(
    `INSERT INTO movimento (natureza, origem, descricao, competencia, data_evento, valor_centavos,
       pago_em, categoria_id, usuario_id, meio_pagamento_id)
     VALUES ($1, 'AVULSO', $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      natureza,
      descricao,
      `${MARCO}-01`,
      dataEvento,
      centavos,
      pagoEm,
      categoriaId,
      base.usuarioId,
      base.contaId,
    ],
  );
}

/** "Compra A": R$ 300,00 em 3 parcelas, a primeira em março. */
async function cadastrarCompraPelaInterface(
  browser: Browser,
  baseURL: string | undefined,
): Promise<void> {
  const contexto = await browser.newContext({ baseURL });
  const page = await contexto.newPage();
  await entrar(page, EMAIL_PERMITIDO);
  await page.goto(`/${MARCO}/lancamentos`);
  await page.getByRole("button", { name: "+ Novo lançamento" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByRole("tab", { name: "Parcelado" }).click();
  const form = dialogo.getByRole("form", { name: "Nova compra" });
  await form.getByLabel("Descrição", { exact: true }).fill("Compra A");
  await form.getByLabel("Valor total (R$)").fill("300,00");
  await form.getByLabel("Quantidade de parcelas").fill("3");
  await form.getByRole("button", { name: "Cadastrar compra" }).click();
  await expect(form.getByRole("status")).toContainText("Compra A");
  await contexto.close();
}

/** Abre a tela e espera o título, antes de medir qualquer coisa. */
async function abrir(page: Page, caminho: string): Promise<void> {
  await page.goto(caminho);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

/** A linha cuja célula da descrição começa pela descrição dada. */
function linha(page: Page, descricao: string): Locator {
  return page
    .locator("table tbody tr")
    .filter({ has: page.locator("td:first-child", { hasText: new RegExp(`^${descricao}( |$)`) }) });
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

/* O limiar da linha baixa (DENS-01, AC 1): 1.280 px, o notebook comum. */
test("em 1.280 px, com ponteiro fino, toda linha das tabelas mede até 48 px (DENS-01, AC 1)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await abrir(page, `/${MARCO}/lancamentos`);
  await expect(linha(page, "Compra A")).toContainText("1/3 · faltam 2");

  const alturas = await page.locator("table tbody tr").evaluateAll((linhas) =>
    linhas.map((tr) => ({
      linha: tr.querySelector("td")?.textContent ?? "",
      altura: tr.getBoundingClientRect().height,
    })),
  );
  expect(alturas).toHaveLength(6);
  for (const { linha: nome, altura } of alturas) {
    expect(altura, nome).toBeLessThanOrEqual(48);
  }
});

test.describe("em 1.920 px, com ponteiro fino", () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test("toda linha das tabelas mede até 48 px, inclusive a parcela, o fixo confirmado e o vencido (DENS-01, AC 1)", async ({
    page,
  }) => {
    await abrir(page, `/${MARCO}/lancamentos`);

    /* As linhas que antes cresciam estão todas na tela. */
    await expect(linha(page, "Compra A")).toContainText("1/3 · faltam 2");
    await expect(linha(page, "Fixo A")).toContainText("confirmado · previa");
    await expect(linha(page, "Item B")).toContainText("Vencido");

    const alturas = await page.locator("table tbody tr").evaluateAll((linhas) =>
      linhas.map((tr) => ({
        linha: tr.querySelector("td")?.textContent ?? "",
        altura: tr.getBoundingClientRect().height,
      })),
    );
    /* Entrada A, Fixo A, Fixo B, Compra A, Item A e Item B. */
    expect(alturas).toHaveLength(6);
    for (const { linha: nome, altura } of alturas) {
      expect(altura, nome).toBeLessThanOrEqual(48);
    }
  });

  test('o fixo confirmado mostra "confirmado · previa" na mesma linha do valor, à esquerda dele (DENS-01, AC 5)', async ({
    page,
  }) => {
    await abrir(page, `/${MARCO}/lancamentos`);

    const fixo = linha(page, "Fixo A");
    const valor = await caixa(fixo.getByRole("button", { name: /confirmar o valor de Fixo A/ }));
    const previsao = await caixa(fixo.getByText("confirmado · previa R$ 100,00"));
    expect(previsao.x + previsao.width).toBeLessThanOrEqual(valor.x + 1);
    expect(previsao.y).toBeLessThan(valor.y + valor.height);
    expect(previsao.y + previsao.height).toBeGreaterThan(valor.y);
  });

  test('o selo fica ao lado de "Vencido" e alterna o pagamento com o mesmo nome (DENS-01, ACs 3 e 4)', async ({
    page,
  }) => {
    await abrir(page, `/${MARCO}/lancamentos`);

    const item = linha(page, "Item B");
    const selo = item.getByRole("button", { name: /^Previsto\s*, Item B/ });
    const vencido = await caixa(item.getByText("Vencido", { exact: true }));
    const caixaDoSelo = await caixa(selo);
    expect(vencido.x).toBeGreaterThanOrEqual(caixaDoSelo.x + caixaDoSelo.width);
    expect(vencido.y).toBeLessThan(caixaDoSelo.y + caixaDoSelo.height);

    await expect(selo).toHaveAttribute("aria-pressed", "false");
    await selo.click();
    const pago = item.getByRole("button", { name: /^Pago\s*, Item B/ });
    await expect(pago).toHaveAttribute("aria-pressed", "true");
    /* Volta ao que era, para os testes seguintes contarem com o vencido. */
    await pago.click();
    await expect(item.getByRole("button", { name: /^Previsto\s*, Item B/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});

test.describe("o menu da linha, em 1.920 px", () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test('só as linhas de avulso têm o "⋯", e nenhuma linha mostra "Excluir" fora dele (DENS-02, ACs 1, 2 e 6)', async ({
    page,
  }) => {
    await abrir(page, `/${MARCO}/lancamentos`);

    for (const avulso of ["Entrada A", "Item A", "Item B"]) {
      await expect(
        linha(page, avulso).getByRole("button", { name: `Mais ações para ${avulso}` }),
      ).toBeVisible();
    }
    for (const outro of ["Fixo A", "Fixo B", "Compra A"]) {
      await expect(linha(page, outro).getByRole("button", { name: /^Mais ações/ })).toHaveCount(0);
    }
    await expect(page.getByRole("button", { name: /^Excluir/ })).toHaveCount(0);
  });

  test('Escape fecha o menu e devolve o foco ao "⋯"; excluir pelo menu, em dois toques, tira a linha e baixa o total do bloco (DENS-02, ACs 3 a 5)', async ({
    page,
  }) => {
    await abrir(page, `/${MARCO}/lancamentos`);
    const gastos = page.getByRole("region", { name: "Gastos do Mês" });
    await expect(gastos).toContainText("2 · R$ 50,00");

    const item = linha(page, "Item A");
    const gatilho = item.getByRole("button", { name: "Mais ações para Item A" });
    await gatilho.click();
    await expect(gatilho).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(gatilho).toHaveAttribute("aria-expanded", "false");
    await expect(gatilho).toBeFocused();

    await gatilho.click();
    await item.getByRole("button", { name: /^Excluir/ }).click();
    await expect(item).toBeVisible();
    await item.getByRole("button", { name: /^Confirmar/ }).click();

    await expect(linha(page, "Item A")).toHaveCount(0);
    await expect(gastos).toContainText("1 · R$ 30,00");
  });
});
