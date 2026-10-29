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
  { id: SEM_CATEGORIA, nome: "Sem categoria", valor: 10000, percentual: 2500 },
  { id: "cat-1", nome: "Categoria Um", valor: 30000, percentual: 7500 },
];

function montar() {
  render(<GraficoCategorias titulo={TITULO} competencia={MARCO} fatias={FATIAS} />);
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
