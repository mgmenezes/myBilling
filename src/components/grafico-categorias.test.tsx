import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SEM_CATEGORIA } from "@/application/mes/filtrar-lancamentos";
import type { Competencia } from "@/domain";
import { type FatiaDeCategoria, GraficoCategorias } from "./grafico-categorias";

/**
 * Testes derivados de LST-04 (ACs 1 a 3) e do Done-when de T7. Cada barra de
 * "Gastos por categoria" leva à lista de Lançamentos do mesmo mês, filtrada
 * por aquela categoria. Os valores são escolhidos pela conta, 3 para 1, para
 * que a porcentagem seja exata (AD-009).
 */

afterEach(cleanup);

const MARCO = "2026-03" as Competencia;
const TITULO = "Gastos por categoria, ordenados do maior para o menor";

const FATIAS: ReadonlyArray<FatiaDeCategoria> = [
  /* Fora de ordem de propósito: o gráfico ordena, e o link segue a fatia. */
  { id: SEM_CATEGORIA, nome: "Sem categoria", valor: 10000, percentual: 2500, cor: null },
  { id: "cat-1", nome: "Categoria Um", valor: 30000, percentual: 7500, cor: "verde" },
];

function montar(fatias: ReadonlyArray<FatiaDeCategoria> = FATIAS) {
  render(<GraficoCategorias titulo={TITULO} competencia={MARCO} fatias={fatias} />);
  return screen.getByRole("list", { name: TITULO });
}

describe("cada barra leva à lista filtrada (LST-04)", () => {
  it("a barra de uma categoria é um link para os lançamentos do mês com o categoriaId dela (AC 1)", () => {
    const grafico = montar();

    const item = within(grafico)
      .getAllByRole("listitem")
      .find((li) => li.textContent?.includes("Categoria Um"));
    if (item === undefined) {
      throw new Error("a barra de Categoria Um não está no gráfico");
    }
    expect(within(item).getByRole("link").getAttribute("href")).toBe(
      "/2026-03/lancamentos?categoriaId=cat-1",
    );
  });

  it("Sem categoria leva a categoriaId=sem-categoria (AC 2)", () => {
    const grafico = montar();

    expect(
      within(grafico)
        .getByRole("link", { name: /^Sem categoria/ })
        .getAttribute("href"),
    ).toBe("/2026-03/lancamentos?categoriaId=sem-categoria");
  });

  it("o nome acessível do link tem o nome, o valor e a porcentagem (AC 3)", () => {
    const grafico = montar();

    expect(
      within(grafico).getByRole("link", { name: "Categoria Um R$ 300,00 75,00%" }),
    ).toBeDefined();
    expect(
      within(grafico).getByRole("link", { name: "Sem categoria R$ 100,00 25,00%" }),
    ).toBeDefined();
  });

  it("uma barra, um link, na ordem do maior para o menor (AC 1)", () => {
    const grafico = montar();

    expect(
      within(grafico)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    ).toEqual([
      "/2026-03/lancamentos?categoriaId=cat-1",
      "/2026-03/lancamentos?categoriaId=sem-categoria",
    ]);
  });
});

/**
 * Testes derivados de COR-03 (ACs 5 a 7), COR-02 (AC 5) e do Done-when de T5.
 * Cada barra tem a cor da própria categoria; o trilho continua neutro, e o
 * grupo sem categoria e a categoria removida continuam na barra neutra. A
 * barra é procurada dentro do link da linha dela (L-018).
 */
describe("a barra na cor da categoria (COR-03, AC 5)", () => {
  /** O link da linha cujo nome acessível começa pelo nome da fatia. */
  function linhaDe(grafico: HTMLElement, nome: string): HTMLElement {
    return within(grafico).getByRole("link", { name: new RegExp(`^${nome} `) });
  }

  /** A barra é o elemento com a largura proporcional; o trilho é quem a contém. */
  function barraDe(linha: HTMLElement): HTMLElement {
    const barra = linha.querySelector<HTMLElement>("[style*='width']");
    if (barra === null) {
      throw new Error("a linha não tem barra");
    }
    return barra;
  }

  const classes = (elemento: HTMLElement | null) => elemento?.className.split(/\s+/) ?? [];

  const TRES: ReadonlyArray<FatiaDeCategoria> = [
    { id: "cat-1", nome: "Categoria Um", valor: 30000, percentual: 6000, cor: "verde" },
    { id: "cat-2", nome: "Categoria Dois", valor: 15000, percentual: 3000, cor: "roxo" },
    { id: SEM_CATEGORIA, nome: "Sem categoria", valor: 5000, percentual: 1000, cor: null },
  ];

  it("cada barra tem a classe de barra da própria cor, no lugar da neutra", () => {
    const grafico = montar(TRES);

    const um = classes(barraDe(linhaDe(grafico, "Categoria Um")));
    expect(um).toContain("bg-cat-verde-barra");
    expect(um).not.toContain("bg-grafico-barra");
    expect(classes(barraDe(linhaDe(grafico, "Categoria Dois")))).toContain("bg-cat-roxo-barra");
  });

  it("o trilho continua neutro em toda linha", () => {
    const grafico = montar(TRES);

    for (const nome of ["Categoria Um", "Categoria Dois", "Sem categoria"]) {
      const trilho = classes(barraDe(linhaDe(grafico, nome)).parentElement);
      expect(trilho).toContain("bg-grafico-trilho");
      expect(trilho.some((classe) => classe.startsWith("bg-cat-"))).toBe(false);
    }
  });

  it.each([["Sem categoria"], ["Categoria removida"]])(
    "%s fica na barra neutra de hoje (COR-02, AC 5)",
    (nome) => {
      const grafico = montar([
        { id: "cat-1", nome: "Categoria Um", valor: 30000, percentual: 7500, cor: "verde" },
        { id: "cat-x", nome, valor: 10000, percentual: 2500, cor: null },
      ]);

      const barra = classes(barraDe(linhaDe(grafico, nome)));
      expect(barra).toContain("bg-grafico-barra");
      expect(barra.some((classe) => classe.startsWith("bg-cat-"))).toBe(false);
    },
  );

  it("o nome acessível do link não ganha o nome da cor (COR-03, AC 6)", () => {
    const grafico = montar(TRES);

    expect(
      within(grafico)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual([
      "Categoria Um R$ 300,00 60,00%",
      "Categoria Dois R$ 150,00 30,00%",
      "Sem categoria R$ 50,00 10,00%",
    ]);
  });
});

describe("o estouro continua por ícone e texto (COR-03, AC 7)", () => {
  function linha(grafico: HTMLElement): HTMLElement {
    return within(grafico).getByRole("link", { name: /^Categoria Um/ });
  }

  it("acima do limite: ícone e texto na linha, e a barra fica na cor da categoria", () => {
    const grafico = montar([
      {
        id: "cat-1",
        nome: "Categoria Um",
        valor: 30000,
        percentual: 10000,
        limite: 20000,
        cor: "laranja",
      },
    ]);

    const link = linha(grafico);
    expect(within(link).getByText("acima do limite")).toBeDefined();
    expect(link.querySelector("svg[aria-hidden='true']")).not.toBeNull();
    const barra = link.querySelector<HTMLElement>("[style*='width']")?.className.split(/\s+/);
    expect(barra).toContain("bg-cat-laranja-barra");
    expect(barra?.some((classe) => classe.includes("negativo"))).toBe(false);
  });

  it("a barra estourada tem exatamente as classes da mesma barra dentro do limite", () => {
    const fatia: FatiaDeCategoria = {
      id: "cat-1",
      nome: "Categoria Um",
      valor: 30000,
      percentual: 10000,
      cor: "laranja",
    };

    const dentro = linha(montar([{ ...fatia, limite: 40000 }]));
    const classesDentro = dentro.querySelector("[style*='width']")?.className;
    expect(within(dentro).queryByText("acima do limite")).toBeNull();
    cleanup();

    const estourada = linha(montar([{ ...fatia, limite: 20000 }]));
    expect(estourada.querySelector("[style*='width']")?.className).toBe(classesDentro);
  });
});
