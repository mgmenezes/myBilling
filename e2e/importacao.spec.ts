import { join } from "node:path";
import { expect, type Locator, type Page, test } from "@playwright/test";
import type { Pool } from "pg";
import {
  criarPoolDeTeste,
  limparDados,
  recriarBancoDeTeste,
  semearCadastroBase,
} from "@/infrastructure/db/testing/banco-de-teste";

/**
 * **A planilha entra pela Visão geral, aba por aba.**
 *
 * Os testes de componente provam cada passo com as actions dubladas, e os de
 * integração provam as actions contra o Postgres. Este arquivo prova o que só
 * existe com os dois juntos: o arquivo lido no navegador, a prévia pedida ao
 * servidor de verdade, a decisão lembrada de uma aba para a outra, e o painel
 * e a área "Todo mês" mostrando o que foi gravado.
 *
 * O cadastro base tem Pessoa A, Cartão Roxo, Conta Corrente e Categoria Um. O
 * Cartão Verde, que outubro usa, entra por SQL antes do teste; o Cartão Azul,
 * que aparece em novembro, é cadastrado no próprio passo 2, que é como a
 * pessoa o faria.
 *
 * As fixtures são as sintéticas do domínio (AD-009).
 */

const EMAIL_PERMITIDO = "pessoa-a@example.com";
const FIXTURES = join(__dirname, "../src/domain/importacao/__fixtures__");

type Mes = "Outubro" | "Novembro" | "Dezembro";

let pool: Pool;

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
  await semearCadastroBase(pool);
  await pool.query(
    `INSERT INTO meio_pagamento (nome, tipo, gera_fatura, dia_fechamento, dia_vencimento)
     VALUES ('Cartão Verde', 'CARTAO_CREDITO', true, 25, 5)`,
  );
  await entrar(page, EMAIL_PERMITIDO);
});

async function entrar(page: Page, email: string): Promise<void> {
  const csrf = await page.request.get("/api/auth/csrf");
  const { csrfToken } = (await csrf.json()) as { csrfToken: string };
  await page.request.post("/api/auth/callback/provedor-de-teste", {
    form: { csrfToken, email, callbackUrl: "/" },
  });
}

function dialogo(page: Page): Locator {
  return page.getByRole("dialog", { name: "Importar planilha" });
}

async function abrirImportacao(page: Page): Promise<Locator> {
  await page.getByRole("button", { name: "Importar planilha" }).click();
  await expect(dialogo(page)).toBeVisible();
  return dialogo(page);
}

/** Passo 1: escolhe a fixture pelo seletor de arquivo e confere o que ele leu. */
async function escolherArquivo(dialogoAberto: Locator, mes: Mes): Promise<void> {
  await dialogoAberto
    .getByLabel("Arquivo .csv da aba")
    .setInputFiles(join(FIXTURES, `Planilha 2026 - ${mes}.csv`));
  await expect(dialogoAberto.getByText(`Planilha 2026 - ${mes}.csv`)).toBeVisible();
  await expect(dialogoAberto.getByText("4 blocos encontrados")).toBeVisible();
}

async function decidirEntrada(
  dialogoAberto: Locator,
  nome: string,
  classe: "Fixa" | "Avulsa",
): Promise<void> {
  const grupo = dialogoAberto.getByRole("group", { name: nome });
  await grupo.getByRole("radio", { name: new RegExp(`^${classe}`) }).check();
  await grupo.getByLabel("Cai em").selectOption({ label: "Conta Corrente" });
}

/** O valor de um indicador do painel, em centavos. */
async function indicador(page: Page, rotulo: string): Promise<number> {
  const texto = (await page.getByRole("link", { name: new RegExp(rotulo) }).textContent()) ?? "";
  const encontrado = texto.match(/R\$\s*([\d.]+),(\d{2})/);
  if (!encontrado) {
    throw new Error(`indicador "${rotulo}" sem valor legível em: ${texto}`);
  }
  return Number(encontrado[1]?.replaceAll(".", "")) * 100 + Number(encontrado[2]);
}

/**
 * Outubro pela interface, num banco que só tem o cadastro: três "Tipo", três
 * entradas, a divergência do Gastos do Mês confirmada. Termina no resultado.
 */
async function importarOutubro(page: Page): Promise<Locator> {
  await page.goto("/2026-10");
  const aberto = await abrirImportacao(page);

  await escolherArquivo(aberto, "Outubro");
  /* O nome do arquivo pré-seleciona outubro de 2026 (IMP-02, Independent Test). */
  await expect(aberto.getByLabel("Mês")).toHaveValue("10");
  await expect(aberto.getByLabel("Ano")).toHaveValue("2026");
  await expect(aberto.getByText("Outubro de 2026", { exact: true })).toBeVisible();
  await expect(aberto.getByText("Tudo entra em nome de Pessoa A")).toBeVisible();
  await aberto.getByRole("button", { name: "Continuar" }).click();

  await aberto.getByLabel("Débito (4 linhas)").selectOption({ label: "Conta Corrente" });
  await aberto.getByLabel("Cartão Roxo (8 linhas)").selectOption({ label: "Cartão Roxo" });
  await aberto.getByLabel("Cartão Verde (1 linha)").selectOption({ label: "Cartão Verde" });
  /* "Cai em" só oferece meio sem fatura, com os meios que a página monta (IMP-04, AC 3). */
  const caiEm = aberto.getByRole("group", { name: "Salário A" }).getByLabel("Cai em");
  await expect(caiEm.locator("option", { hasText: "Conta Corrente" })).toHaveCount(1);
  await expect(caiEm.locator("option", { hasText: "Cartão Roxo" })).toHaveCount(0);
  await decidirEntrada(aberto, "Salário A", "Fixa");
  await decidirEntrada(aberto, "Salário B", "Fixa");
  await decidirEntrada(aberto, "Reembolso", "Avulsa");
  await aberto.getByRole("button", { name: "Continuar" }).click();

  await expect(aberto.getByText("Conferência de Outubro de 2026")).toBeVisible();
  await expect(aberto.locator("summary").filter({ hasText: "Gastos do Mês" })).toContainText(
    "Diverge em R$ 12,00",
  );
  const importar = aberto.getByRole("button", { name: "Importar 16 lançamentos" });
  await expect(importar).toBeDisabled();
  await aberto.getByRole("checkbox", { name: "Entendi a diferença, importar mesmo assim" }).check();
  await importar.click();

  await expect(aberto.getByText("16 criados")).toBeVisible();
  return aberto;
}

test("importa outubro e novembro pela Visão geral, e o mês mostra o que entrou (IMP-08, IMP-04, IMP-07)", async ({
  page,
}) => {
  test.setTimeout(180_000);

  const aberto = await importarOutubro(page);
  await expect(aberto.getByText("Próximo: Novembro de 2026")).toBeVisible();
  await aberto.getByRole("link", { name: "Abrir Outubro de 2026" }).click();
  await expect(dialogo(page)).toBeHidden();

  /* IMP-08, Independent Test: o painel de outubro com as entradas e as despesas da fixture. */
  await page.goto("/2026-10");
  expect(await indicador(page, "Receitas do mês")).toBe(1_015_000);
  /* Só o que cai em outubro: as quatro ocorrências de fixo (R$ 1.840,00), uma parcela de
     cada compra (R$ 423,34) e os três gastos do mês (R$ 124,50), como no design.md. */
  expect(await indicador(page, "Despesas do mês")).toBe(238_784);

  /* Novembro: só o que aparece pela primeira vez é perguntado (IMP-04, AC 5). */
  const novembro = await abrirImportacao(page);
  await expect(novembro.getByText("Próximo mês esperado: Novembro de 2026")).toBeVisible();
  await escolherArquivo(novembro, "Novembro");
  await novembro.getByRole("button", { name: "Continuar" }).click();

  await expect(novembro.getByLabel("Cartão Azul (1 linha)")).toBeVisible();
  await expect(novembro.getByLabel(/\(\d+ linhas?\)$/)).toHaveCount(1);
  await expect(novembro.getByRole("group", { name: "Presente" })).toBeVisible();
  await expect(novembro.getByLabel("Cai em")).toHaveCount(1);

  /* O meio que falta é cadastrado ali mesmo, com o nome do "Tipo" (IMP-04, AC 2). */
  await novembro.getByRole("button", { name: "+ cadastrar" }).click();
  await expect(novembro.getByLabel("Nome do novo meio de pagamento")).toHaveValue("Cartão Azul");
  await novembro.getByLabel("Dia de fechamento").fill("25");
  await novembro.getByLabel("Dia de vencimento").fill("5");
  await novembro.getByRole("button", { name: "Criar" }).click();
  await expect(novembro.getByLabel("Cartão Azul (1 linha)").locator("option:checked")).toHaveText(
    "Cartão Azul",
  );
  await decidirEntrada(novembro, "Presente", "Avulsa");
  await novembro.getByRole("button", { name: "Continuar" }).click();

  /* Sem divergência, sem confirmação. */
  await expect(novembro.getByText("Conferência de Novembro de 2026")).toBeVisible();
  await expect(novembro.getByRole("checkbox")).toHaveCount(0);
  await novembro.getByRole("button", { name: "Importar 9 lançamentos" }).click();
  await expect(novembro.getByText("5 criados")).toBeVisible();
  await expect(novembro.getByText("4 alterados")).toBeVisible();
  await expect(novembro.getByText("1 encerrado")).toBeVisible();

  /* IMP-07: o fixo reajustado com o valor de novembro, e o que sumiu, encerrado. */
  await page.goto("/2026-11/fixos");
  const internet = page.getByRole("listitem").filter({ hasText: "Internet" });
  await expect(internet).toHaveCount(1);
  await expect(internet).toContainText("R$ 110,00");
  const academia = page.getByRole("listitem").filter({ hasText: "Academia" });
  await expect(academia).toHaveCount(1);
  await expect(academia).toContainText("Conta Corrente");
  await expect(academia).not.toContainText("Cartão Roxo");
});

test("depois de outubro, dezembro é recusado nomeando Novembro de 2026 (IMP-02, Independent Test)", async ({
  page,
}) => {
  test.setTimeout(120_000);

  const aberto = await importarOutubro(page);
  await aberto.getByRole("button", { name: "Importar a próxima aba" }).click();
  await expect(aberto.getByText("Próximo mês esperado: Novembro de 2026")).toBeVisible();

  await escolherArquivo(aberto, "Dezembro");
  await aberto.getByRole("button", { name: "Continuar" }).click();

  await expect(aberto.getByRole("alert")).toHaveText(
    "As abas entram em sequência. A próxima é Novembro de 2026.",
  );
  await expect(aberto.getByText("Conferência de Dezembro de 2026")).toHaveCount(0);
  const { rows } = await pool.query<{ competencia: string }>(
    "SELECT to_char(competencia, 'YYYY-MM') AS competencia FROM importacao ORDER BY 1",
  );
  expect(rows.map((linha) => linha.competencia)).toEqual(["2026-10"]);
});
