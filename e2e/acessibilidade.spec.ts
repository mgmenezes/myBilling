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

/**
 * O que existia só em CSS, e podia sumir sem nenhuma prova reclamar
 * (REDE-03). Nada disto está quebrado hoje; tudo isto quebra em silêncio.
 */

/**
 * A duração de transição que o navegador calculou, em milissegundos.
 *
 * Lê o valor bruto e recusa string vazia: estilo computado vazio significa nó
 * solto do documento, e `parseFloat` devolveria `NaN` — que é uma falha
 * silenciosa disfarçada de medida.
 */
async function duracaoDaTransicao(controle: Locator): Promise<number> {
  const valor = await controle.evaluate(
    (elemento) => getComputedStyle(elemento).transitionDuration,
  );
  /* Sob movimento reduzido o navegador devolve `1e-05s`, em notação
     científica: o guarda precisa aceitá-la, ou recusa justamente a medida que
     o teste existe para ver. */
  if (!/^\d*\.?\d+(?:e[+-]?\d+)?m?s$/i.test(valor)) {
    throw new Error(`transition-duration ilegível: "${valor}"`);
  }
  return valor.endsWith("ms") ? Number.parseFloat(valor) : Number.parseFloat(valor) * 1000;
}

/**
 * O alvo da medida é a seta do seletor de mês: ela declara `duration-200`, e
 * mora no layout, fora da árvore do Motion — onde o elemento é reconstruído na
 * hidratação e o estilo computado vira medida de nó solto.
 */
function setaDoMesAnterior(page: Page): Locator {
  return page.getByRole("link", { name: /Mês anterior/ });
}

test.describe("movimento reduzido (REDE-03, AC 1)", () => {
  test.use({ reducedMotion: "reduce" });

  test("a transição do controle mais tocado é instantânea", async ({ page }) => {
    await page.goto(`/${CORRENTE}/lancamentos`);

    const seta = setaDoMesAnterior(page);
    await expect(seta).toBeVisible();

    expect(await duracaoDaTransicao(seta)).toBeLessThan(1);
  });
});

test.describe("sem preferência declarada de movimento", () => {
  test.use({ reducedMotion: "no-preference" });

  /* O controle do caso acima. Sem ele, a media query invertida devolveria uma
     duração baixa por outro motivo e o teste passaria à toa. */
  test("o mesmo controle anima nos 200ms que a classe declara", async ({ page }) => {
    await page.goto(`/${CORRENTE}/lancamentos`);

    const seta = setaDoMesAnterior(page);
    await expect(seta).toBeVisible();

    expect(await duracaoDaTransicao(seta)).toBeGreaterThan(100);
  });
});

test.describe("o valor monetário na lista (REDE-03, AC 2)", () => {
  /* Alinhar à direita é comportamento de tabela, que só existe a partir de
     `md`: abaixo disso a linha é um cartão empilhado. */
  test.use({ viewport: { width: 1280, height: 900 } });

  test("tem algarismo de largura fixa e alinhamento à direita", async ({ page }) => {
    await cadastrarGastoAvulso(page, "Gasto avulso A");

    const celula = page
      .getByRole("row", { name: /Gasto avulso A/ })
      .locator("td")
      .filter({ hasText: "R$" });
    const estilo = await celula.evaluate((elemento) => {
      const computado = getComputedStyle(elemento);
      return { algarismo: computado.fontVariantNumeric, alinhamento: computado.textAlign };
    });

    expect(estilo.algarismo).toContain("tabular-nums");
    expect(estilo.alinhamento).toBe("right");
  });
});

test("cada eixo do painel tem exatamente quatro indicadores (REDE-03, AC 3)", async ({ page }) => {
  for (const eixo of ["", "?visao=movimentacoes"]) {
    await page.goto(`/${CORRENTE}${eixo}`);

    /* A grade é a avó do rótulo: rótulo → cartão → grade. Contar os filhos
       dela é o que pega um quinto indicador; contar rótulos conhecidos não. */
    const grade = page
      .getByText(eixo === "" ? "Receitas do mês" : "Recebido", { exact: true })
      .locator("xpath=../..");

    await expect(grade.locator("> *")).toHaveCount(4);
  }
});

test("a rota do mês transmite o esqueleto de carregamento (REDE-03, AC 5)", async ({ page }) => {
  /* **Por que a prova é sobre a resposta, e não sobre a tela.**
   *
   * Medido, não suposto: em `next dev` o `Link` não prefetcha, então a
   * fronteira de carregamento não existe no cliente e a navegação por clique
   * espera a resposta inteira sem desenhar esqueleto nenhum — a URL nem chega
   * a mudar. E na navegação dura o React substitui o esqueleto antes da
   * primeira amostra: vinte medições de 40 em 40ms devolveram zero nós com
   * `role=status`. A tela não é onde este comportamento é observável.
   *
   * O documento transmitido é. O esqueleto vem nele, e é dali que ele pode
   * sumir em silêncio — que é exatamente o risco que o AC 5 existe para pegar.
   */
  const documento = await page.request.get(`/${CORRENTE}`);
  expect(documento.ok()).toBe(true);
  const html = await documento.text();

  expect(html).toContain('role="status"');
  expect(html).toContain("Carregando o mês");

  /* Conta pelo atributo de classe, e não por `animate-pulse` solto: a carga
     serializada do RSC repete cada `className` no mesmo documento, e contar a
     string crua devolve o dobro — número que mudaria junto com o formato de
     serialização do framework, sem nada ter mudado no app. */
  const blocos = (html.match(/class="animate-pulse/g) ?? []).length;
  expect(blocos).toBe(7);
});
