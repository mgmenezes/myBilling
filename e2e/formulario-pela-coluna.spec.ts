import { expect, type Locator, type Page, test } from "@playwright/test";
import type { Pool } from "pg";
import {
  criarPoolDeTeste,
  limparDados,
  recriarBancoDeTeste,
  semearCadastroBase,
} from "@/infrastructure/db/testing/banco-de-teste";

/**
 * **Os formulários Avulso e Parcelado pela largura do formulário, e não da
 * janela** (FPC-01 a FPC-03).
 *
 * Layout se prova no navegador, com a caixa medida de cada elemento, e não
 * pelo nome da classe. O nome da pessoa é longo de propósito: é o conteúdo que
 * aperta o seletor (AD-009: nome genérico).
 */

const EMAIL_PERMITIDO = "pessoa-a@example.com";
const MARCO = "2026-03";
const NOME_LONGO = "Pessoa A com nome longo";

/** Um par de campos: o rótulo de cada um, para achar o controle. */
type Par = readonly [string, string];

const PARES_AVULSO: ReadonlyArray<Par> = [
  ["Meio de pagamento", "Categoria"],
  ["De quem é o lançamento", "Data"],
];
const PARES_PARCELADO: ReadonlyArray<Par> = [
  ["Quantidade de parcelas", "Já estou na parcela"],
  ["Meio de pagamento", "Categoria"],
  ["De quem é a compra", "Data da compra"],
];

type Formulario = "Avulso" | "Parcelado";
const NOME_DO_FORMULARIO: Record<Formulario, string> = {
  Avulso: "Lançamento avulso",
  Parcelado: "Nova compra",
};
const PARES: Record<Formulario, ReadonlyArray<Par>> = {
  Avulso: PARES_AVULSO,
  Parcelado: PARES_PARCELADO,
};
const PESSOA: Record<Formulario, string> = {
  Avulso: "De quem é o lançamento",
  Parcelado: "De quem é a compra",
};
const FORMULARIOS: ReadonlyArray<Formulario> = ["Avulso", "Parcelado"];

let pool: Pool;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  pool = criarPoolDeTeste();
  await recriarBancoDeTeste(pool);
  await limparDados(pool);
  await semearCadastroBase(pool);
  await pool.query("UPDATE usuario SET nome = $1 WHERE email = $2", [NOME_LONGO, EMAIL_PERMITIDO]);
});

test.afterAll(async () => {
  await pool.end();
});

test.beforeEach(async ({ page }) => {
  const csrf = await page.request.get("/api/auth/csrf");
  const { csrfToken } = (await csrf.json()) as { csrfToken: string };
  await page.request.post("/api/auth/callback/provedor-de-teste", {
    form: { csrfToken, email: EMAIL_PERMITIDO, callbackUrl: "/" },
  });
});

/**
 * Abre a tela e espera o título dela. Medir logo depois do `goto`, antes de o
 * conteúdo chegar, mede uma página pela metade e dá falha de tempo, e não de
 * layout.
 */
async function abrir(page: Page, caminho: string): Promise<void> {
  await page.goto(caminho);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
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

/** A coluna de ação da Visão geral, com o cadastro aberto. */
async function formularioDaColuna(page: Page, qual: Formulario): Promise<Locator> {
  await abrir(page, `/${MARCO}`);
  const coluna = page.getByRole("region", { name: "Novo lançamento" });
  await coluna.getByRole("tab", { name: qual }).click();
  const form = coluna.getByRole("form", { name: NOME_DO_FORMULARIO[qual] });
  await expect(form).toBeVisible();
  return form;
}

/** O formulário dentro do diálogo "+ Novo lançamento" de Lançamentos. */
async function formularioDoDialogo(page: Page, qual: Formulario): Promise<Locator> {
  await abrir(page, `/${MARCO}/lancamentos`);
  await page.getByRole("button", { name: "+ Novo lançamento" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByRole("tab", { name: qual }).click();
  const form = dialogo.getByRole("form", { name: NOME_DO_FORMULARIO[qual] });
  await expect(form).toBeVisible();
  return form;
}

function controle(form: Locator, rotulo: string): Locator {
  return form.getByLabel(rotulo, { exact: true });
}

/** Para cada par, se o segundo campo está ao lado do primeiro ou embaixo dele. */
async function posicaoDosPares(
  form: Locator,
  pares: ReadonlyArray<Par>,
): Promise<Array<{ readonly par: string; readonly aoLado: boolean; readonly embaixo: boolean }>> {
  const resultado = [];
  for (const [primeiro, segundo] of pares) {
    const a = await caixa(controle(form, primeiro));
    const b = await caixa(controle(form, segundo));
    resultado.push({
      par: `${primeiro} e ${segundo}`,
      aoLado: b.x >= a.x + a.width - 0.5 && Math.abs(b.y - a.y) <= 1,
      embaixo: b.y >= a.y + a.height,
    });
  }
  return resultado;
}

function esperado(pares: ReadonlyArray<Par>, aoLado: boolean) {
  return pares.map(([primeiro, segundo]) => ({
    par: `${primeiro} e ${segundo}`,
    aoLado,
    embaixo: !aoLado,
  }));
}

/** Quantas linhas de texto o elemento ocupa: os topos distintos das caixas do texto. */
async function linhasDeTexto(alvo: Locator): Promise<number> {
  return alvo.evaluate((el) => {
    const faixa = document.createRange();
    faixa.selectNodeContents(el);
    const topos = new Set([...faixa.getClientRects()].map((r) => Math.round(r.top)));
    return topos.size;
  });
}

/** Cada rótulo dos pares, numa linha só. */
async function rotulosEmUmaLinha(form: Locator, pares: ReadonlyArray<Par>): Promise<void> {
  for (const rotulo of pares.flat()) {
    const alvo = form.locator("label").filter({ hasText: new RegExp(`^${rotulo}$`) });
    await expect(alvo, rotulo).toHaveCount(1);
    expect(await linhasDeTexto(alvo), `rótulo "${rotulo}"`).toBe(1);
  }
}

/** O atalho "+ novo" e "+ nova" dos dois campos que o têm, numa linha só. */
async function atalhosEmUmaLinha(form: Locator): Promise<void> {
  for (const nome of ["+ novo", "+ nova"]) {
    const atalho = form.getByRole("button", { name: nome, exact: true });
    await expect(atalho, nome).toHaveCount(1);
    expect(await linhasDeTexto(atalho), nome).toBe(1);
  }
}

/** O texto escolhido do seletor cabe no espaço dele: sem corte. */
async function nomeInteiroNoSeletor(form: Locator, rotulo: string): Promise<void> {
  const seletor = controle(form, rotulo);
  const medida = await seletor.evaluate((el) => {
    const select = el as HTMLSelectElement;
    const estilo = getComputedStyle(select);
    const contexto = document.createElement("canvas").getContext("2d");
    if (contexto === null) {
      throw new Error("sem canvas");
    }
    contexto.font = `${estilo.fontWeight} ${estilo.fontSize} ${estilo.fontFamily}`;
    const texto = select.selectedOptions[0]?.textContent ?? "";
    return {
      texto,
      largura: contexto.measureText(texto).width,
      disponivel:
        select.clientWidth -
        Number.parseFloat(estilo.paddingLeft) -
        Number.parseFloat(estilo.paddingRight),
    };
  });
  expect(medida.texto).toBe(NOME_LONGO);
  /* O seletor nativo reserva o espaço da seta à direita: 24 px de folga. */
  expect(medida.largura + 24).toBeLessThanOrEqual(medida.disponivel);
}

/* ------------------------------------------------------------------------
 * FPC-01: um campo por linha na coluna estreita.
 * ---------------------------------------------------------------------- */

for (const [largura, altura] of [
  [1920, 1080],
  [1280, 900],
] as const) {
  for (const qual of FORMULARIOS) {
    test(`em ${largura} px, na coluna da Visão geral, o formulário ${qual} tem um campo por linha, rótulos e atalhos numa linha e o nome inteiro (FPC-01, ACs 1 a 5)`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: largura, height: altura });
      const form = await formularioDaColuna(page, qual);

      expect((await caixa(form)).width).toBeLessThan(448);
      expect(await posicaoDosPares(form, PARES[qual])).toEqual(esperado(PARES[qual], false));
      await rotulosEmUmaLinha(form, PARES[qual]);
      await atalhosEmUmaLinha(form);
      await nomeInteiroNoSeletor(form, PESSOA[qual]);
    });
  }
}

test("com o Avulso em Receita, o rótulo do meio e o atalho seguem numa linha, e o cadastro de meio aberto não quebra o par (FPC-01, ACs 1 e 3)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const form = await formularioDaColuna(page, "Avulso");
  await form.getByRole("radio", { name: "Um dinheiro que entra" }).check();

  const rotulo = form.locator("label").filter({ hasText: /^Onde o dinheiro cai$/ });
  await expect(rotulo).toHaveCount(1);
  expect(await linhasDeTexto(rotulo)).toBe(1);

  await form.getByRole("button", { name: "+ novo", exact: true }).click();
  await expect(form.getByRole("group", { name: "Novo meio de pagamento" })).toBeVisible();
  expect(await linhasDeTexto(rotulo)).toBe(1);
  const meio = await caixa(controle(form, "Onde o dinheiro cai"));
  const categoria = await caixa(controle(form, "Categoria"));
  expect(categoria.y).toBeGreaterThanOrEqual(meio.y + meio.height);
  expect(meio.width).toBeGreaterThan(250);
});

test("com o cadastro de categoria aberto no Parcelado, o par continua empilhado e o rótulo numa linha (FPC-01, AC 2)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const form = await formularioDaColuna(page, "Parcelado");
  await form.getByRole("button", { name: "+ nova", exact: true }).click();
  await expect(form.getByRole("group", { name: "Nova categoria" })).toBeVisible();

  expect(await posicaoDosPares(form, PARES_PARCELADO)).toEqual(esperado(PARES_PARCELADO, false));
  await rotulosEmUmaLinha(form, PARES_PARCELADO);
});

/*
 * Os dois dias do cartão novo (FPC-01, AC 2 do Parcelado e edge case do
 * cartão novo): o Avulso os monta pelo `CadastroDeMeioInline`, que a
 * importação também usa, e o Parcelado pelo próprio formulário. Os dois
 * seguem o limiar do formulário.
 */
const DIAS_DO_CARTAO: Par = ["Dia de fechamento", "Dia de vencimento"];

async function abrirCartaoNovo(form: Locator): Promise<void> {
  await form.getByRole("button", { name: "+ novo", exact: true }).click();
  const grupo = form.getByRole("group", { name: "Novo meio de pagamento" });
  await expect(grupo).toBeVisible();
  await grupo.getByLabel("Tipo", { exact: true }).selectOption({ label: "Cartão de crédito" });
  await expect(controle(grupo, DIAS_DO_CARTAO[0])).toBeVisible();
}

for (const qual of FORMULARIOS) {
  test(`em 1.920 px, na coluna, os dias do cartão novo do ${qual} ficam um embaixo do outro; em 1.000 px, lado a lado (FPC-01, edge case do cartão novo)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    const estreito = await formularioDaColuna(page, qual);
    await abrirCartaoNovo(estreito);
    expect((await caixa(estreito)).width).toBeLessThan(448);
    expect(await posicaoDosPares(estreito, [DIAS_DO_CARTAO])).toEqual(
      esperado([DIAS_DO_CARTAO], false),
    );
    await rotulosEmUmaLinha(estreito, [DIAS_DO_CARTAO]);

    await page.setViewportSize({ width: 1000, height: 900 });
    const largo = await formularioDaColuna(page, qual);
    await abrirCartaoNovo(largo);
    expect((await caixa(largo)).width).toBeGreaterThanOrEqual(448);
    expect(await posicaoDosPares(largo, [DIAS_DO_CARTAO])).toEqual(
      esperado([DIAS_DO_CARTAO], true),
    );
  });
}

test("em 375 px, o formulário tem um campo por linha nos dois formulários (FPC-01, ACs 1 e 2)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 800 });
  for (const qual of FORMULARIOS) {
    const form = await formularioDaColuna(page, qual);
    expect((await caixa(form)).width).toBeLessThan(448);
    expect(await posicaoDosPares(form, PARES[qual]), qual).toEqual(esperado(PARES[qual], false));
  }
});

/* ------------------------------------------------------------------------
 * FPC-02: lado a lado onde o formulário é largo.
 * ---------------------------------------------------------------------- */

for (const qual of FORMULARIOS) {
  test(`em 1.280 px, no diálogo de Lançamentos, o formulário ${qual} tem os pares lado a lado (FPC-02, ACs 1 a 3)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const form = await formularioDoDialogo(page, qual);

    expect((await caixa(form)).width).toBeGreaterThanOrEqual(448);
    expect(await posicaoDosPares(form, PARES[qual])).toEqual(esperado(PARES[qual], true));
    await rotulosEmUmaLinha(form, PARES[qual]);
  });

  test(`em 1.000 px, com a coluna de ação abaixo do centro, o formulário ${qual} tem os pares lado a lado (FPC-02, ACs 1, 2 e 4)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1000, height: 900 });
    const form = await formularioDaColuna(page, qual);

    expect((await caixa(form)).width).toBeGreaterThanOrEqual(448);
    expect(await posicaoDosPares(form, PARES[qual])).toEqual(esperado(PARES[qual], true));
  });
}

/* ------------------------------------------------------------------------
 * FPC-03: o limiar é a largura do formulário (L-029, L-050).
 *
 * Abaixo de 640 px de janela a coluna de ação fica abaixo do centro, com
 * 16 px de respiro de cada lado: a janela de 480 px deixa o formulário com
 * 448 px, e a de 479 px, com 447 px. O teste mede a largura antes de conferir
 * os pares, para o limiar continuar colado se o respiro mudar. Em janela
 * abaixo de 640 px o `sm:` de antes dava um campo por linha nas duas: só a
 * janela de 448 px denuncia a referência errada.
 * ---------------------------------------------------------------------- */

for (const qual of FORMULARIOS) {
  test(`com o formulário ${qual} em 447 px, um campo por linha; em 448 px, os pares lado a lado (FPC-03, ACs 1 a 3)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 479, height: 900 });
    const form = await formularioDaColuna(page, qual);
    const estreito = (await caixa(form)).width;
    expect(estreito).toBeLessThan(448);
    expect(estreito).toBeGreaterThanOrEqual(447);
    expect(await posicaoDosPares(form, PARES[qual])).toEqual(esperado(PARES[qual], false));

    await page.setViewportSize({ width: 480, height: 900 });
    await expect.poll(async () => (await caixa(form)).width).toBeGreaterThanOrEqual(448);
    expect((await caixa(form)).width).toBeLessThan(449);
    expect(await posicaoDosPares(form, PARES[qual])).toEqual(esperado(PARES[qual], true));
  });
}
