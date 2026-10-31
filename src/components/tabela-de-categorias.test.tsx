import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type ItemDeCategoria, TabelaDeCategorias } from "./tabela-de-categorias";

/**
 * Derivado de CADCOL-02 (ACs 1 a 6, 8 no texto e 9), CADCOL-04 (ACs 1 e 13) e
 * do Done-when da T11. Herda os testes 146, 155, 161 e 455 de
 * `lista-de-categorias.test.tsx` (design, "Para onde vai cada teste").
 *
 * Toda consulta que situa um elemento fica presa à linha da categoria (L-018).
 * A altura da linha, o cabeçalho escondido abaixo de 768 px e o fundo da
 * linha aberta se medem no navegador (T15).
 *
 * As cores automáticas: "Categoria Um" é ciano e "Categoria E" é azul. Nomes
 * genéricos (AD-009).
 */

afterEach(cleanup);

const UM = "11111111-1111-4111-8111-111111111111";
const DOIS = "22222222-2222-4222-8222-222222222222";
const E = "33333333-3333-4333-8333-333333333333";

/* Fora de ordem alfabética de propósito: a tabela mostra a ordem recebida,
   que a página já entrega em ordem alfabética. As contagens cobrem 0, 1 e 2,
   o singular e o plural de cada uma. */
const CATEGORIAS: ReadonlyArray<ItemDeCategoria> = [
  { id: DOIS, nome: "Categoria Dois", cor: "laranja", fixos: 0, lancamentos: 0 },
  { id: UM, nome: "Categoria Um", cor: null, fixos: 1, lancamentos: 2 },
  { id: E, nome: "Categoria E", cor: null, fixos: 2, lancamentos: 1 },
];

function montar({
  categorias = CATEGORIAS,
  abertaId = null,
}: {
  readonly categorias?: ReadonlyArray<ItemDeCategoria>;
  readonly abertaId?: string | null;
} = {}) {
  const aoAbrir = vi.fn();
  render(
    <TabelaDeCategorias
      categorias={categorias}
      nomeDoMes="Março"
      abertaId={abertaId}
      aoAbrir={aoAbrir}
    />,
  );
  return { aoAbrir, usuario: userEvent.setup() };
}

function tabela(): HTMLElement {
  return screen.getByRole("table", { name: "Categorias" });
}

/** As linhas do corpo, sem a do cabeçalho. */
function linhas(): HTMLElement[] {
  return within(tabela())
    .getAllByRole("row")
    .filter((linha) => within(linha).queryAllByRole("columnheader").length === 0);
}

/** A linha de uma categoria, pela posição em que ela foi entregue. */
function linhaDe(id: string): HTMLElement {
  const linha = linhas()[CATEGORIAS.findIndex((categoria) => categoria.id === id)];
  if (linha === undefined) {
    throw new Error(`linha da categoria ${id} não está na tabela`);
  }
  return linha;
}

function botaoDa(linha: HTMLElement): HTMLElement {
  return within(linha).getByRole("button");
}

/** A pill do nome: o botão da linha é a própria pill. */
function pill(linha: HTMLElement): HTMLElement {
  const elemento = botaoDa(linha).firstElementChild;
  if (!(elemento instanceof HTMLElement)) {
    throw new Error("o botão da linha não tem a pill da categoria");
  }
  return elemento;
}

/** As células da linha, na ordem das colunas. */
function celulas(linha: HTMLElement): HTMLElement[] {
  return within(linha).getAllByRole("cell");
}

describe("a tabela (CADCOL-02, AC 1)", () => {
  it('se chama "Categorias" e tem as colunas Categoria, Cor e as duas contagens do mês', () => {
    montar();

    expect(
      within(tabela())
        .getAllByRole("columnheader")
        .map((cabecalho) => cabecalho.textContent),
    ).toEqual(["Categoria", "Cor", "Fixos em Março", "Lançamentos em Março"]);
  });
});

describe("uma linha por categoria, com a pill na cor em uso (CADCOL-02, ACs 2 e 3)", () => {
  it("mostra as categorias na ordem recebida", () => {
    montar();

    expect(linhas().map((linha) => pill(linha).textContent)).toEqual([
      "Categoria Dois",
      "Categoria Um",
      "Categoria E",
    ]);
  });

  it("a cor escolhida pinta a pill", () => {
    montar();

    expect(pill(linhaDe(DOIS)).className).toContain("bg-cat-laranja-fundo text-cat-laranja-texto");
  });

  it("sem cor escolhida, a pill tem a cor automática do nome", () => {
    montar();

    expect(pill(linhaDe(UM)).className).toContain("bg-cat-ciano-fundo text-cat-ciano-texto");
    expect(pill(linhaDe(E)).className).toContain("bg-cat-azul-fundo text-cat-azul-texto");
  });
});

describe("a coluna Cor (CADCOL-02, AC 4)", () => {
  it('a escolhida mostra o nome da cor, "Laranja"', () => {
    montar();

    expect(celulas(linhaDe(DOIS))[1]?.textContent).toBe("Laranja");
  });

  it('sem escolha, "Automática" com a cor que o nome dá', () => {
    montar();

    expect(celulas(linhaDe(E))[1]?.textContent).toBe("Automática (Azul)");
    expect(celulas(linhaDe(UM))[1]?.textContent).toBe("Automática (Ciano)");
  });
});

describe("as contagens do mês (CADCOL-02, ACs 5 e 8, o texto)", () => {
  it("sem uso, as duas contagens são 0, com o nome no plural", () => {
    montar();

    const [, , fixos, lancamentos] = celulas(linhaDe(DOIS));
    expect(fixos?.textContent).toBe("0 fixos");
    expect(lancamentos?.textContent).toBe("0 lançamentos");
  });

  it("cada contagem tem o nome escrito, no singular com 1 e no plural com 2", () => {
    montar();

    const [, , fixosDoUm, lancamentosDoUm] = celulas(linhaDe(UM));
    expect(fixosDoUm?.textContent).toBe("1 fixo");
    expect(lancamentosDoUm?.textContent).toBe("2 lançamentos");
    const [, , fixosDoE, lancamentosDoE] = celulas(linhaDe(E));
    expect(fixosDoE?.textContent).toBe("2 fixos");
    expect(lancamentosDoE?.textContent).toBe("1 lançamento");
  });
});

describe("abrir uma categoria (CADCOL-02, AC 6; CADCOL-04, AC 1)", () => {
  it("o único botão de cada linha é o da categoria", () => {
    montar();

    for (const [indice, linha] of linhas().entries()) {
      const botoes = within(linha).getAllByRole("button");
      expect(botoes).toHaveLength(1);
      expect(botoes[0]?.textContent).toBe(CATEGORIAS[indice]?.nome);
    }
  });

  it("clicar na célula de uma contagem abre a categoria da linha", async () => {
    const { aoAbrir, usuario } = montar();

    await usuario.click(celulas(linhaDe(UM))[3] as HTMLElement);

    expect(aoAbrir).toHaveBeenCalledTimes(1);
    expect(aoAbrir).toHaveBeenCalledWith(UM);
  });

  it("acionar o botão pelo teclado abre a categoria, uma vez só", async () => {
    const { aoAbrir, usuario } = montar();
    botaoDa(linhaDe(E)).focus();

    await usuario.keyboard("{Enter}");

    expect(aoAbrir).toHaveBeenCalledTimes(1);
    expect(aoAbrir).toHaveBeenCalledWith(E);
  });
});

describe("a linha aberta (CADCOL-04, AC 13)", () => {
  it("o botão dela tem aria-expanded=true, e o das outras, false; todos apontam para o painel", () => {
    montar({ abertaId: UM });

    expect(botaoDa(linhaDe(UM)).getAttribute("aria-expanded")).toBe("true");
    expect(botaoDa(linhaDe(DOIS)).getAttribute("aria-expanded")).toBe("false");
    expect(botaoDa(linhaDe(E)).getAttribute("aria-expanded")).toBe("false");
    for (const linha of linhas()) {
      expect(botaoDa(linha).getAttribute("aria-controls")).toBe("painel-da-categoria");
    }
  });

  it("sem nada aberto, todos os botões têm aria-expanded=false", () => {
    montar();

    for (const linha of linhas()) {
      expect(botaoDa(linha).getAttribute("aria-expanded")).toBe("false");
    }
  });
});

describe("sem categoria nenhuma (CADCOL-02, AC 9)", () => {
  it('diz que não há categorias e que se cria pelo "+ Nova categoria", no lugar da tabela', () => {
    montar({ categorias: [] });

    expect(screen.queryByRole("table")).toBeNull();
    expect(
      screen.getByText("Nenhuma categoria ainda. Crie a primeira pelo “+ Nova categoria”."),
    ).toBeTruthy();
  });
});
