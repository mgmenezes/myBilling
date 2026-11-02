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
 * **Excluir uma compra parcelada desta parcela em diante, de ponta a ponta**
 * (EXC-01 a EXC-05).
 *
 * "Compra A": R$ 40,00 em 4x de R$ 10,00 no cartão, de dezembro de 2026 a
 * março de 2027. Em volta dela, uma entrada fixa de R$ 1.000,00 e um fixo de
 * R$ 100,00 desde dezembro, e um avulso de R$ 20,00 em janeiro. Cada elo tem
 * teste próprio (domínio, caso de uso, action, componentes); só a tela prova
 * que o aviso calculado na carga da página é o que o servidor grava, e que os
 * outros meses deixam de contar as parcelas que saíram (L-014). O aviso é lido
 * na tela (L-054), e as consultas ficam presas à linha e ao menu aberto
 * (L-018). Nomes genéricos e valores escolhidos pela conta (AD-009).
 */

const EMAIL_PERMITIDO = "pessoa-a@example.com";
const DEZEMBRO = "2026-12";
const JANEIRO = "2027-01";
const FEVEREIRO = "2027-02";
const MARCO = "2027-03";

let pool: Pool;
let base: CadastroBase;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  pool = criarPoolDeTeste();
  await recriarBancoDeTeste(pool);
  await limparDados(pool);
  base = await semearCadastroBase(pool);
  await semearRecorrencia("Entrada A", "RECEITA", null, 100000);
  await semearRecorrencia("Fixo A", "DESPESA", base.categoriaId, 10000);
  await semearCompra();
  await pool.query(
    `INSERT INTO movimento (natureza, origem, descricao, competencia, data_evento, valor_centavos,
       categoria_id, usuario_id, meio_pagamento_id)
     VALUES ('DESPESA', 'AVULSO', 'Item A', $1, $2, 2000, $3, $4, $5)`,
    [`${JANEIRO}-01`, `${JANEIRO}-05`, base.categoriaId, base.usuarioId, base.contaId],
  );
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

/** Desde dezembro, sem fim: a materialização cria a ocorrência de cada mês aberto. */
async function semearRecorrencia(
  descricao: string,
  natureza: "RECEITA" | "DESPESA",
  categoriaId: string | null,
  centavos: number,
): Promise<void> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO recorrencia (descricao, natureza, categoria_id, usuario_id, meio_pagamento_id,
       competencia_inicio, competencia_fim, dia_vencimento)
     VALUES ($1, $2, $3, $4, $5, $6, NULL, 10) RETURNING id`,
    [descricao, natureza, categoriaId, base.usuarioId, base.contaId, `${DEZEMBRO}-01`],
  );
  await pool.query(
    "INSERT INTO recorrencia_versao (recorrencia_id, vigente_desde, valor_previsto_centavos) VALUES ($1, $2, $3)",
    [rows[0]?.id, `${DEZEMBRO}-01`, centavos],
  );
}

/** "Compra A": R$ 40,00 em 4x de R$ 10,00, de dezembro a março. */
async function semearCompra(): Promise<void> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO compra_parcelada
       (descricao, modo_entrada, valor_total_centavos, qtd_parcelas, parcela_inicial,
        competencia_compra, politica_residuo, valor_amortizado_anterior_centavos,
        categoria_id, usuario_id, meio_pagamento_id, idempotency_key)
     VALUES ('Compra A', 'TOTAL', 4000, 4, 1, $1, 'PRIMEIRAS', 0, $2, $3, $4, 'chave-compra-a')
     RETURNING id`,
    [`${DEZEMBRO}-01`, base.categoriaId, base.usuarioId, base.cartaoId],
  );
  const compraId = rows[0]?.id;
  for (const [indice, competencia] of [DEZEMBRO, JANEIRO, FEVEREIRO, MARCO].entries()) {
    await pool.query(
      `INSERT INTO movimento (natureza, origem, descricao, competencia, data_evento, valor_centavos,
         categoria_id, usuario_id, meio_pagamento_id, compra_id, numero_parcela)
       VALUES ('DESPESA', 'PARCELA', 'Compra A', $1, $2, 1000, $3, $4, $5, $6, $7)`,
      [
        `${competencia}-01`,
        `${competencia}-10`,
        base.categoriaId,
        base.usuarioId,
        base.cartaoId,
        compraId,
        indice + 1,
      ],
    );
  }
}

/** Abre a tela e espera o título, antes de ler ou medir qualquer coisa. */
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

function gatilho(item: Locator, descricao: string): Locator {
  return item.getByRole("button", { name: `Mais ações para ${descricao}` });
}

/**
 * O "Excluir" de dentro do menu. No navegador o texto `sr-only` é posicionado
 * fora do fluxo e entra no nome com um espaço antes da vírgula ("Excluir ,
 * Compra A"), como o "Previsto , Compra A" do selo.
 */
function excluirDe(descricao: string): RegExp {
  return new RegExp(`^Excluir ?, ${descricao}$`);
}

/** O painel que o "⋯" abriu, pelo `aria-controls` dele. */
async function menuAberto(page: Page, botao: Locator): Promise<Locator> {
  await expect(botao).toHaveAttribute("aria-expanded", "true");
  const id = await botao.getAttribute("aria-controls");
  return page.locator(`[id="${id}"]`);
}

function proximosMeses(page: Page): Locator {
  return page.getByRole("region", { name: "Próximos meses" });
}

/** O "Vai sobrar" do cartão do mês, na régua "Próximos meses". */
function vaiSobrar(page: Page, mes: string): Locator {
  return proximosMeses(page)
    .getByRole("listitem")
    .filter({ hasText: mes })
    .locator("dt", { hasText: "Vai sobrar" })
    .locator("xpath=following-sibling::dd[1]");
}

/** O valor do card "Saldo previsto" dos indicadores da Visão geral. */
function cardSaldoPrevisto(page: Page): Locator {
  return page
    .getByText("Saldo previsto", { exact: true })
    .locator("xpath=following-sibling::span[1]");
}

/** "R$ 1.234,56" ou "-R$ 1.234,56" → centavos. */
function centavos(texto: string | null): number {
  if (texto === null) {
    throw new Error("valor ausente");
  }
  const sinal = texto.trim().startsWith("-") ? -1 : 1;
  return sinal * Number(texto.replace(/\D/g, ""));
}

interface Saldos {
  readonly proximos: Record<string, number>;
  readonly previsto: Record<string, number>;
}

/** "Próximos meses" visto de dezembro, e o "Saldo previsto" de cada mês. */
async function lerSaldos(page: Page): Promise<Saldos> {
  await abrir(page, `/${DEZEMBRO}`);
  const proximos: Record<string, number> = {};
  for (const mes of ["Janeiro de 2027", "Fevereiro de 2027", "Março de 2027"]) {
    await expect(vaiSobrar(page, mes)).toBeVisible();
    proximos[mes] = centavos(await vaiSobrar(page, mes).textContent());
  }
  const previsto: Record<string, number> = {};
  for (const mes of [JANEIRO, FEVEREIRO, MARCO]) {
    await abrir(page, `/${mes}`);
    await expect(cardSaldoPrevisto(page)).toBeVisible();
    previsto[mes] = centavos(await cardSaldoPrevisto(page).textContent());
  }
  return { proximos, previsto };
}

let antes: Saldos;

test('em janeiro a parcela tem "⋯" com "Excluir", o fixo não tem "⋯" e o avulso ainda pede "Confirmar?" (EXC-01, ACs 1 a 4)', async ({
  page,
}) => {
  await abrir(page, `/${JANEIRO}/lancamentos`);

  const parcela = linha(page, "Compra A");
  await expect(parcela).toContainText("2/4 · faltam 2");
  await gatilho(parcela, "Compra A").click();
  const menu = await menuAberto(page, gatilho(parcela, "Compra A"));
  await expect(menu.getByRole("button", { name: excluirDe("Compra A") })).toBeVisible();

  await expect(linha(page, "Fixo A")).toBeVisible();
  await expect(linha(page, "Fixo A").getByRole("button", { name: /^Mais ações/ })).toHaveCount(0);

  const avulso = linha(page, "Item A");
  await gatilho(avulso, "Item A").click();
  const menuDoAvulso = await menuAberto(page, gatilho(avulso, "Item A"));
  await menuDoAvulso.getByRole("button", { name: excluirDe("Item A") }).click();
  await expect(menuDoAvulso.getByRole("button", { name: /^Confirmar\?/ })).toBeVisible();
  await expect(menuDoAvulso.getByRole("button", { name: "Excluir desta em diante" })).toHaveCount(
    0,
  );
  await expect(menuDoAvulso).not.toContainText("desta parcela em diante");
  await page.keyboard.press("Escape");
  await expect(linha(page, "Item A")).toBeVisible();
});

test('na 2/4 o aviso diz o que sai, e "Cancelar" fecha sem excluir (EXC-02, ACs 1, 2, 4, 7 e 9)', async ({
  page,
}) => {
  await abrir(page, `/${JANEIRO}/lancamentos`);
  const parcela = linha(page, "Compra A");
  await gatilho(parcela, "Compra A").click();
  const menu = await menuAberto(page, gatilho(parcela, "Compra A"));

  await menu.getByRole("button", { name: excluirDe("Compra A") }).click();

  await expect(menu).toContainText(
    "Excluir Compra A desta parcela em diante? Saem 3 parcelas, de Janeiro de 2027 a Março de 2027, somando R$ 30,00. As anteriores ficam.",
  );
  await expect(menu.getByRole("button", { name: "Excluir desta em diante" })).toBeVisible();
  await expect(menu.getByRole("button", { name: "Cancelar" })).toBeFocused();

  await menu.getByRole("button", { name: "Cancelar" }).click();

  await expect(gatilho(parcela, "Compra A")).toHaveAttribute("aria-expanded", "false");
  await expect(gatilho(parcela, "Compra A")).toBeFocused();
  await page.reload();
  await expect(linha(page, "Compra A")).toContainText("2/4 · faltam 2");
  const { rows } = await pool.query<{ total: string }>(
    "SELECT COUNT(*) AS total FROM movimento WHERE descricao = 'Compra A' AND cancelado_em IS NULL",
  );
  expect(rows[0]?.total).toBe("4");
});

test("com a 3/4 paga, excluir a partir da 2/4 tira a 2/4 e a 4/4, e a lista de janeiro perde a linha sem recarregar (EXC-02, AC 6; EXC-03; EXC-04, ACs 1, 2, 4 e 5)", async ({
  page,
}) => {
  await pool.query(
    "UPDATE movimento SET pago_em = $1 WHERE descricao = 'Compra A' AND numero_parcela = 3",
    [`${FEVEREIRO}-10`],
  );
  antes = await lerSaldos(page);

  await abrir(page, `/${JANEIRO}/lancamentos`);
  const parcela = linha(page, "Compra A");
  await gatilho(parcela, "Compra A").click();
  const menu = await menuAberto(page, gatilho(parcela, "Compra A"));
  await menu.getByRole("button", { name: excluirDe("Compra A") }).click();
  await expect(menu).toContainText(
    "Excluir Compra A desta parcela em diante? Saem 2 parcelas, de Janeiro de 2027 a Março de 2027, somando R$ 20,00. 1 parcela já paga fica. As anteriores ficam.",
  );

  await menu.getByRole("button", { name: "Excluir desta em diante" }).click();

  await expect(page.getByRole("status").filter({ hasText: "2 parcelas excluídas." })).toBeVisible();
  await expect(linha(page, "Compra A")).toHaveCount(0);

  await abrir(page, `/${MARCO}/lancamentos`);
  await expect(linha(page, "Fixo A")).toBeVisible();
  await expect(linha(page, "Compra A")).toHaveCount(0);

  await abrir(page, `/${FEVEREIRO}/lancamentos`);
  const paga = linha(page, "Compra A");
  await expect(paga).toContainText("3/4 · última");
  await expect(paga.getByRole("button", { name: /^Pago/ })).toBeVisible();

  await abrir(page, `/${DEZEMBRO}/lancamentos`);
  await expect(linha(page, "Compra A")).toContainText("1/4 · faltam 1");
});

test('"Próximos meses" e "Saldo previsto" de janeiro e março sobem R$ 10,00, e fevereiro fica igual (EXC-04, AC 3)', async ({
  page,
}) => {
  const depois = await lerSaldos(page);

  expect(depois.proximos["Janeiro de 2027"]).toBe((antes.proximos["Janeiro de 2027"] ?? 0) + 1000);
  expect(depois.proximos["Março de 2027"]).toBe((antes.proximos["Março de 2027"] ?? 0) + 1000);
  expect(depois.proximos["Fevereiro de 2027"]).toBe(antes.proximos["Fevereiro de 2027"]);
  expect(depois.previsto[JANEIRO]).toBe((antes.previsto[JANEIRO] ?? 0) + 1000);
  expect(depois.previsto[MARCO]).toBe((antes.previsto[MARCO] ?? 0) + 1000);
  expect(depois.previsto[FEVEREIRO]).toBe(antes.previsto[FEVEREIRO]);
});

test('na 3/4 paga, sem nada não pago depois, o aviso diz "Nada a excluir" e não tem botão de excluir (EXC-05, AC 5)', async ({
  page,
}) => {
  await abrir(page, `/${FEVEREIRO}/lancamentos`);
  const parcela = linha(page, "Compra A");
  await gatilho(parcela, "Compra A").click();
  const menu = await menuAberto(page, gatilho(parcela, "Compra A"));

  await menu.getByRole("button", { name: excluirDe("Compra A") }).click();

  await expect(menu).toContainText(
    "Todas as parcelas desta em diante já foram pagas. Nada a excluir.",
  );
  await expect(menu.getByRole("button", { name: "Excluir desta em diante" })).toHaveCount(0);
  await expect(menu.getByRole("button", { name: "Cancelar" })).toBeVisible();
});

test.describe("em 400 px", () => {
  test.use({ viewport: { width: 400, height: 900 } });

  test('o "⋯" e o "Excluir" da parcela medem ao menos 44 × 44, e o aviso cabe na tela (EXC-01, AC 5; EXC-02, ACs 3 e 5)', async ({
    page,
  }) => {
    await abrir(page, `/${DEZEMBRO}/lancamentos`);
    const parcela = linha(page, "Compra A");
    const botao = gatilho(parcela, "Compra A");
    await expect(botao).toBeVisible();
    const medidaDoGatilho = await botao.boundingBox();
    await botao.click();
    const menu = await menuAberto(page, botao);
    const excluir = menu.getByRole("button", { name: excluirDe("Compra A") });
    const medidaDoExcluir = await excluir.boundingBox();

    for (const medida of [medidaDoGatilho, medidaDoExcluir]) {
      expect(medida?.width).toBeGreaterThanOrEqual(44);
      expect(medida?.height).toBeGreaterThanOrEqual(44);
    }

    await excluir.click();
    const aviso = menu.getByText(
      "Excluir a compra Compra A inteira? Sai 1 parcela, em Dezembro de 2026, de R$ 10,00. 1 parcela já paga fica.",
      { exact: true },
    );
    await expect(aviso).toBeInViewport({ ratio: 1 });
    const transbordo = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(transbordo).toBe(0);
  });
});
