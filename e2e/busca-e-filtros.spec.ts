import { expect, type Locator, type Page, test } from "@playwright/test";
import type { Pool } from "pg";
import {
  criarPoolDeTeste,
  limparDados,
  recriarBancoDeTeste,
  semearCadastroBase,
} from "@/infrastructure/db/testing/banco-de-teste";

/**
 * **Busca e filtros passam a ter percurso.**
 *
 * O Independent Test que `painel-e-lancamentos/spec.md` escreveu e que nunca
 * foi implementado: buscar parte de uma descrição, ver só ela, ver o indicador
 * de filtro ativo, e ver o total refletir só o resultado (REDE-01, ACs 5 e 6).
 * Aqui também o clique no indicador do painel, que é a única camada capaz de
 * provar que ele abre a lista já filtrada (REDE-02, AC 3).
 *
 * Toda busca de interface é escopada ao painel `<search>`: o diálogo de
 * cadastro fica montado na mesma árvore, com as duas abas, então "Categoria" e
 * "Meio de pagamento" existem mais de uma vez na página (AD-014).
 *
 * Nenhum valor ou descrição vem de dado real da família (AD-009).
 */

const EMAIL_PERMITIDO = "pessoa-a@example.com";
const MARCO = "2026-03";

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
  /* A base traz uma pessoa e uma categoria. Filtrar por dimensão com uma
     opção só devolveria a lista inteira e passaria sem provar nada. */
  await pool.query("INSERT INTO usuario (nome, email) VALUES ($1, $2)", [
    "Pessoa B",
    "pessoa-b@example.com",
  ]);
  await pool.query("INSERT INTO categoria (nome) VALUES ($1)", ["Categoria Dois"]);
  await entrar(page, EMAIL_PERMITIDO);
});

async function entrar(page: Page, email: string): Promise<void> {
  const csrf = await page.request.get("/api/auth/csrf");
  const { csrfToken } = (await csrf.json()) as { csrfToken: string };
  await page.request.post("/api/auth/callback/provedor-de-teste", {
    form: { csrfToken, email, callbackUrl: "/" },
  });
}

/** O painel de busca e filtros. Escopo obrigatório: ver o cabeçalho. */
function filtros(page: Page): Locator {
  return page.locator("search");
}

async function abrirAvulso(page: Page): Promise<Locator> {
  const dialogo = page.getByRole("dialog");
  if (!(await dialogo.isVisible())) {
    await page.getByRole("button", { name: "+ Novo lançamento" }).click();
  }
  await dialogo.getByRole("tab", { name: "Avulso" }).click();
  return dialogo.getByRole("form", { name: "Lançamento avulso" });
}

interface Avulso {
  readonly descricao: string;
  readonly valor: string;
  readonly natureza?: "entra" | "sai";
  readonly meio?: string;
  readonly categoria?: string;
  readonly pessoa?: string;
}

async function cadastrarAvulso(page: Page, dados: Avulso): Promise<void> {
  const form = await abrirAvulso(page);
  if (dados.natureza === "entra") {
    await form.getByRole("radio", { name: "Um dinheiro que entra" }).check();
  }
  await form.getByLabel("Descrição").fill(dados.descricao);
  await form.getByLabel("Valor (R$)").fill(dados.valor);
  if (dados.meio !== undefined) {
    const rotulo = dados.natureza === "entra" ? "Onde o dinheiro cai" : "Meio de pagamento";
    await form.getByLabel(rotulo).selectOption({ label: dados.meio });
  }
  if (dados.categoria !== undefined) {
    await form.getByLabel("Categoria", { exact: true }).selectOption({ label: dados.categoria });
  }
  if (dados.pessoa !== undefined) {
    await form.getByLabel("De quem é o lançamento").selectOption({ label: dados.pessoa });
  }
  await form.getByRole("button", { name: "Cadastrar lançamento" }).click();
  await expect(page.getByRole("status")).toContainText(dados.descricao);
}

/**
 * Os três gastos do mês. Valores separados de propósito: qualquer soma
 * parcial é distinta de qualquer outra, então um total certo por acaso não
 * existe.
 */
async function semearTresGastos(page: Page): Promise<void> {
  await page.goto(`/${MARCO}/lancamentos`);
  await cadastrarAvulso(page, {
    descricao: "Mercado da semana",
    valor: "10,00",
    meio: "Conta Corrente",
    categoria: "Categoria Um",
    pessoa: "Pessoa A",
  });
  await cadastrarAvulso(page, {
    descricao: "Farmácia",
    valor: "20,00",
    meio: "Cartão Roxo",
    categoria: "Categoria Dois",
    pessoa: "Pessoa A",
  });
  await cadastrarAvulso(page, {
    descricao: "Academia",
    valor: "30,00",
    meio: "Conta Corrente",
    categoria: "Categoria Um",
    pessoa: "Pessoa B",
  });
  await page.keyboard.press("Escape");
}

function linha(page: Page, descricao: string): Locator {
  return page.getByRole("row", { name: new RegExp(descricao) });
}

test("buscar parte de uma descrição deixa só ela na lista (REDE-01, AC 5)", async ({ page }) => {
  await semearTresGastos(page);

  await filtros(page).getByLabel("Buscar por descrição").fill("farm");
  await expect(page).toHaveURL(/busca=farm/);

  await expect(linha(page, "Farmácia")).toBeVisible();
  await expect(linha(page, "Mercado da semana")).toHaveCount(0);
  await expect(linha(page, "Academia")).toHaveCount(0);
});

test("o total exibido é o da linha que restou, e não o do mês (REDE-01, AC 6)", async ({
  page,
}) => {
  await semearTresGastos(page);

  /* Sem filtro: os três, somando 60,00. */
  await expect(filtros(page).getByText(/3 lançamentos\. Total/)).toContainText("R$ 60,00");

  await filtros(page).getByLabel("Buscar por descrição").fill("farm");
  await expect(page).toHaveURL(/busca=farm/);

  const resumo = filtros(page).getByText(/lançamento/);
  await expect(resumo).toContainText("1 lançamento com 1 filtro");
  await expect(resumo).toContainText("R$ 20,00");
  await expect(resumo).not.toContainText("R$ 60,00");
});

test("a busca ignora acento e caixa pela tela", async ({ page }) => {
  await semearTresGastos(page);

  await filtros(page).getByLabel("Buscar por descrição").fill("FARMACIA");
  await expect(page).toHaveURL(/busca=FARMACIA/);

  await expect(linha(page, "Farmácia")).toBeVisible();
  await expect(linha(page, "Academia")).toHaveCount(0);
});

test("filtrar por categoria, meio e pessoa funciona pela tela (REDE-01, AC 2)", async ({
  page,
}) => {
  await semearTresGastos(page);

  await filtros(page).getByLabel("Categoria").selectOption({ label: "Categoria Dois" });
  await expect(page).toHaveURL(/categoriaId=/);
  await expect(linha(page, "Farmácia")).toBeVisible();
  await expect(linha(page, "Mercado da semana")).toHaveCount(0);
  await expect(linha(page, "Academia")).toHaveCount(0);

  await page.goto(`/${MARCO}/lancamentos`);
  await filtros(page).getByLabel("Meio de pagamento").selectOption({ label: "Cartão Roxo" });
  await expect(page).toHaveURL(/meioPagamentoId=/);
  await expect(linha(page, "Farmácia")).toBeVisible();
  await expect(linha(page, "Academia")).toHaveCount(0);

  await page.goto(`/${MARCO}/lancamentos`);
  await filtros(page).getByLabel("Pessoa").selectOption({ label: "Pessoa B" });
  await expect(page).toHaveURL(/usuarioId=/);
  await expect(linha(page, "Academia")).toBeVisible();
  await expect(linha(page, "Farmácia")).toHaveCount(0);
  await expect(linha(page, "Mercado da semana")).toHaveCount(0);
});

test("recarregar com o filtro na URL preserva o filtro", async ({ page }) => {
  await semearTresGastos(page);

  await page.goto(`/${MARCO}/lancamentos?busca=academia`);
  await expect(linha(page, "Academia")).toBeVisible();
  await expect(linha(page, "Farmácia")).toHaveCount(0);

  await page.reload();

  /* O campo volta preenchido, e a lista continua recortada. */
  await expect(filtros(page).getByLabel("Buscar por descrição")).toHaveValue("academia");
  await expect(linha(page, "Academia")).toBeVisible();
  await expect(linha(page, "Farmácia")).toHaveCount(0);
  await expect(filtros(page).getByText(/lançamento/)).toContainText("R$ 30,00");
});

test("clicar num indicador do painel abre a lista já filtrada (REDE-02, AC 3)", async ({
  page,
}) => {
  await semearTresGastos(page);
  await page.goto(`/${MARCO}/lancamentos`);
  await cadastrarAvulso(page, {
    descricao: "Reembolso",
    valor: "70,00",
    natureza: "entra",
    meio: "Conta Corrente",
    pessoa: "Pessoa A",
  });
  await page.keyboard.press("Escape");

  await page.goto(`/${MARCO}`);
  await page.getByRole("link", { name: /Despesas do mês/ }).click();

  await expect(page).toHaveURL(new RegExp(`/${MARCO}/lancamentos\\?natureza=DESPESA$`));
  /* O total da lista é o número que estava no indicador, e a receita ficou de
     fora: é a divergência que REDE-02 existe para impedir. */
  await expect(filtros(page).getByText(/lançamentos com 1 filtro/)).toContainText("R$ 60,00");
  await expect(linha(page, "Reembolso")).toHaveCount(0);
  await expect(linha(page, "Farmácia")).toBeVisible();
});
