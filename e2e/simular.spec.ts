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
 * **"Dá pra comprar?", de ponta a ponta** (SIM-02, ACs 1, 3 a 9, 12 e 13;
 * SIM-04, ACs 4 a 6).
 *
 * A fixture é a de `saldo-futuro`: entrada de R$ 1.000,00 e fixo de R$ 300,00
 * desde março, sem fim, e um fixo de R$ 1.200,00 só em maio. Sobram R$ 700,00
 * em cada mês, menos em maio, que já falta R$ 500,00. Os valores são escolhidos
 * pela conta e os nomes são genéricos (AD-009).
 *
 * Cada elo tem teste próprio (domínio, caso de uso, componentes); só a tela
 * prova que o "antes" do simulador é o card "Saldo previsto" do mês aberto e
 * que, depois de lançar, o card vira o "depois" simulado (L-014). As
 * consultas ficam presas à região da resposta (L-018).
 */

const EMAIL_PERMITIDO = "pessoa-a@example.com";
const MARCO = "2026-03";

let pool: Pool;
let base: CadastroBase;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  pool = criarPoolDeTeste();
  await recriarBancoDeTeste(pool);
  await limparDados(pool);
  base = await semearCadastroBase(pool);
  await semearRecorrencia("Entrada A", "RECEITA", null, `${MARCO}-01`, null, 100000);
  await semearRecorrencia("Fixo A", "DESPESA", base.categoriaId, `${MARCO}-01`, null, 30000);
  await semearRecorrencia(
    "Fixo B",
    "DESPESA",
    base.categoriaId,
    "2026-05-01",
    "2026-05-01",
    120000,
  );
});

test.afterAll(async () => {
  await pool.end();
});

test.beforeEach(async ({ page }) => {
  await entrar(page, EMAIL_PERMITIDO);
});

/**
 * Sem seguir o redirect do login: a home materializa a partir do mês de hoje,
 * e a primeira prova deste arquivo é que abrir **março** materializa de março
 * a março seguinte, e não além.
 */
async function entrar(page: Page, email: string): Promise<void> {
  const csrf = await page.request.get("/api/auth/csrf");
  const { csrfToken } = (await csrf.json()) as { csrfToken: string };
  await page.request.post("/api/auth/callback/provedor-de-teste", {
    form: { csrfToken, email, callbackUrl: "/" },
    maxRedirects: 0,
  });
}

async function semearRecorrencia(
  descricao: string,
  natureza: "RECEITA" | "DESPESA",
  categoriaId: string | null,
  inicio: string,
  fim: string | null,
  centavos: number,
): Promise<void> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO recorrencia (descricao, natureza, categoria_id, usuario_id, meio_pagamento_id,
       competencia_inicio, competencia_fim, dia_vencimento)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 10) RETURNING id`,
    [descricao, natureza, categoriaId, base.usuarioId, base.contaId, inicio, fim],
  );
  await pool.query(
    "INSERT INTO recorrencia_versao (recorrencia_id, vigente_desde, valor_previsto_centavos) VALUES ($1, $2, $3)",
    [rows[0]?.id, inicio, centavos],
  );
}

async function competenciasDasOcorrencias(): Promise<string[]> {
  const { rows } = await pool.query<{ competencia: string }>(
    "SELECT DISTINCT competencia::text AS competencia FROM movimento WHERE recorrencia_id IS NOT NULL ORDER BY 1",
  );
  return rows.map((r) => r.competencia);
}

function simulacao(page: Page): Locator {
  return page.getByRole("form", { name: "Simulação" });
}

function resposta(page: Page): Locator {
  return page.getByRole("region", { name: "Resposta da simulação" });
}

function linha(page: Page, mes: string): Locator {
  return resposta(page).getByRole("listitem").filter({ hasText: mes });
}

/** O valor que segue o rótulo, no par `dt`/`dd` da linha. */
function valorDe(item: Locator, rotulo: string): Locator {
  return item.locator("dt", { hasText: rotulo }).locator("xpath=following-sibling::dd[1]");
}

/** O valor do card "Saldo previsto" dos indicadores da Visão geral. */
function cardSaldoPrevisto(page: Page): Locator {
  return page
    .getByText("Saldo previsto", { exact: true })
    .locator("xpath=following-sibling::span[1]");
}

async function simular(page: Page, valor: string, parcelas: string): Promise<void> {
  await simulacao(page).getByLabel("Valor total (R$)").fill(valor);
  await simulacao(page).getByLabel("Quantidade de parcelas").fill(parcelas);
}

test("abrir março materializa até março seguinte e R$ 1.000,00 em 2x cabe, mês a mês, sem servidor (SIM-02, ACs 1, 3 e 5)", async ({
  page,
}) => {
  await page.goto(`/${MARCO}/simular`);
  await expect(page.getByRole("heading", { name: "Dá pra comprar?", level: 1 })).toBeVisible();
  expect(await competenciasDasOcorrencias()).toEqual([
    "2026-03-01",
    "2026-04-01",
    "2026-05-01",
    "2026-06-01",
    "2026-07-01",
    "2026-08-01",
    "2026-09-01",
    "2026-10-01",
    "2026-11-01",
    "2026-12-01",
    "2027-01-01",
    "2027-02-01",
    "2027-03-01",
  ]);

  /* Nenhum POST (server action) e nenhuma leitura da página enquanto se digita. */
  const chamadas: string[] = [];
  page.on("request", (requisicao) => {
    if (requisicao.method() === "POST" || requisicao.url().endsWith(`/${MARCO}/simular`)) {
      chamadas.push(`${requisicao.method()} ${requisicao.url()}`);
    }
  });

  await simular(page, "1.000,00", "2");

  await expect(resposta(page).getByText("Cabe. Nenhum mês fica no vermelho.")).toBeVisible();
  await expect(resposta(page).getByRole("listitem")).toHaveCount(2);
  const marco = linha(page, "Março de 2026");
  await expect(marco).toContainText("Parcela R$ 500,00");
  await expect(valorDe(marco, "Antes")).toHaveText("Vai sobrar R$ 700,00");
  await expect(valorDe(marco, "Depois")).toHaveText("Vai sobrar R$ 200,00");
  await expect(valorDe(linha(page, "Abril de 2026"), "Depois")).toHaveText("Vai sobrar R$ 200,00");
  expect(chamadas).toEqual([]);
});

test("R$ 1.000,00 em 3x alcança maio, que já faltava: cabe, e a linha diz que já estava no vermelho (SIM-02, AC 6)", async ({
  page,
}) => {
  await page.goto(`/${MARCO}/simular`);
  await simular(page, "1.000,00", "3");

  await expect(
    resposta(page).getByText("Cabe. Maio já estava no vermelho antes desta compra."),
  ).toBeVisible();
  const maio = linha(page, "Maio de 2026");
  await expect(maio).toContainText("já estava no vermelho");
  await expect(valorDe(maio, "Antes")).toHaveText("Vai faltar R$ 500,00");
  await expect(valorDe(maio, "Depois")).toHaveText("Vai faltar R$ 833,33");
  await expect(linha(page, "Março de 2026")).not.toContainText("já estava no vermelho");
});

test("R$ 3.000,00 em 3x não cabe: março e abril no vermelho, e em 5x cabe (SIM-02, AC 7)", async ({
  page,
}) => {
  await page.goto(`/${MARCO}/simular`);
  await simular(page, "3.000,00", "3");

  await expect(
    resposta(page).getByText("Em 3x não cabe: março e abril ficam no vermelho. Em 5x cabe."),
  ).toBeVisible();
  await expect(valorDe(linha(page, "Março de 2026"), "Depois")).toHaveText("Vai faltar R$ 300,00");
});

test("24x passa do horizonte: 13 linhas e a tela diz até onde enxerga (SIM-02, AC 9)", async ({
  page,
}) => {
  await page.goto(`/${MARCO}/simular`);
  await simular(page, "2.400,00", "24");

  await expect(resposta(page).getByRole("listitem")).toHaveCount(13);
  await expect(resposta(page).getByText("Enxergo até Março de 2027.")).toBeVisible();
  await expect(linha(page, "Março de 2027")).toContainText("Parcela R$ 100,00");
});

test("o antes de abril é o card Saldo previsto de abril (SIM-02, AC 4)", async ({ page }) => {
  await page.goto(`/${MARCO}/simular`);
  await simular(page, "1.000,00", "3");
  const antesDeAbril = await valorDe(linha(page, "Abril de 2026"), "Antes").textContent();
  const antesDeMaio = await valorDe(linha(page, "Maio de 2026"), "Antes").textContent();
  expect(antesDeAbril).toBe("Vai sobrar R$ 700,00");
  expect(antesDeMaio).toBe("Vai faltar R$ 500,00");

  await page.goto("/2026-04");
  await expect(cardSaldoPrevisto(page)).toHaveText("R$ 700,00");
  await page.goto("/2026-05");
  await expect(cardSaldoPrevisto(page)).toHaveText("-R$ 500,00");
});

test("em 400 × 800 os quatro campos e o veredito ficam na área visível, sem rolar; em 1024 a moldura é a estreita (SIM-02, ACs 12 e 13)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 400, height: 800 });
  await page.goto(`/${MARCO}/simular`);
  await simular(page, "1.000,00", "2");
  await expect(resposta(page).getByText("Cabe. Nenhum mês fica no vermelho.")).toBeVisible();

  const alvos = [
    simulacao(page).getByRole("radio", { name: "Valor total" }),
    simulacao(page).getByLabel("Valor total (R$)"),
    simulacao(page).getByLabel("Quantidade de parcelas"),
    simulacao(page).getByLabel("Mês da primeira parcela"),
    resposta(page).getByText("Cabe. Nenhum mês fica no vermelho."),
  ];
  for (const alvo of alvos) {
    const caixa = await alvo.boundingBox();
    expect(caixa).not.toBeNull();
    expect((caixa?.y ?? 0) + (caixa?.height ?? 0)).toBeLessThanOrEqual(800);
    expect(caixa?.y ?? -1).toBeGreaterThanOrEqual(0);
  }
  const transborda = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(transborda).toBe(false);

  await page.setViewportSize({ width: 1024, height: 800 });
  const largura = await page
    .getByRole("heading", { name: "Dá pra comprar?", level: 1 })
    .evaluate((h1) => (h1.closest(".max-w-conteudo") as HTMLElement | null)?.className ?? "");
  expect(largura).toContain("max-w-conteudo");
});

test("Lançar esta compra grava pelo cadastro e o Saldo previsto de abril vira o depois simulado (SIM-04, ACs 4, 5 e 6)", async ({
  page,
}) => {
  await page.goto(`/${MARCO}/simular`);
  await simular(page, "1.000,00", "3");
  await expect(valorDe(linha(page, "Abril de 2026"), "Depois")).toHaveText("Vai sobrar R$ 366,67");
  await expect(page.getByRole("form", { name: "Nova compra" })).toHaveCount(0);

  await page.getByRole("button", { name: "Lançar esta compra" }).click();
  const form = page.getByRole("form", { name: "Nova compra" });
  await expect(form.getByLabel("Valor total (R$)")).toHaveValue("1.000,00");
  await expect(form.getByLabel("Quantidade de parcelas")).toHaveValue("3");
  await form.getByLabel("Descrição", { exact: true }).fill("Compra A");
  await form.getByRole("button", { name: "Cadastrar compra" }).click();
  await expect(form.getByRole("status")).toContainText("Compra A gravada em 3 parcelas.");

  /* O horizonte foi relido: o "antes" de cada mês passou a ser o "depois"
     da compra gravada (AC 5). */
  await expect(valorDe(linha(page, "Março de 2026"), "Antes")).toHaveText("Vai sobrar R$ 366,66");
  await expect(valorDe(linha(page, "Abril de 2026"), "Antes")).toHaveText("Vai sobrar R$ 366,67");

  await page.goto("/2026-04");
  await expect(cardSaldoPrevisto(page)).toHaveText("R$ 366,67");
  await page.goto(`/${MARCO}`);
  await expect(cardSaldoPrevisto(page)).toHaveText("R$ 366,66");
});

/**
 * A barra inferior com cinco itens (SIM-03, ACs 3, 4 e 5). Medida em cada
 * faixa em que a grade muda (L-055): 360 e 400 px no celular, 1024 no
 * computador.
 */
for (const largura of [360, 400]) {
  test(`em ${largura} px, os cinco itens da barra cabem numa linha cada, com 44 px de alvo e sem rolagem (SIM-03, ACs 3 e 4)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: largura, height: 740 });
    await page.goto(`/${MARCO}/simular`);
    const nav = page.getByRole("navigation", { name: "Áreas do myBilling" });
    await expect(nav.getByRole("link")).toHaveText([
      "Visão geral",
      "Lançamentos",
      "Todo mês",
      "Cadastros",
      "Simular",
    ]);
    await expect(nav.getByRole("link", { name: "Simular" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    const itens = await nav.getByRole("link").evaluateAll((links) =>
      links.map((link) => {
        const { left, right, height } = link.getBoundingClientRect();
        const rotulo = [...link.childNodes].find((no) => no.nodeType === Node.TEXT_NODE);
        const alcance = document.createRange();
        alcance.selectNodeContents(rotulo as Node);
        return {
          left,
          right,
          altura: height,
          transborda: link.scrollWidth > link.clientWidth,
          linhasDoRotulo: alcance.getClientRects().length,
        };
      }),
    );
    for (const item of itens) {
      expect(item.left).toBeGreaterThanOrEqual(0);
      expect(item.right).toBeLessThanOrEqual(largura);
      expect(item.transborda).toBe(false);
      expect(item.linhasDoRotulo).toBe(1);
      expect(item.altura).toBeGreaterThanOrEqual(44);
    }
    expect(new Set(itens.map((item) => item.altura)).size).toBe(1);

    const transborda = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(transborda).toBe(false);
  });
}

test("em 1024 px a navegação mantém os 15 px e a coluna lateral (SIM-03, AC 5)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto(`/${MARCO}/simular`);
  const nav = page.getByRole("navigation", { name: "Áreas do myBilling" });

  const medidas = await nav.getByRole("link").evaluateAll((links) =>
    links.map((link) => ({
      fonte: getComputedStyle(link).fontSize,
      topo: link.getBoundingClientRect().top,
    })),
  );
  expect(medidas.map((m) => m.fonte)).toEqual(Array<string>(5).fill("15px"));
  /* Coluna: cada item abaixo do anterior. */
  for (let i = 1; i < medidas.length; i += 1) {
    expect(medidas[i]?.topo ?? 0).toBeGreaterThan(medidas[i - 1]?.topo ?? 0);
  }
});

/**
 * A resposta dentro do cadastro de compra (SIM-05, AC 5): a Visão geral e
 * Lançamentos entregam ao formulário o mesmo horizonte que o simulador lê. O
 * bloco fica preso ao formulário "Nova compra" (L-018), e o "antes" de abril
 * é a linha de abril em "Próximos meses" da mesma página (L-014).
 *
 * Estes testes rodam depois de "Lançar esta compra", que gravou Compra A, e
 * por isso leem o saldo de abril da própria página em vez de fixá-lo.
 */
function centavosDe(texto: string): number {
  return Number.parseInt(texto.replace(/\D/g, ""), 10);
}

function reais(centavos: number): string {
  const inteiro = Math.floor(centavos / 100);
  const resto = String(centavos % 100).padStart(2, "0");
  return `R$ ${inteiro.toLocaleString("pt-BR")},${resto}`;
}

test("na Visão geral, a aba Parcelado responde abaixo da prévia e a aba Avulso não (SIM-05, AC 5)", async ({
  page,
}) => {
  await page.goto(`/${MARCO}`);
  const cadastro = page.getByRole("region", { name: "Novo lançamento" });
  await cadastro.getByRole("tab", { name: "Parcelado" }).click();
  const form = cadastro.getByRole("form", { name: "Nova compra" });
  await form.getByLabel("Valor total (R$)").fill("200,00");
  await form.getByLabel("Quantidade de parcelas").fill("3");

  const bloco = form.getByRole("region", { name: "Resposta da simulação" });
  await expect(
    bloco.getByText("Cabe. Maio já estava no vermelho antes desta compra."),
  ).toBeVisible();
  await expect(bloco.getByRole("listitem")).toHaveCount(3);

  const abrilNoBloco = bloco.getByRole("listitem").filter({ hasText: "Abril de 2026" });
  const abrilEmProximos = page
    .getByRole("region", { name: "Próximos meses" })
    .getByRole("listitem")
    .filter({ hasText: "Abril de 2026" });
  const sobraDeAbril = (await valorDe(abrilEmProximos, "Vai sobrar").textContent()) ?? "";
  expect(sobraDeAbril).toMatch(/^R\$ /);
  await expect(valorDe(abrilNoBloco, "Antes")).toHaveText(`Vai sobrar ${sobraDeAbril}`);
  await expect(valorDe(abrilNoBloco, "Depois")).toHaveText(
    `Vai sobrar ${reais(centavosDe(sobraDeAbril) - 6667)}`,
  );

  await cadastro.getByRole("tab", { name: "Avulso" }).click();
  await expect(page.getByRole("region", { name: "Resposta da simulação" })).toHaveCount(0);
});

test("em Lançamentos, o diálogo de cadastro também responde (SIM-05, AC 5)", async ({ page }) => {
  await page.goto(`/${MARCO}/lancamentos`);
  await page.getByRole("button", { name: "+ Novo lançamento" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByRole("tab", { name: "Parcelado" }).click();
  const form = dialogo.getByRole("form", { name: "Nova compra" });
  await form.getByLabel("Valor total (R$)").fill("200,00");
  await form.getByLabel("Quantidade de parcelas").fill("2");

  const bloco = form.getByRole("region", { name: "Resposta da simulação" });
  await expect(bloco.getByText("Cabe. Nenhum mês fica no vermelho.")).toBeVisible();
  await expect(bloco.getByRole("listitem")).toHaveCount(2);
});
