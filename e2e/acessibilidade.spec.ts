import { expect, type Locator, type Page, test } from "@playwright/test";
import type { Pool } from "pg";
import { criarCompetencia } from "@/domain";
import {
  criarPoolDeTeste,
  limparDados,
  recriarBancoDeTeste,
  semearCadastroBase,
} from "@/infrastructure/db/testing/banco-de-teste";
import { hojeEm } from "@/lib/relogio";

/**
 * **O que só o navegador resolve.**
 *
 * Área de toque é geometria, e geometria não existe em jsdom: uma assertion
 * sobre classe CSS provaria que a classe está escrita, que é exatamente como o
 * critério regrediu sem ninguém ver (TOQUE-01, AC 3). Aqui os dois controles
 * mais tocados do app são **medidos**, pelo retângulo que o navegador
 * realmente desenhou, na largura em que eles ficam encostados.
 *
 * Nenhum valor ou descrição vem de dado real da família (AD-009).
 */

const EMAIL_PERMITIDO = "pessoa-a@example.com";

/** O alvo mínimo, em pixels CSS, em cada dimensão. */
const ALVO_MINIMO = 44;

/** A largura em que os dois controles disputam a mesma linha do cartão. */
const LARGURA_DE_CELULAR = 400;

const CORRENTE = competenciaDeHoje();

function competenciaDeHoje(): string {
  const resultado = criarCompetencia(hojeEm().slice(0, 7));
  if (!resultado.ok) {
    throw new Error("competência corrente inválida");
  }
  return resultado.value;
}

let pool: Pool;

test.describe.configure({ mode: "serial" });

test.use({ viewport: { width: LARGURA_DE_CELULAR, height: 900 } });

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

/**
 * Um gasto avulso no mês corrente: avulso porque só ele oferece o controle de
 * excluir, e no cartão porque em conta corrente o lançamento nasceria pago.
 */
async function cadastrarGastoAvulso(page: Page, descricao: string): Promise<void> {
  await page.goto(`/${CORRENTE}/lancamentos`);
  const dialogo = page.getByRole("dialog");
  if (!(await dialogo.isVisible())) {
    await page.getByRole("button", { name: "+ Novo lançamento" }).click();
  }
  await dialogo.getByRole("tab", { name: "Avulso" }).click();
  /* Escopo obrigatório: as duas abas ficam montadas, e os campos são
     homônimos na árvore inteira (AD-014). */
  const form = dialogo.getByRole("form", { name: "Lançamento avulso" });
  await form.getByLabel("Descrição").fill(descricao);
  await form.getByLabel("Valor (R$)").fill("10,00");
  await form.getByLabel("Meio de pagamento").selectOption({ label: "Cartão Roxo" });
  await form.getByRole("button", { name: "Cadastrar lançamento" }).click();
  await expect(page.getByRole("status")).toContainText(descricao);
  await page.keyboard.press("Escape");
}

interface Retangulo {
  readonly largura: number;
  readonly altura: number;
  readonly esquerda: number;
  readonly direita: number;
  readonly topo: number;
  readonly base: number;
}

/** O retângulo que o navegador desenhou, e não o que a classe promete. */
async function medir(controle: Locator): Promise<Retangulo> {
  return controle.evaluate((elemento) => {
    const r = elemento.getBoundingClientRect();
    return {
      largura: r.width,
      altura: r.height,
      esquerda: r.left,
      direita: r.right,
      topo: r.top,
      base: r.bottom,
    };
  });
}

test("os dois controles da linha medem ao menos 44 × 44 em 400 pixels (TOQUE-01, ACs 1 a 3)", async ({
  page,
}) => {
  await cadastrarGastoAvulso(page, "Gasto avulso A");

  expect(page.viewportSize()?.width).toBe(LARGURA_DE_CELULAR);

  const linha = page.getByRole("row", { name: /Gasto avulso A/ });
  const selo = await medir(linha.getByRole("button", { name: /^Previsto/ }));
  const excluir = await medir(linha.getByRole("button", { name: /^Excluir/ }));

  expect(selo.largura).toBeGreaterThanOrEqual(ALVO_MINIMO);
  expect(selo.altura).toBeGreaterThanOrEqual(ALVO_MINIMO);
  expect(excluir.largura).toBeGreaterThanOrEqual(ALVO_MINIMO);
  expect(excluir.altura).toBeGreaterThanOrEqual(ALVO_MINIMO);
});

test("os dois alvos continuam separados, e a linha não transborda a janela", async ({ page }) => {
  await cadastrarGastoAvulso(page, "Gasto avulso A");

  const linha = page.getByRole("row", { name: /Gasto avulso A/ });
  const selo = await medir(linha.getByRole("button", { name: /^Previsto/ }));
  const excluir = await medir(linha.getByRole("button", { name: /^Excluir/ }));

  /* Lado a lado ou um abaixo do outro, o que não pode é encostar: no celular
     a pessoa precisa ver onde um alvo acaba. */
  const separacao = Math.max(excluir.esquerda - selo.direita, excluir.topo - selo.base);
  expect(separacao).toBeGreaterThan(0);

  /* A pílula cresceu; a linha continua cabendo. */
  await expect(linha.getByRole("button", { name: /^Previsto/ })).toBeVisible();
  const transbordo = await page.evaluate(() =>
    Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
  );
  expect(transbordo).toBe(0);
});
