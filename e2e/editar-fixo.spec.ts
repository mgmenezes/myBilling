import { expect, type Locator, type Page, test } from "@playwright/test";
import type { Pool } from "pg";
import {
  criarPoolDeTeste,
  limparDados,
  recriarBancoDeTeste,
  semearCadastroBase,
} from "@/infrastructure/db/testing/banco-de-teste";

/**
 * **Editar um fixo pelo formulário do cadastro, de ponta a ponta** (EDF-01 a
 * EDF-04).
 *
 * Cada percurso abre os meses antes de editar, para que as ocorrências já
 * existam: é a edição que precisa alcançá-las, e não a materialização que as
 * criaria depois com o valor novo. As provas são feitas na lista de
 * lançamentos de cada mês, que é onde a correção precisa aparecer.
 *
 * Nenhum valor ou descrição vem de dado real da família (AD-009).
 */

const EMAIL_PERMITIDO = "pessoa-a@example.com";

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
  await entrar(page, EMAIL_PERMITIDO);
});

async function entrar(page: Page, email: string): Promise<void> {
  const csrf = await page.request.get("/api/auth/csrf");
  const { csrfToken } = (await csrf.json()) as { csrfToken: string };
  await page.request.post("/api/auth/callback/provedor-de-teste", {
    form: { csrfToken, email, callbackUrl: "/" },
  });
}

/** Cadastra um gasto fixo pela interface, a partir de "Todo mês" do mês de início. */
async function cadastrarFixo(
  page: Page,
  dados: { descricao: string; valor: string; inicio: string },
): Promise<void> {
  await page.goto(`/${dados.inicio}/fixos`);
  await page.getByRole("button", { name: "+ Novo fixo" }).click();
  const form = page.getByRole("dialog").getByRole("form", { name: "Gasto fixo ou entrada" });
  await form.getByLabel("Descrição").fill(dados.descricao);
  await form.getByLabel(/De quanto costuma ser/).fill(dados.valor);
  await form.getByLabel("Categoria").selectOption({ label: "Categoria Um" });
  await form.getByRole("button", { name: "Cadastrar gasto fixo" }).click();
  await expect(form.getByRole("status")).toContainText(dados.descricao);
  await page.keyboard.press("Escape");
}

/** Abre os meses, para que as ocorrências existam antes da edição. */
async function abrirMeses(page: Page, competencias: ReadonlyArray<string>): Promise<void> {
  for (const competencia of competencias) {
    await page.goto(`/${competencia}/lancamentos`);
    await expect(page.getByRole("region", { name: "Fixos" })).toBeVisible();
  }
}

/** Abre a edição de um fixo no "Todo mês" do mês dado e devolve o formulário. */
async function abrirEdicao(page: Page, competencia: string, descricao: string): Promise<Locator> {
  await page.goto(`/${competencia}/fixos`);
  await page
    .getByRole("listitem")
    .filter({ hasText: descricao })
    .getByRole("button", { name: "Editar" })
    .click();
  return page
    .getByRole("dialog", { name: "Editar gasto fixo" })
    .getByRole("form", { name: "Gasto fixo ou entrada" });
}

/** Salva a edição e espera a confirmação dentro do diálogo, que continua aberto. */
async function salvar(form: Locator): Promise<void> {
  await form.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(form.getByRole("status")).toHaveText("Alterações salvas.");
}

/** A linha de um gasto fixo na lista de lançamentos de um mês. */
async function linhaNaLista(page: Page, competencia: string, descricao: string): Promise<Locator> {
  await page.goto(`/${competencia}/lancamentos`);
  return page
    .getByRole("region", { name: "Fixos" })
    .getByRole("row", { name: new RegExp(descricao) });
}

test("trocar categoria e descrição em novembro corrige também outubro, que continua pago (EDF-02)", async ({
  page,
}) => {
  await pool.query("INSERT INTO categoria (nome) VALUES ($1)", ["Categoria Dois"]);
  await cadastrarFixo(page, { descricao: "Conta de luz", valor: "100,00", inicio: "2026-10" });
  /* Um segundo fixo, que fica entre o nome antigo e o novo na ordem da lista:
     renomear muda a posição do cartão enquanto o diálogo está aberto. */
  await cadastrarFixo(page, { descricao: "Internet", valor: "80,00", inicio: "2026-10" });
  await abrirMeses(page, ["2026-10", "2026-11"]);
  const outubro = await linhaNaLista(page, "2026-10", "Conta de luz");
  /* O selo de pagamento é o botão com `aria-pressed`, e o nome dele muda com o
     estado e com a descrição. */
  await outubro.locator("button[aria-pressed]").click();
  await expect(outubro.locator("button[aria-pressed]")).toHaveAttribute("aria-pressed", "true");

  const form = await abrirEdicao(page, "2026-11", "Conta de luz");
  /* Abre com o que está gravado (EDF-01 AC 3). */
  await expect(form.getByLabel("Descrição")).toHaveValue("Conta de luz");
  await expect(form.getByLabel(/De quanto costuma ser/)).toHaveValue("100,00");
  await expect(form.getByLabel("Começa em")).toHaveValue("2026-10");
  await expect(form.getByLabel("Começa em")).toBeDisabled();
  await form.getByLabel("Descrição").fill("Tarifa de energia");
  await form.getByLabel("Categoria").selectOption({ label: "Categoria Dois" });
  await salvar(form);

  /* O diálogo continua modal depois de o cartão mudar de lugar: `Escape` só
     fecha um `<dialog>` aberto como modal. */
  await expect(page.locator("li", { hasText: "Tarifa de energia" })).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  for (const competencia of ["2026-10", "2026-11"]) {
    const linha = await linhaNaLista(page, competencia, "Tarifa de energia");
    /* A categoria da linha é um seletor, que traz todas como opção: o texto da
       linha contém as duas. O que prova a correção é a opção escolhida. */
    const escolhida = linha
      .getByRole("combobox", { name: "Categoria de Tarifa de energia" })
      .locator("option:checked");
    await expect(escolhida).toHaveText("Categoria Dois");
    await expect(escolhida).not.toHaveText("Categoria Um");
  }
  const outubroDepois = await linhaNaLista(page, "2026-10", "Tarifa de energia");
  await expect(outubroDepois.locator("button[aria-pressed]")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    page.getByRole("region", { name: "Fixos" }).getByRole("row", { name: /Conta de luz/ }),
  ).toHaveCount(0);
});

test("mudar o valor a partir de novembro mantém outubro com o valor antigo (EDF-03)", async ({
  page,
}) => {
  /* Uma segunda pessoa: sem ela, a pessoa errada no formulário coincide com a certa. */
  await pool.query("INSERT INTO usuario (nome, email) VALUES ($1, $2)", [
    "Pessoa B",
    "pessoa-b@example.com",
  ]);
  await cadastrarFixo(page, { descricao: "Conta de luz", valor: "100,00", inicio: "2026-10" });
  await abrirMeses(page, ["2026-10", "2026-11", "2026-12"]);

  const form = await abrirEdicao(page, "2026-11", "Conta de luz");
  /* Antes de qualquer gravação: o formulário abre com tudo o que está gravado,
     e salvar sem mexer não muda nada (EDF-01 AC 3). Depois de uma gravação, um
     campo aberto errado já teria sido gravado e se compararia consigo mesmo. */
  await form.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(form.getByRole("status")).toHaveText("Nada mudou: já estava tudo assim.");
  await expect(form.getByLabel("Vale a partir de")).toHaveCount(0);
  await form.getByLabel(/De quanto costuma ser/).fill("110,00");
  /* Aparece com o valor diferente, preenchido com o mês que se está vendo. */
  await expect(form.getByLabel("Vale a partir de")).toHaveValue("2026-11");
  await salvar(form);

  await expect(await linhaNaLista(page, "2026-10", "Conta de luz")).toContainText("R$ 100,00");
  await expect(await linhaNaLista(page, "2026-11", "Conta de luz")).toContainText("R$ 110,00");
  await expect(await linhaNaLista(page, "2026-12", "Conta de luz")).toContainText("R$ 110,00");

  /* Em outubro, a edição abre com o valor vigente em outubro, e não com o
     último: salvar sem mexer não reescreve o mês passado (EDF-01 AC 3, EDF-03 AC 3). */
  const outubro = await abrirEdicao(page, "2026-10", "Conta de luz");
  await expect(outubro.getByLabel(/De quanto costuma ser/)).toHaveValue("100,00");
  await outubro.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(outubro.getByRole("status")).toHaveText("Nada mudou: já estava tudo assim.");
  await expect(await linhaNaLista(page, "2026-10", "Conta de luz")).toContainText("R$ 100,00");

  /* No mês da vigência nova, a edição abre com ela, e não com a primeira:
     salvar sem mexer não desfaz o reajuste (EDF-01 AC 3, EDF-03 AC 3). */
  const novembro = await abrirEdicao(page, "2026-11", "Conta de luz");
  await expect(novembro.getByLabel(/De quanto costuma ser/)).toHaveValue("110,00");
  await novembro.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(novembro.getByRole("status")).toHaveText("Nada mudou: já estava tudo assim.");
  await expect(await linhaNaLista(page, "2026-11", "Conta de luz")).toContainText("R$ 110,00");
});

test('encerrar pelo "Termina em" e reabrir apagando o campo (EDF-04)', async ({ page }) => {
  await cadastrarFixo(page, { descricao: "Conta de luz", valor: "100,00", inicio: "2026-10" });
  await abrirMeses(page, ["2026-10", "2026-11", "2026-12"]);

  const encerrando = await abrirEdicao(page, "2026-11", "Conta de luz");
  await encerrando.getByLabel("Termina em (opcional)").fill("2026-11");
  await salvar(encerrando);

  await expect(await linhaNaLista(page, "2026-11", "Conta de luz")).toBeVisible();
  await expect(await linhaNaLista(page, "2026-12", "Conta de luz")).toHaveCount(0);

  /* Encerrado, o cartão de novembro continua com "Editar": é por ele que reabre. */
  const reabrindo = await abrirEdicao(page, "2026-11", "Conta de luz");
  await expect(reabrindo.getByLabel("Termina em (opcional)")).toHaveValue("2026-11");
  await reabrindo.getByLabel("Termina em (opcional)").fill("");
  await salvar(reabrindo);

  await expect(await linhaNaLista(page, "2026-12", "Conta de luz")).toContainText("R$ 100,00");
});
