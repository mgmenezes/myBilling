import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChipsDeCategoria, type TotalDeCategoria } from "./chips-de-categoria";

/**
 * Testes derivados de LST-01 (ACs 1, 4, 5, 6 e 7) e do Done-when de T2.
 *
 * Os nomes ficam fora da ordem alfabética de propósito ("Um", "Dois",
 * "Três"): é assim que se prova que o chip segue a ordem recebida, que é a do
 * maior gasto, e não reordena por nome. Valores escolhidos pela formatação
 * que exercitam, não por realismo (AD-009).
 */

afterEach(cleanup);

const TRES: ReadonlyArray<TotalDeCategoria> = [
  { id: "cat-um", nome: "Categoria Um", gasto: 123456 },
  { id: "cat-dois", nome: "Categoria Dois", gasto: 30003 },
  { id: "cat-tres", nome: "Categoria Três", gasto: 50 },
];

const NOMES = ["Um", "Dois", "Três", "Quatro", "Cinco", "Seis", "Sete", "Oito", "Nove"];

/** `quantas` categorias, de R$ 90,00 descendo de R$ 10,00 em R$ 10,00. */
function categorias(quantas: number): ReadonlyArray<TotalDeCategoria> {
  return NOMES.slice(0, quantas).map((nome, posicao) => ({
    id: `cat-${posicao + 1}`,
    nome: `Categoria ${nome}`,
    gasto: (9 - posicao) * 1000,
  }));
}

function montar(
  lista: ReadonlyArray<TotalDeCategoria>,
  ativa: string | null = null,
  aoEscolher: (id: string | null) => void = vi.fn(),
) {
  return render(<ChipsDeCategoria categorias={lista} ativa={ativa} aoEscolher={aoEscolher} />);
}

/** A coleção de chips, pelo rótulo que ela leva no cartão de filtros. */
function colecao(): HTMLElement {
  return screen.getByRole("list", { name: "Categoria" });
}

/** Os chips de categoria: os botões da coleção que ligam e desligam. */
function chips(): HTMLElement[] {
  return within(colecao())
    .getAllByRole("button")
    .filter((botao) => botao.hasAttribute("aria-pressed"));
}

const textos = (botoes: HTMLElement[]) => botoes.map((botao) => botao.textContent);

describe("um chip por categoria com o gasto (LST-01, AC 1)", () => {
  it('mostra "Nome · R$ 1.234,56" em cada chip, na ordem recebida', () => {
    montar(TRES);

    expect(textos(chips())).toEqual([
      "Categoria Um · R$ 1.234,56",
      "Categoria Dois · R$ 300,03",
      "Categoria Três · R$ 0,50",
    ]);
  });

  it("cada chip é um botão, com o nome e o gasto no nome acessível", () => {
    montar(TRES);

    expect(screen.getByRole("button", { name: "Categoria Dois · R$ 300,03" })).toBeDefined();
  });
});

describe("só o chip ativo está pressionado (LST-01, AC 7)", () => {
  it('aria-pressed é "true" no ativo e "false" em todos os outros', () => {
    montar(TRES, "cat-dois");

    expect(chips().map((chip) => chip.getAttribute("aria-pressed"))).toEqual([
      "false",
      "true",
      "false",
    ]);
  });

  it("sem categoria ativa, nenhum chip está pressionado", () => {
    montar(TRES, null);

    expect(chips().map((chip) => chip.getAttribute("aria-pressed"))).toEqual([
      "false",
      "false",
      "false",
    ]);
  });

  /* O link da Visão geral abre a lista com qualquer categoria ativa, inclusive
     uma das pequenas (LST-04). Escondida atrás do "+N", ela seria um filtro
     ativo sem o chip que o mostra. */
  it("a ativa fora das 6 primeiras aparece pressionada desde o início", () => {
    montar(categorias(9), "cat-8");

    const ativa = screen.getByRole("button", { name: "Categoria Oito · R$ 20,00" });
    expect(ativa.getAttribute("aria-pressed")).toBe("true");
  });
});

describe("tocar num chip escolhe a categoria, e tocar no ativo a tira (LST-01, ACs 5 e 6)", () => {
  it("tocar num chip chama aoEscolher com o id dele", async () => {
    const aoEscolher = vi.fn();
    montar(TRES, null, aoEscolher);

    await userEvent.click(screen.getByRole("button", { name: "Categoria Dois · R$ 300,03" }));

    expect(aoEscolher).toHaveBeenCalledTimes(1);
    expect(aoEscolher).toHaveBeenCalledWith("cat-dois");
  });

  it("tocar noutro chip com uma categoria ativa troca para a nova", async () => {
    const aoEscolher = vi.fn();
    montar(TRES, "cat-um", aoEscolher);

    await userEvent.click(screen.getByRole("button", { name: "Categoria Três · R$ 0,50" }));

    expect(aoEscolher).toHaveBeenCalledWith("cat-tres");
  });

  it("tocar no chip ativo chama aoEscolher com null", async () => {
    const aoEscolher = vi.fn();
    montar(TRES, "cat-dois", aoEscolher);

    await userEvent.click(screen.getByRole("button", { name: "Categoria Dois · R$ 300,03" }));

    expect(aoEscolher).toHaveBeenCalledTimes(1);
    expect(aoEscolher).toHaveBeenCalledWith(null);
  });
});

describe('"+N categorias" revela, e não corta (LST-01, AC 4)', () => {
  it("com 9 categorias, mostra as 6 primeiras e um +3 recolhido", () => {
    montar(categorias(9));

    expect(textos(chips())).toEqual([
      "Categoria Um · R$ 90,00",
      "Categoria Dois · R$ 80,00",
      "Categoria Três · R$ 70,00",
      "Categoria Quatro · R$ 60,00",
      "Categoria Cinco · R$ 50,00",
      "Categoria Seis · R$ 40,00",
    ]);
    const mais = within(colecao()).getByRole("button", { name: "+3 categorias" });
    expect(mais.getAttribute("aria-expanded")).toBe("false");
  });

  it("acionado, as 9 ficam visíveis na mesma coleção e ele diz que está expandido", async () => {
    montar(categorias(9));
    const mais = within(colecao()).getByRole("button", { name: "+3 categorias" });

    await userEvent.click(mais);

    expect(chips()).toHaveLength(9);
    expect(textos(chips()).slice(6)).toEqual([
      "Categoria Sete · R$ 30,00",
      "Categoria Oito · R$ 20,00",
      "Categoria Nove · R$ 10,00",
    ]);
    expect(mais.getAttribute("aria-expanded")).toBe("true");
    expect(colecao().contains(mais)).toBe(true);
  });

  it("acionado de novo, volta às 6", async () => {
    montar(categorias(9));
    const mais = within(colecao()).getByRole("button", { name: "+3 categorias" });

    await userEvent.click(mais);
    await userEvent.click(mais);

    expect(chips()).toHaveLength(6);
    expect(mais.getAttribute("aria-expanded")).toBe("false");
  });

  it("com 7 categorias, o que sobra é uma, no singular", () => {
    montar(categorias(7));

    expect(within(colecao()).getByRole("button", { name: "+1 categoria" })).toBeDefined();
  });

  it("com 6 categorias, todas aparecem e não há +N", () => {
    montar(categorias(6));

    expect(chips()).toHaveLength(6);
    expect(within(colecao()).queryByRole("button", { name: /^\+\d/ })).toBeNull();
  });

  it("a coleção quebra linha e nenhum elemento corta o conteúdo do chip", async () => {
    const { container } = montar(categorias(9));
    await userEvent.click(within(colecao()).getByRole("button", { name: "+3 categorias" }));

    expect(colecao().className.split(/\s+/)).toContain("flex-wrap");
    expect(
      container.querySelectorAll(
        "[class*='overflow-hidden'], [class*='overflow-clip'], [class*='truncate'], [class*='line-clamp']",
      ),
    ).toHaveLength(0);
  });
});

describe("sem despesa no mês, nenhum chip (Edge Case)", () => {
  it("sem categorias, não renderiza nada", () => {
    const { container } = montar([]);

    expect(container.innerHTML).toBe("");
  });
});
