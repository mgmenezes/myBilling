import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type ItemDeFixo, TabelaDeFixos } from "./tabela-de-fixos";

/**
 * Derivado de FIXCOL-01 (ACs 1, 4 a 9, 12 e 13), FIXCOL-02 (AC 2) e FIXCOL-04
 * (ACs 1 e 7). Herda os testes das linhas de `lista-de-fixos.test.tsx`
 * (`design.md`, "Para onde vai cada teste").
 *
 * Toda consulta que situa um elemento fica presa à região da seção ou à linha
 * do fixo (L-018). Os valores são os do e2e do design: em março, as saídas
 * somam R$ 185,00 e as entradas, R$ 1.000,00 (AD-009).
 */

afterEach(cleanup);

const BASE: ItemDeFixo = {
  id: "rec-a",
  descricao: "Fixo A",
  natureza: "DESPESA",
  diaVencimento: 5,
  categoria: "Categoria Um",
  corDaCategoria: "roxo",
  meio: "Conta Corrente",
  pessoa: "Pessoa A",
  valorDoMes: "R$ 105,00",
  previstoDoMes: "R$ 100,00",
  confirmado: true,
  inicio: "Janeiro de 2026",
  comecaDepois: false,
  fim: null,
  encerrada: false,
  historico: [],
  competenciaInicio: "2026-01",
  competenciaFim: null,
  meioPagamentoId: "meio-1",
  categoriaId: "cat-1",
  usuarioId: "pessoa-a",
  valorNoMesCentavos: 10000,
};

const FIXO_D: ItemDeFixo = {
  ...BASE,
  id: "rec-d",
  descricao: "Fixo D",
  diaVencimento: 1,
  valorDoMes: null,
  previstoDoMes: null,
  confirmado: false,
  inicio: "Junho de 2026",
  comecaDepois: true,
  competenciaInicio: "2026-06",
};
const FIXO_A = BASE;
const FIXO_B: ItemDeFixo = {
  ...BASE,
  id: "rec-b",
  descricao: "Fixo B",
  diaVencimento: 10,
  categoria: "Categoria Dois",
  corDaCategoria: "verde-agua",
  meio: "Cartão Roxo",
  valorDoMes: "R$ 50,00",
  previstoDoMes: "R$ 50,00",
  confirmado: false,
};
const FIXO_C: ItemDeFixo = {
  ...BASE,
  id: "rec-c",
  descricao: "Fixo C",
  diaVencimento: 10,
  categoria: "Sem categoria",
  corDaCategoria: null,
  valorDoMes: "R$ 30,00",
  previstoDoMes: "R$ 30,00",
  confirmado: false,
  fim: "Fevereiro de 2026",
  encerrada: true,
  competenciaFim: "2026-02",
};
const ENTRADA_A: ItemDeFixo = {
  ...BASE,
  id: "rec-e",
  descricao: "Entrada A",
  natureza: "RECEITA",
  categoria: "Receita",
  corDaCategoria: null,
  meio: "Conta Corrente",
  valorDoMes: "R$ 1.000,00",
  previstoDoMes: "R$ 1.000,00",
  confirmado: false,
};

function montar({
  entradas = [ENTRADA_A],
  saidas = [FIXO_D, FIXO_A, FIXO_B, FIXO_C],
  totalEntradas = "R$ 1.000,00",
  totalSaidas = "R$ 185,00",
  abertoId = null,
  aoAbrir = vi.fn(),
}: {
  entradas?: ReadonlyArray<ItemDeFixo>;
  saidas?: ReadonlyArray<ItemDeFixo>;
  totalEntradas?: string;
  totalSaidas?: string;
  abertoId?: string | null;
  aoAbrir?: (id: string) => void;
} = {}) {
  render(
    <TabelaDeFixos
      entradas={entradas}
      saidas={saidas}
      totalEntradas={totalEntradas}
      totalSaidas={totalSaidas}
      nomeDoMes="Março"
      abertoId={abertoId}
      aoAbrir={aoAbrir}
    />,
  );
  return { usuario: userEvent.setup(), aoAbrir };
}

function secao(nome: string): HTMLElement {
  return screen.getByRole("region", { name: nome });
}

/** A linha do fixo, achada pela descrição no botão dela. */
function linhaDe(descricao: string): HTMLElement {
  const linha = screen.getByText(descricao).closest("tr");
  if (linha === null) {
    throw new Error(`"${descricao}" não está numa linha da tabela`);
  }
  return linha;
}

/** A última célula da linha é a do valor do mês. */
function celulaDoValor(descricao: string): HTMLElement {
  const celula = within(linhaDe(descricao)).getAllByRole("cell").at(-1);
  if (celula === undefined) {
    throw new Error(`a linha de "${descricao}" não tem células`);
  }
  return celula;
}

function classesDe(elemento: HTMLElement): string[] {
  return elemento.className.split(/\s+/);
}

describe("as duas seções (FIXCOL-01, ACs 1 e 4)", () => {
  it('"Entradas fixas" vem antes de "Saídas fixas"', () => {
    montar();

    expect(screen.getAllByRole("region").map((r) => r.getAttribute("aria-labelledby"))).toEqual([
      screen.getByRole("heading", { name: "Entradas fixas" }).id,
      screen.getByRole("heading", { name: "Saídas fixas" }).id,
    ]);
  });

  it("as saídas têm as colunas Descrição, Categoria, Vence, Meio e Valor em Março", () => {
    montar();

    expect(
      within(secao("Saídas fixas"))
        .getAllByRole("columnheader")
        .map((c) => c.textContent),
    ).toEqual(["Descrição", "Categoria", "Vence", "Meio", "Valor em Março"]);
  });

  it("as entradas têm as colunas Descrição, Categoria, Cai, Onde cai e Valor em Março", () => {
    montar();

    expect(
      within(secao("Entradas fixas"))
        .getAllByRole("columnheader")
        .map((c) => c.textContent),
    ).toEqual(["Descrição", "Categoria", "Cai", "Onde cai", "Valor em Março"]);
  });

  it('o título de cada seção diz quantas linhas e o total dela: "4 · R$ 185,00"', () => {
    montar();

    expect(within(secao("Saídas fixas")).getByText("4 · R$ 185,00")).toBeTruthy();
    expect(within(secao("Entradas fixas")).getByText("1 · R$ 1.000,00")).toBeTruthy();
    expect(within(secao("Entradas fixas")).queryByText("4 · R$ 185,00")).toBeNull();
  });

  it("cada fixo fica na seção que recebeu, na ordem em que veio", () => {
    montar();

    const descricoes = (nome: string) =>
      within(secao(nome))
        .getAllByRole("row")
        .slice(1)
        .map((linha) => within(linha).getAllByRole("cell")[0]?.textContent);
    expect(descricoes("Saídas fixas")).toEqual([
      expect.stringMatching(/^Fixo D/),
      expect.stringMatching(/^Fixo A/),
      expect.stringMatching(/^Fixo B/),
      expect.stringMatching(/^Fixo C/),
    ]);
    expect(descricoes("Entradas fixas")).toEqual([expect.stringMatching(/^Entrada A/)]);
  });
});

describe("o que a linha mostra (FIXCOL-01, ACs 5 a 9; FIXCOL-02, AC 2)", () => {
  it("o valor do mês e o dia de vencimento, na linha do fixo", () => {
    montar();

    expect(within(celulaDoValor("Fixo B")).getByText("R$ 50,00")).toBeTruthy();
    expect(within(linhaDe("Fixo B")).getByText("dia 10")).toBeTruthy();
    expect(within(linhaDe("Fixo B")).getByText("Cartão Roxo")).toBeTruthy();
  });

  it('"confirmado" junto do valor, só na linha confirmada', () => {
    montar();

    const valorDeA = celulaDoValor("Fixo A");
    expect(within(valorDeA).getByText("confirmado")).toBeTruthy();
    expect(within(valorDeA).getByText("R$ 105,00")).toBeTruthy();
    expect(within(celulaDoValor("Fixo B")).queryByText("confirmado")).toBeNull();
  });

  it('o que começa depois tem "—" no valor, e não zero, e o selo "Começa em Junho de 2026"', () => {
    montar();

    expect(celulaDoValor("Fixo D").textContent).toBe("—");
    expect(within(linhaDe("Fixo D")).getByText("Começa em Junho de 2026")).toBeTruthy();
    expect(within(linhaDe("Fixo A")).queryByText(/Começa em/)).toBeNull();
  });

  it('o encerrado tem o selo "Encerrado" ao lado da descrição', () => {
    montar();

    const botao = within(linhaDe("Fixo C")).getByRole("button");
    expect(within(botao).getByText("Encerrado")).toBeTruthy();
    expect(within(linhaDe("Fixo B")).queryByText("Encerrado")).toBeNull();
  });

  it('toda entrada mostra "Receita" na coluna Categoria, em selo e não só em cor', () => {
    montar({ entradas: [ENTRADA_A, { ...ENTRADA_A, id: "rec-f", descricao: "Entrada B" }] });

    for (const descricao of ["Entrada A", "Entrada B"]) {
      const categoria = within(linhaDe(descricao)).getAllByRole("cell")[1];
      expect(categoria?.textContent).toBe("Receita");
    }
  });

  it("o único botão da linha é o da descrição", () => {
    montar();

    for (const descricao of ["Fixo D", "Fixo A", "Fixo B", "Fixo C", "Entrada A"]) {
      const botoes = within(linhaDe(descricao)).getAllByRole("button");
      expect(botoes).toHaveLength(1);
      expect(botoes[0]?.textContent).toMatch(new RegExp(`^${descricao}`));
    }
  });
});

/**
 * Herdado de COR-03 (AC 1) e COR-02 (ACs 4 e 5): a pill é procurada dentro da
 * linha do fixo, e não na tela inteira (L-018).
 */
describe("a pill da categoria na cor dela (FIXCOL-01, AC 5; COR-03, AC 1)", () => {
  function pillDe(descricao: string, texto: string): HTMLElement {
    return within(linhaDe(descricao)).getByText(texto);
  }

  it("cada saída mostra a pill com o fundo e o texto da cor da própria categoria", () => {
    montar();

    const um = classesDe(pillDe("Fixo A", "Categoria Um"));
    expect(um).toEqual(expect.arrayContaining(["bg-cat-roxo-fundo", "text-cat-roxo-texto"]));
    expect(um).not.toContain("bg-surface-strong");

    expect(classesDe(pillDe("Fixo B", "Categoria Dois"))).toEqual(
      expect.arrayContaining(["bg-cat-verde-agua-fundo", "text-cat-verde-agua-texto"]),
    );
  });

  it("o nome da categoria continua escrito na pill (COR-02, AC 4)", () => {
    montar();

    expect(pillDe("Fixo A", "Categoria Um").textContent).toBe("Categoria Um");
  });

  it.each(["Sem categoria", "Categoria removida"])(
    '"%s" fica na neutra (COR-02, AC 5)',
    (texto) => {
      montar({ saidas: [{ ...FIXO_C, categoria: texto, corDaCategoria: null }] });

      const classes = classesDe(pillDe("Fixo C", texto));
      expect(classes).toEqual(expect.arrayContaining(["bg-surface-strong", "text-ink"]));
      expect(classes.some((classe) => classe.startsWith("bg-cat-"))).toBe(false);
    },
  );

  it("os selos de Encerrado e Começa em não ganham a cor da categoria", () => {
    montar();

    for (const [descricao, selo] of [
      ["Fixo C", "Encerrado"],
      ["Fixo D", "Começa em Junho de 2026"],
    ] as const) {
      const classes = classesDe(pillDe(descricao, selo));
      expect(classes).toContain("bg-surface-strong");
      expect(classes.some((classe) => classe.startsWith("bg-cat-"))).toBe(false);
    }
  });

  it('o selo "Receita" não ganha cor de categoria, mesmo com uma cor no item', () => {
    montar({ entradas: [{ ...ENTRADA_A, corDaCategoria: "roxo" }] });

    const classes = classesDe(pillDe("Entrada A", "Receita"));
    expect(classes).toContain("bg-surface-strong");
    expect(classes.some((classe) => classe.startsWith("bg-cat-"))).toBe(false);
  });
});

describe("os vazios (FIXCOL-01, ACs 12 e 13)", () => {
  it("sem fixo nenhum no mês, um aviso só, no lugar das duas seções", () => {
    montar({ entradas: [], saidas: [], totalEntradas: "R$ 0,00", totalSaidas: "R$ 0,00" });

    expect(
      screen.getByText(
        "Nenhum gasto fixo ou entrada neste mês. Cadastre pelo “+ Novo fixo”: ele passa a aparecer em todo mês, sem você precisar repetir nada.",
      ),
    ).toBeTruthy();
    expect(screen.queryAllByRole("region")).toHaveLength(0);
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("sem entrada, a seção de entradas aparece com a linha de texto dela", () => {
    montar({ entradas: [], totalEntradas: "R$ 0,00" });

    const entradas = secao("Entradas fixas");
    expect(within(entradas).getByText("Nenhuma entrada fixa neste mês.")).toBeTruthy();
    expect(within(entradas).queryByRole("table")).toBeNull();
    expect(within(secao("Saídas fixas")).getAllByRole("row")).toHaveLength(5);
  });

  it("sem saída, a seção de saídas aparece com a linha de texto dela", () => {
    montar({ saidas: [], totalSaidas: "R$ 0,00" });

    const saidas = secao("Saídas fixas");
    expect(within(saidas).getByText("Nenhuma saída fixa neste mês.")).toBeTruthy();
    expect(within(saidas).queryByRole("table")).toBeNull();
  });
});

describe("abrir o fixo pela linha (FIXCOL-04, ACs 1 e 7)", () => {
  it("um clique na célula do valor abre o fixo da linha, uma vez só", async () => {
    const { usuario, aoAbrir } = montar();

    await usuario.click(celulaDoValor("Fixo B"));

    expect(aoAbrir).toHaveBeenCalledTimes(1);
    expect(aoAbrir).toHaveBeenCalledWith("rec-b");
  });

  it("acionar o botão da descrição pelo teclado abre o fixo, uma vez só", async () => {
    const { usuario, aoAbrir } = montar();

    within(linhaDe("Fixo C")).getByRole("button").focus();
    await usuario.keyboard("{Enter}");

    expect(aoAbrir).toHaveBeenCalledTimes(1);
    expect(aoAbrir).toHaveBeenCalledWith("rec-c");
  });

  it("o espaço no botão da descrição também abre", async () => {
    const { usuario, aoAbrir } = montar();

    within(linhaDe("Entrada A")).getByRole("button").focus();
    await usuario.keyboard(" ");

    expect(aoAbrir).toHaveBeenCalledWith("rec-e");
  });

  it('o botão da linha aberta diz aria-expanded="true"; os outros, "false"', () => {
    montar({ abertoId: "rec-b" });

    for (const descricao of ["Fixo D", "Fixo A", "Fixo B", "Fixo C", "Entrada A"]) {
      const botao = within(linhaDe(descricao)).getByRole("button");
      expect(botao.getAttribute("aria-expanded")).toBe(descricao === "Fixo B" ? "true" : "false");
      expect(botao.getAttribute("aria-controls")).toBe("painel-do-fixo");
    }
  });

  it("a linha aberta tem fundo diferente das outras", () => {
    montar({ abertoId: "rec-b" });

    expect(classesDe(linhaDe("Fixo B"))).toContain("bg-surface-strong");
    for (const descricao of ["Fixo D", "Fixo A", "Fixo C", "Entrada A"]) {
      expect(classesDe(linhaDe(descricao))).not.toContain("bg-surface-strong");
    }
  });

  it("o botão da linha tem o id que o painel usa para devolver o foco", () => {
    montar();

    expect(within(linhaDe("Fixo B")).getByRole("button").id).toBe("abrir-fixo-rec-b");
  });
});
