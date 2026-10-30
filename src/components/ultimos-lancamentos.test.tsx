import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { LancamentoDoMes } from "@/application/mes/obter-visao-mensal/handler";
import type { Cents, Competencia, Lancamento } from "@/domain";
import { CLASSES_DA_COR } from "./cor-de-categoria";
import { type CategoriaDaLinha, UltimosLancamentos } from "./ultimos-lancamentos";

/**
 * Testes derivados de TRES-05 (ACs 3 a 5). A escolha e a ordem dos itens são
 * de `ultimosLancamentos`, testada à parte; aqui entram já escolhidos.
 * Nomes genéricos e valores redondos (AD-009).
 */

const VERDE = "11111111-1111-4111-8111-111111111111";
const ARQUIVADA = "22222222-2222-4222-8222-222222222222";
const CATEGORIAS: ReadonlyMap<string, CategoriaDaLinha> = new Map([
  [VERDE, { nome: "Categoria A", cor: "verde" }],
  [ARQUIVADA, { nome: "Categoria B", cor: null }],
]);

function item(campos: Partial<Lancamento> & { id: string }): LancamentoDoMes {
  return {
    lancamento: {
      natureza: "DESPESA",
      origem: "AVULSO",
      descricao: `Item ${campos.id}`,
      competencia: "2026-03" as Competencia,
      dataEvento: "2026-03-10",
      valor: 1000 as Cents,
      valorPrevisto: null,
      pagoEm: null,
      categoriaId: VERDE,
      usuarioId: "33333333-3333-4333-8333-333333333333",
      meioPagamentoId: "44444444-4444-4444-8444-444444444444",
      compraId: null,
      numeroParcela: null,
      recorrenciaId: null,
      canceladoEm: null,
      ...campos,
    },
    parcela: null,
    bloco: "AVULSOS",
  };
}

afterEach(cleanup);

function montar(itens: ReadonlyArray<LancamentoDoMes>): HTMLElement {
  render(<UltimosLancamentos competencia="2026-03" itens={itens} categorias={CATEGORIAS} />);
  return screen.getByRole("region", { name: "Últimos lançamentos" });
}

function linha(secao: HTMLElement, descricao: string): HTMLElement {
  const encontrada = within(secao)
    .getAllByRole("listitem")
    .find((li) => li.textContent?.startsWith(descricao) ?? false);
  if (encontrada === undefined) {
    throw new Error(`a linha de ${descricao} não está na lista`);
  }
  return encontrada;
}

describe("cada linha diz o que é, quando, em que categoria e quanto (TRES-05, AC 3)", () => {
  it("descrição, data, a pill da categoria com a cor dela e o valor com sinal e cor da despesa", () => {
    const secao = montar([item({ id: "A", dataEvento: "2026-03-10", valor: 12000 as Cents })]);

    const li = linha(secao, "Item A");
    expect(within(li).getByText("Item A")).toBeDefined();
    expect(within(li).getByText("10/03/2026")).toBeDefined();
    expect(within(li).getByText("Categoria A").className).toContain(CLASSES_DA_COR.verde.pill);
    const valor = within(li).getByText(/R\$ 120,00/);
    expect(valor.textContent).toBe("−R$ 120,00 de despesa");
    expect(valor.className).toContain("text-negativo");
  });

  it('a entrada mostra "Receita" na neutra e o valor com "+" em verde', () => {
    const secao = montar([item({ id: "E", natureza: "RECEITA", categoriaId: null })]);

    const li = linha(secao, "Item E");
    const pill = within(li).getByText("Receita");
    expect(pill.className).toContain("bg-surface-strong");
    expect(pill.className).not.toContain("bg-cat-");
    const valor = within(li).getByText(/R\$ 10,00/);
    expect(valor.textContent).toBe("+R$ 10,00 de entrada");
    expect(valor.className).toContain("text-positivo");
  });

  it('o gasto sem categoria mostra "Sem categoria" na neutra', () => {
    const secao = montar([item({ id: "S", categoriaId: null })]);

    const pill = within(linha(secao, "Item S")).getByText("Sem categoria");
    expect(pill.className).toContain("bg-surface-strong");
    expect(pill.className).not.toContain("bg-cat-");
  });

  /* Como no seletor e nos chips: a arquivada vai na neutra, com o nome dela (COR-02, AC 5). */
  it("a categoria arquivada mostra o nome na neutra", () => {
    const secao = montar([item({ id: "R", categoriaId: ARQUIVADA })]);

    const pill = within(linha(secao, "Item R")).getByText("Categoria B");
    expect(pill.className).not.toContain("bg-cat-");
  });

  /* O mesmo nome da barra de "Gastos por categoria" na Visão geral (COR-02, AC 5). */
  it('a categoria que não existe mais mostra "Categoria removida" na neutra', () => {
    const secao = montar([item({ id: "X", categoriaId: "55555555-5555-4555-8555-555555555555" })]);

    const pill = within(linha(secao, "Item X")).getByText("Categoria removida");
    expect(pill.className).not.toContain("bg-cat-");
  });

  it("mostra os itens na ordem recebida", () => {
    const secao = montar([item({ id: "B" }), item({ id: "A" })]);

    expect(
      within(secao)
        .getAllByRole("listitem")
        .map((li) => li.textContent?.slice(0, 6)),
    ).toEqual(["Item B", "Item A"]);
  });
});

describe("lista vazia (TRES-05, AC 4)", () => {
  it('mostra "Nenhum lançamento até hoje neste mês."', () => {
    const secao = montar([]);

    expect(within(secao).getByText("Nenhum lançamento até hoje neste mês.")).toBeDefined();
    expect(within(secao).queryByRole("list")).toBeNull();
  });
});

describe('"Ver todos" junto do título (TRES-05, AC 5)', () => {
  it("leva para Lançamentos da competência", () => {
    const secao = montar([item({ id: "A" })]);

    expect(within(secao).getByRole("link", { name: "Ver todos" }).getAttribute("href")).toBe(
      "/2026-03/lancamentos",
    );
  });
});
