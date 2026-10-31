import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type ItemDeMeio, TabelaDeMeios } from "./tabela-de-meios";

/**
 * Derivado de CADCOL-06 (ACs 1 a 6, 8 no texto e 9), CADCOL-07 (ACs 1 e 15) e
 * do Done-when da T16. É a forma de `tabela-de-categorias.test.tsx`, com as
 * colunas do meio.
 *
 * Toda consulta que situa um elemento fica presa à linha do meio (L-018). A
 * altura da linha, o cabeçalho escondido abaixo de 768 px e o fundo da linha
 * aberta se medem no navegador (T20).
 *
 * Nomes genéricos (AD-009). As contagens cobrem 0, 1 e 2, o singular e o
 * plural de cada uma; os dias 25 e 5 são os do cartão de `semearCadastroBase`.
 */

afterEach(cleanup);

const CARTAO = "11111111-1111-4111-8111-111111111111";
const CONTA = "22222222-2222-4222-8222-222222222222";
const ROTULO = "33333333-3333-4333-8333-333333333333";

/* Fora de ordem alfabética de propósito: a tabela mostra a ordem recebida,
   que a página já entrega em ordem alfabética. */
const MEIOS: ReadonlyArray<ItemDeMeio> = [
  {
    id: CONTA,
    nome: "Conta Corrente",
    tipo: "CONTA_CORRENTE",
    diaFechamento: null,
    diaVencimento: null,
    fixos: 2,
    lancamentos: 2,
  },
  {
    id: CARTAO,
    nome: "Cartão Roxo",
    tipo: "CARTAO_CREDITO",
    diaFechamento: 25,
    diaVencimento: 5,
    fixos: 0,
    lancamentos: 1,
  },
  {
    id: ROTULO,
    nome: "Rótulo Âmbar",
    tipo: "ROTULO",
    diaFechamento: null,
    diaVencimento: null,
    fixos: 1,
    lancamentos: 0,
  },
];

function montar({
  meios = MEIOS,
  abertoId = null,
}: {
  readonly meios?: ReadonlyArray<ItemDeMeio>;
  readonly abertoId?: string | null;
} = {}) {
  const aoAbrir = vi.fn();
  render(<TabelaDeMeios meios={meios} nomeDoMes="Março" abertoId={abertoId} aoAbrir={aoAbrir} />);
  return { aoAbrir, usuario: userEvent.setup() };
}

function tabela(): HTMLElement {
  return screen.getByRole("table", { name: "Meios de pagamento" });
}

/** As linhas do corpo, sem a do cabeçalho. */
function linhas(): HTMLElement[] {
  return within(tabela())
    .getAllByRole("row")
    .filter((linha) => within(linha).queryAllByRole("columnheader").length === 0);
}

/** A linha de um meio, pela posição em que ele foi entregue. */
function linhaDe(id: string): HTMLElement {
  const linha = linhas()[MEIOS.findIndex((meio) => meio.id === id)];
  if (linha === undefined) {
    throw new Error(`linha do meio ${id} não está na tabela`);
  }
  return linha;
}

function botaoDa(linha: HTMLElement): HTMLElement {
  return within(linha).getByRole("button");
}

/** As células da linha, na ordem das colunas. */
function celulas(linha: HTMLElement): HTMLElement[] {
  return within(linha).getAllByRole("cell");
}

describe("a tabela (CADCOL-06, AC 1)", () => {
  it('se chama "Meios de pagamento" e tem as colunas do meio, do tipo, dos dias e das duas contagens do mês', () => {
    montar();

    expect(
      within(tabela())
        .getAllByRole("columnheader")
        .map((cabecalho) => cabecalho.textContent),
    ).toEqual([
      "Meio de pagamento",
      "Tipo",
      "Fecha",
      "Vence",
      "Fixos em Março",
      "Lançamentos em Março",
    ]);
  });
});

describe("uma linha por meio, com o nome em texto (CADCOL-06, AC 2)", () => {
  it("mostra os meios na ordem recebida", () => {
    montar();

    expect(linhas().map((linha) => botaoDa(linha).textContent)).toEqual([
      "Conta Corrente",
      "Cartão Roxo",
      "Rótulo Âmbar",
    ]);
  });
});

describe("o tipo (CADCOL-06, AC 3)", () => {
  it('o cartão mostra "Cartão de crédito"', () => {
    montar();

    expect(celulas(linhaDe(CARTAO))[1]?.textContent).toBe("Cartão de crédito");
  });

  it('a conta mostra "Conta corrente"', () => {
    montar();

    expect(celulas(linhaDe(CONTA))[1]?.textContent).toBe("Conta corrente");
  });

  it('o rótulo mostra "Rótulo"', () => {
    montar();

    expect(celulas(linhaDe(ROTULO))[1]?.textContent).toBe("Rótulo");
  });
});

/*
 * Abaixo de 768 px não há cabeçalho, e o nome de cada dia fica escrito na
 * célula, como o de cada contagem (AC 8): "fecha" e "vence" são texto só para
 * leitor de tela a partir de 768 px, onde o cabeçalho diz o que é. O
 * navegador mede essa troca (T20).
 */
describe("os dias (CADCOL-06, AC 4)", () => {
  it('no cartão, "dia 25" em Fecha e "dia 5" em Vence', () => {
    montar();

    const [, , fecha, vence] = celulas(linhaDe(CARTAO));
    expect(fecha?.textContent).toBe("fecha dia 25");
    expect(vence?.textContent).toBe("vence dia 5");
  });

  it('na conta e no rótulo, "—" em Fecha e em Vence', () => {
    montar();

    for (const id of [CONTA, ROTULO]) {
      const [, , fecha, vence] = celulas(linhaDe(id));
      expect(fecha?.textContent).toBe("—");
      expect(vence?.textContent).toBe("—");
    }
  });
});

describe("as contagens do mês (CADCOL-06, ACs 5 e 8, o texto)", () => {
  it("sem uso, a contagem é 0, com o nome no plural", () => {
    montar();

    expect(celulas(linhaDe(CARTAO))[4]?.textContent).toBe("0 fixos");
    expect(celulas(linhaDe(ROTULO))[5]?.textContent).toBe("0 lançamentos");
  });

  it("cada contagem tem o nome escrito, no singular com 1 e no plural com 2", () => {
    montar();

    const [, , , , fixosDaConta, lancamentosDaConta] = celulas(linhaDe(CONTA));
    expect(fixosDaConta?.textContent).toBe("2 fixos");
    expect(lancamentosDaConta?.textContent).toBe("2 lançamentos");
    expect(celulas(linhaDe(ROTULO))[4]?.textContent).toBe("1 fixo");
    expect(celulas(linhaDe(CARTAO))[5]?.textContent).toBe("1 lançamento");
  });
});

describe("abrir um meio (CADCOL-06, AC 6; CADCOL-07, AC 1)", () => {
  it("o único botão de cada linha é o do meio", () => {
    montar();

    for (const [indice, linha] of linhas().entries()) {
      const botoes = within(linha).getAllByRole("button");
      expect(botoes).toHaveLength(1);
      expect(botoes[0]?.textContent).toBe(MEIOS[indice]?.nome);
    }
  });

  it("clicar na célula de uma contagem abre o meio da linha", async () => {
    const { aoAbrir, usuario } = montar();

    await usuario.click(celulas(linhaDe(CARTAO))[5] as HTMLElement);

    expect(aoAbrir).toHaveBeenCalledTimes(1);
    expect(aoAbrir).toHaveBeenCalledWith(CARTAO);
  });

  it("acionar o botão pelo teclado abre o meio, uma vez só", async () => {
    const { aoAbrir, usuario } = montar();
    botaoDa(linhaDe(ROTULO)).focus();

    await usuario.keyboard("{Enter}");

    expect(aoAbrir).toHaveBeenCalledTimes(1);
    expect(aoAbrir).toHaveBeenCalledWith(ROTULO);
  });
});

describe("a linha aberta (CADCOL-07, AC 15)", () => {
  it("o botão dela tem aria-expanded=true, e o dos outros, false; todos apontam para o painel", () => {
    montar({ abertoId: CARTAO });

    expect(botaoDa(linhaDe(CARTAO)).getAttribute("aria-expanded")).toBe("true");
    expect(botaoDa(linhaDe(CONTA)).getAttribute("aria-expanded")).toBe("false");
    expect(botaoDa(linhaDe(ROTULO)).getAttribute("aria-expanded")).toBe("false");
    for (const linha of linhas()) {
      expect(botaoDa(linha).getAttribute("aria-controls")).toBe("painel-do-meio");
    }
  });

  it("sem nada aberto, todos os botões têm aria-expanded=false", () => {
    montar();

    for (const linha of linhas()) {
      expect(botaoDa(linha).getAttribute("aria-expanded")).toBe("false");
    }
  });
});

describe("sem meio nenhum (CADCOL-06, AC 9)", () => {
  it('diz que não há meios e que se cadastra pelo "+ Novo meio", no lugar da tabela', () => {
    montar({ meios: [] });

    expect(screen.queryByRole("table")).toBeNull();
    expect(
      screen.getByText("Nenhum meio de pagamento ainda. Cadastre o primeiro pelo “+ Novo meio”."),
    ).toBeTruthy();
  });
});
